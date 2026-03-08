"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Property, Game } from "@/types/game";
import {
  isBoard3DStateMessage,
  type Board3DCanvasState,
  type Board3DMessageFromCanvas,
} from "@/lib/board3d-iframe-messages";
import { buildBoardScene } from "@/lib/board3d-vanilla-scene";
import { getSquareName } from "@/components/game/board3d/squareNames";
import ActionLog from "@/components/game/ai-board/action-log";

const BOARD_3D_MESSAGE_SOURCE = "tycoon-board3d-canvas";
const CAMERA_POSITION: [number, number, number] = [0, 12, 12];
const CAMERA_LOOK_AT: [number, number, number] = [0, 0, 0];

/** Cached center board texture so we load once and avoid flicker from re-loading on every state change. */
let cachedBoardTexture: THREE.Texture | null = null;

const DICE_ROLL_MS = 1400;
const DICE_SHOW_RESULT_MS = 1500; // show settled dice (die1 + die2 = total) before player moves
const DICE_SIZE = 0.6;
const DICE_SPOT_RADIUS = 0.06;
const DICE_SPOT_INSET = 0.38; // spot positions as fraction of half-size (0..1)
/** Rotations so face 1..6 shows on top (x, y, z in radians). */
const DICE_TOP_ROTATIONS: [number, number, number][] = [
  [0, 0, 0],
  [Math.PI / 2, 0, 0],
  [0, 0, -Math.PI / 2],
  [0, 0, Math.PI / 2],
  [-Math.PI / 2, 0, 0],
  [Math.PI, 0, 0],
];

/** Classic dice spot layouts (u, v in -1..1 per face). */
const DICE_SPOT_LAYOUTS: [number, number][][] = [
  [], // 0 unused
  [[0, 0]], // 1
  [[-0.6, -0.6], [0.6, 0.6]], // 2
  [[-0.6, -0.6], [0, 0], [0.6, 0.6]], // 3
  [[-0.6, -0.6], [-0.6, 0.6], [0.6, -0.6], [0.6, 0.6]], // 4
  [[-0.6, -0.6], [-0.6, 0.6], [0, 0], [0.6, -0.6], [0.6, 0.6]], // 5
  [[-0.6, -0.6], [-0.6, 0], [-0.6, 0.6], [0.6, -0.6], [0.6, 0], [0.6, 0.6]], // 6
];

/** Standard die: +x=3, -x=4, +y=1, -y=6, +z=2, -z=5 (BoxGeometry face order). */
const DICE_FACE_VALUES = [3, 4, 1, 6, 2, 5];

/** Face center and tangent axes (u, v) for each face index. */
function getDiceFaceAxes(faceIndex: number, half: number): { center: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 } {
  const h = half;
  switch (faceIndex) {
    case 0: return { center: new THREE.Vector3(h, 0, 0), u: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(0, 0, 1) };
    case 1: return { center: new THREE.Vector3(-h, 0, 0), u: new THREE.Vector3(0, -1, 0), v: new THREE.Vector3(0, 0, 1) };
    case 2: return { center: new THREE.Vector3(0, h, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) };
    case 3: return { center: new THREE.Vector3(0, -h, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1) };
    case 4: return { center: new THREE.Vector3(0, 0, h), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) };
    default: return { center: new THREE.Vector3(0, 0, -h), u: new THREE.Vector3(-1, 0, 0), v: new THREE.Vector3(0, 1, 0) };
  }
}

function createDiceWithSpots(): THREE.Group {
  const half = DICE_SIZE / 2;
  const group = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0xf8f8f8,
    roughness: 0.3,
    metalness: 0.08,
  });
  group.add(new THREE.Mesh(boxGeo, boxMat));

  const spotGeo = new THREE.SphereGeometry(DICE_SPOT_RADIUS, 12, 10);
  const spotMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.6,
    metalness: 0,
  });

  const push = 0.01; // nudge spots out so they sit on the face
  for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
    const value = DICE_FACE_VALUES[faceIndex];
    const layout = DICE_SPOT_LAYOUTS[value];
    const { center, u, v } = getDiceFaceAxes(faceIndex, half);
    const scale = half * DICE_SPOT_INSET;
    for (const [uu, vv] of layout) {
      const spot = new THREE.Mesh(spotGeo.clone(), spotMat.clone());
      spot.position.copy(center).add(u.clone().multiplyScalar(uu * scale)).add(v.clone().multiplyScalar(vv * scale));
      spot.position.add(spot.position.clone().normalize().multiplyScalar(push));
      group.add(spot);
    }
  }
  return group;
}

