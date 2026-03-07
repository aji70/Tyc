"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Property } from "@/types/game";
import {
  isBoard3DStateMessage,
  type Board3DCanvasState,
  type Board3DMessageFromCanvas,
} from "@/lib/board3d-iframe-messages";
import { buildBoardScene } from "@/lib/board3d-vanilla-scene";
import { getPosition3D } from "@/components/game/board3d/positions";
import { getSquareName } from "@/components/game/board3d/squareNames";

const BOARD_3D_MESSAGE_SOURCE = "tycoon-board3d-canvas";
const CAMERA_POSITION: [number, number, number] = [0, 12, 12];
const CAMERA_LOOK_AT: [number, number, number] = [0, 0, 0];

function postToParent(msg: Board3DMessageFromCanvas) {
  if (typeof window === "undefined" || !window.parent) return;
  window.parent.postMessage({ ...msg, source: BOARD_3D_MESSAGE_SOURCE }, window.location.origin);
}

export default function Board3DCanvasPage() {
  const [state, setState] = useState<Board3DCanvasState | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ propertyId: number; name: string } | null>(null);
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !state?.properties?.length) return;

    const properties = state.properties as Property[];
    if (properties.length < 40) return;

    labelMeshesRef.current = [];
    tileMeshesRef.current = [];
    const scene = buildBoardScene({
      properties,
      developmentByPropertyId: state.developmentByPropertyId ?? {},
      labelMeshesRef,
      tileMeshesRef,
    });
    sceneRef.current = scene;

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

    const properties = state.properties as Property[];
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
          setHoveredTile({ propertyId, name });
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

    const focusTile = state.focusTilePosition ?? null;
    if (focusTile != null && typeof focusTile === "number") {
      const [x, , z] = getPosition3D(focusTile);
      controls.target.set(x, 0, z);
      if (state.isLiveGame) {
        const focusTimeout = window.setTimeout(() => onFocusComplete(), 800);
        cleanupFns.push(() => window.clearTimeout(focusTimeout));
      }
    }

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
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
  }, [state, onSquareClick, onFocusComplete]);

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
  const isLiveGame = state.isLiveGame ?? false;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#010F10] flex flex-col">
      <div ref={containerRef} className="flex-1 min-h-0 w-full relative" />
      {hoveredTile && (
        <div
          className="pointer-events-none fixed z-50 px-3 py-1.5 rounded-lg bg-black/80 text-white text-sm font-medium shadow-lg border border-cyan-500/30 max-w-[200px] truncate"
          style={{
            left: "50%",
            bottom: "4rem",
            transform: "translateX(-50%)",
          }}
        >
          {hoveredTile.name}
        </div>
      )}
      {showRollUi && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={onRollClick}
            className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm uppercase tracking-wide shadow-lg"
          >
            Roll
          </button>
        </div>
      )}
      {isLiveGame && rollingDice && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <span className="text-cyan-200 text-sm">Rolling…</span>
          <button
            type="button"
            onClick={onDiceComplete}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