function postToParent(msg: Board3DMessageFromCanvas) {
  if (typeof window === "undefined" || !window.parent) return;
  window.parent.postMessage({ ...msg, source: BOARD_3D_MESSAGE_SOURCE }, window.location.origin);
}

export default function Board3DCanvasPage() {
  const [state, setState] = useState<Board3DCanvasState | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ propertyId: number; name: string; screenX: number; screenY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const labelMeshesRef = useRef<THREE.Mesh[]>([]);
  const tileMeshesRef = useRef<THREE.Mesh[]>([]);
  const frameRef = useRef<number>(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const diceGroupRef = useRef<THREE.Group | null>(null);
  const diceStartTimeRef = useRef<number>(0);
  const diceCompleteRef = useRef<boolean>(false);
  const diceSettledTimeRef = useRef<number>(0);
  const diceCompleteCalledRef = useRef<boolean>(false);

  useEffect(() => {
    postToParent({ type: "BOARD_3D_READY" });
    const readyInterval = window.setInterval(() => postToParent({ type: "BOARD_3D_READY" }), 200);
    const stop = window.setTimeout(() => window.clearInterval(readyInterval), 2000);
    return () => {
      window.clearInterval(readyInterval);
      window.clearTimeout(stop);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (isBoard3DStateMessage(e.data)) setState(e.data.payload);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const onSquareClick = useCallback((propertyId: number) => {
    postToParent({ type: "SQUARE_CLICK", propertyId });
  }, []);

  const onRollClick = useCallback(() => {
    postToParent({ type: "ROLL_CLICK" });
  }, []);

  const onDiceComplete = useCallback(() => {
    postToParent({ type: "DICE_COMPLETE" });
  }, []);

  const onFocusComplete = useCallback(() => {
    postToParent({ type: "FOCUS_COMPLETE" });
  }, []);

  // When parent sets focusTilePosition (landed on a buyable property), notify after a short delay so buy prompt can show.
  const focusCompleteSentRef = useRef<number | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    const pos = state?.focusTilePosition;
    if (pos == null || typeof pos !== "number") {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      focusCompleteSentRef.current = null;
      return;
    }
    if (focusCompleteSentRef.current === pos) return; // already sent or timer pending for this pos
    focusCompleteSentRef.current = pos;
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = window.setTimeout(() => {
      focusTimeoutRef.current = null;
      onFocusComplete();
    }, 600);
    // No cleanup: allow timeout to fire even if effect re-runs with same pos (e.g. state object reference change).
  }, [state?.focusTilePosition, onFocusComplete]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !state?.properties?.length) return;

    const properties = state.properties as Property[];
    if (properties.length < 40) return;

    diceGroupRef.current = null;
    diceCompleteRef.current = false;
    diceCompleteCalledRef.current = false;
    labelMeshesRef.current = [];
    tileMeshesRef.current = [];
    const scene = buildBoardScene({
      properties,
      developmentByPropertyId: state.developmentByPropertyId ?? {},
      ownerByPropertyId: state.ownerByPropertyId ?? {},
      labelMeshesRef,
      tileMeshesRef,
      players: (state.players ?? []) as { user_id: number; position?: number; symbol?: string }[],
      animatedPositions: state.animatedPositions ?? {},
      currentPlayerId: state.currentPlayerId ?? null,
    });
    sceneRef.current = scene;

    // Center board decal (same as R3F BoardCenter with /bb.jpg) — load once, no depth write to avoid flicker
    function addCenterPlane(scene: THREE.Scene, texture: THREE.Texture) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 7),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
          depthTest: true,
        })
      );
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(0, 0.025, 0); // slightly above board to avoid z-fight
      scene.add(plane);
    }
    if (cachedBoardTexture) {
      addCenterPlane(scene, cachedBoardTexture);
    } else {
      const texLoader = new THREE.TextureLoader();
      texLoader.load("/bb.jpg", (texture) => {
        cachedBoardTexture = texture;
        if (sceneRef.current) addCenterPlane(sceneRef.current, texture);
      });
    }

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(new THREE.Vector3(...CAMERA_LOOK_AT));
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(...CAMERA_LOOK_AT);
    controls.enablePan = true;
    controls.enableZoom = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // don't go below the board
    controlsRef.current = controls;

    function onResize() {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    onResize();
    window.addEventListener("resize", onResize);

    function onPointerMove(e: PointerEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (cameraRef.current && tileMeshesRef.current.length > 0) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const hits = raycasterRef.current.intersectObjects(tileMeshesRef.current);
        const hit = hits[0];
        if (hit?.object?.userData?.propertyId != null) {
          const propertyId = hit.object.userData.propertyId as number;
          const prop = properties[propertyId];
          const name = (prop as Property)?.name ?? getSquareName(propertyId);
          setHoveredTile({ propertyId, name, screenX: e.clientX, screenY: e.clientY });
        } else {
          setHoveredTile(null);
        }
      } else {
        setHoveredTile(null);
      }
    }
    function onPointerDown() {
      if (!camera || tileMeshesRef.current.length === 0) return;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(tileMeshesRef.current);
      const hit = hits[0];
      if (hit?.object?.userData?.propertyId != null) {
        const propertyId = hit.object.userData.propertyId as number;
        onSquareClick(propertyId);
      }
    }
    function onPointerLeave() {
      setHoveredTile(null);
    }
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("pointerdown", onPointerDown);

    const cleanupFns: (() => void)[] = [
      () => window.removeEventListener("resize", onResize),
      () => {
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
        container.removeEventListener("pointerdown", onPointerDown);
      },
      () => cancelAnimationFrame(frameRef.current),
      () => controls.dispose(),
      () => {
        if (container && renderer.domElement.parentNode === container)
          container.removeChild(renderer.domElement);
      },
      () => renderer.dispose(),
    ];

    // No zoom or camera reaction when player moves — keep target at board center
    const rolling = state.rollingDice;
    if (rolling && typeof rolling.die1 === "number" && typeof rolling.die2 === "number") {
      const diceGroup = new THREE.Group();
      diceGroup.position.set(0, 1, 0);
      const die1Group = new THREE.Group();
      die1Group.position.set(-DICE_SIZE * 1.2, 0, 0);
      die1Group.add(createDiceWithSpots());
      const die2Group = new THREE.Group();
      die2Group.position.set(DICE_SIZE * 1.2, 0, 0);
      die2Group.add(createDiceWithSpots());
      diceGroup.add(die1Group);
      diceGroup.add(die2Group);
      scene.add(diceGroup);
      diceGroupRef.current = diceGroup;
      diceStartTimeRef.current = Date.now();
    }

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      const diceGroup = diceGroupRef.current;
      if (diceGroup && diceGroup.parent && diceGroup.children.length >= 2) {
        const elapsed = Date.now() - diceStartTimeRef.current;
        const die1 = diceGroup.children[0];
        const die2 = diceGroup.children[1];
        const r1 = DICE_TOP_ROTATIONS[Math.max(0, Math.min(5, (state?.rollingDice?.die1 ?? 1) - 1))];
        const r2 = DICE_TOP_ROTATIONS[Math.max(0, Math.min(5, (state?.rollingDice?.die2 ?? 1) - 1))];
        if (!diceCompleteRef.current) {
          const spin = (elapsed / DICE_ROLL_MS) * Math.PI * 10;
          if (elapsed >= DICE_ROLL_MS) {
            diceCompleteRef.current = true;
            diceSettledTimeRef.current = Date.now();
            die1.rotation.set(r1[0], r1[1], r1[2]);
            die2.rotation.set(r2[0], r2[1], r2[2]);
          } else {
            die1.rotation.set(r1[0] + spin * 0.7, r1[1] + spin * 1.2, r1[2] + spin * 0.6);
            die2.rotation.set(r2[0] + spin * 0.9, r2[1] + spin * 0.5, r2[2] + spin * 1.1);
          }
        } else if (!diceCompleteCalledRef.current && Date.now() - diceSettledTimeRef.current >= DICE_SHOW_RESULT_MS) {
          diceCompleteCalledRef.current = true;
          onDiceComplete();
        }
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cleanupFns.forEach((fn) => fn());
      sceneRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
      labelMeshesRef.current = [];
      tileMeshesRef.current = [];
    };
  }, [state, onSquareClick, onFocusComplete, onDiceComplete]);

  if (!state) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#010F10]">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin" />
          <p className="text-sm">Waiting for game…</p>
        </div>
      </div>
    );
  }

  const properties = (state.properties ?? []) as Property[];
  if (properties.length < 40) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#010F10]">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin" />
      </div>
    );
  }

  const showRollUi = state.showRollUi ?? false;
  const rollingDice = state.rollingDice;
  const lastRollResult = state.lastRollResult;
  const rollLabel = state.rollLabel;
  const aiThinking = state.aiThinking ?? false;
  const thinkingLabel = state.thinkingLabel ?? "AI is thinking...";
  const history = state.history as Game["history"] | undefined;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#010F10] flex flex-col">
      <div ref={containerRef} className="flex-1 min-h-0 w-full relative" />
      {hoveredTile && (
        <div
          className="pointer-events-none fixed z-50 px-3 py-1.5 rounded-lg bg-black/80 text-white text-sm font-medium shadow-lg border border-cyan-500/30 max-w-[200px] truncate whitespace-nowrap"
          style={{
            left: hoveredTile.screenX,
            top: hoveredTile.screenY - 12,
            transform: "translate(-50%, -100%)",
          }}
        >
          {hoveredTile.name}
        </div>
      )}
      {/* Center: compact roll/dice/thinking only */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
        <div className="pointer-events-auto flex flex-col items-center gap-3 py-3 px-4 rounded-xl border-2 border-cyan-500/40 bg-slate-900/90 shadow-xl">
          {aiThinking && (
            <div
              className="text-lg font-semibold text-amber-400 whitespace-nowrap"
              style={{ textShadow: "0 0 8px #000, 0 1px 4px #000" }}
            >
              {thinkingLabel}
            </div>
          )}
          {lastRollResult && !rollingDice && (
            <div className="flex flex-col items-center gap-1">
              {rollLabel && (
                <span className="text-base font-semibold text-white/90 whitespace-nowrap" style={{ textShadow: "0 0 6px #000" }}>
                  {rollLabel}
                </span>
              )}
              <div className="flex flex-row items-center justify-center gap-2 text-3xl font-extrabold text-white" style={{ textShadow: "0 0 10px #000" }}>
                <span className="text-cyan-400">{lastRollResult.die1}</span>
                <span>+</span>
                <span className="text-pink-400">{lastRollResult.die2}</span>
                <span>=</span>
                <span className="text-amber-400">{lastRollResult.total}</span>
              </div>
            </div>
          )}
          {showRollUi && !rollingDice && (
            <button
              type="button"
              aria-label="Roll dice"
              onClick={onRollClick}
              className="px-5 py-2.5 text-sm font-bold text-slate-900 uppercase tracking-wider rounded-lg border-2 border-cyan-700 shadow-[0_4px_0_#0e7490,0_6px_16px_rgba(0,0,0,0.35)] cursor-pointer hover:opacity-95 active:translate-y-0.5 active:shadow-[0_2px_0_#0e7490] transition-all bg-gradient-to-b from-cyan-300 via-cyan-400 to-cyan-500"
            >
              Roll
            </button>
          )}
        </div>
      </div>

      {/* Action log: fixed at bottom, own card */}
      {history && history.length > 0 && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[320px] max-w-[calc(100vw-2rem)]">
          <ActionLog
            history={history}
            className="!mt-0 !h-40 !max-h-40 !min-h-0 !rounded-lg !border-2 !border-cyan-500/40 !bg-slate-900/95 !shadow-lg overflow-y-auto"
          />
        </div>
      )}
    </div>
  );
}
