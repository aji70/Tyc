"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getPosition3D } from "@/components/game/board3d/positions";
import { BOARD_SQUARE_NAMES } from "@/components/game/board3d/squareNames";

/**
 * Skeletal 3D Monopoly-style board using vanilla Three.js only (no R3F).
 * Spinnable via OrbitControls; property names on each tile.
 */

const TILE_SIZE = 0.9;
const TILE_HEIGHT = 0.05;
const LABEL_HEIGHT = 0.15;
const LABEL_Y_OFFSET = TILE_HEIGHT + 0.02;
const CAMERA_POSITION: [number, number, number] = [0, 12, 12];
const CAMERA_LOOK_AT: [number, number, number] = [0, 0, 0];

/** Street properties (buildable); excludes corners, Chance, Community Chest, tax, railroads, utilities. */
const BUILDABLE_POSITIONS = new Set([
  1, 3, 6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23, 24, 26, 27, 28, 31, 32, 34, 37, 39,
]);

/** Demo development level per position: 0 = none, 1–4 = houses, 5 = hotel. */
const DEMO_DEVELOPMENT: Record<number, number> = {
  1: 2, 3: 1, 6: 1, 8: 3, 11: 1, 16: 4, 18: 2, 21: 1, 24: 3, 27: 1, 31: 2, 34: 1, 37: 5, 39: 2,
};

const HOUSE_SIZE = 0.14;
const HOUSE_HEIGHT = 0.12;
const HOTEL_SIZE = 0.22;
const HOTEL_HEIGHT = 0.2;

function makeLabelTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const w = 256;
  const h = 64;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a1214";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#00F0FF";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = "#00F0FF";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.length > 18 ? name.slice(0, 16) + "…" : name, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function buildBoardScene(labelMeshesRef: { current: THREE.Mesh[] }): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010f10);

  const ambient = new THREE.AmbientLight(0x404060, 0.8);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(8, 12, 8);
  dir.castShadow = true;
  scene.add(dir);

  const tileGeom = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
  const cornerColor = new THREE.Color(0x2ecc71);
  const tileColor = new THREE.Color(0x1a3a3e);
  const cornerMaterial = new THREE.MeshStandardMaterial({ color: cornerColor });
  const tileMaterial = new THREE.MeshStandardMaterial({ color: tileColor });

  const labelGeom = new THREE.PlaneGeometry(TILE_SIZE * 0.95, LABEL_HEIGHT);

  const houseGeom = new THREE.BoxGeometry(HOUSE_SIZE, HOUSE_HEIGHT, HOUSE_SIZE);
  const hotelGeom = new THREE.BoxGeometry(HOTEL_SIZE, HOTEL_HEIGHT, HOTEL_SIZE);
  const houseMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
  const hotelMaterial = new THREE.MeshStandardMaterial({ color: 0x8b0000 });

  for (let i = 0; i < 40; i++) {
    const [x, , z] = getPosition3D(i);
    const isCorner = i === 0 || i === 10 || i === 20 || i === 30;
    const mat = isCorner ? cornerMaterial : tileMaterial;
    const mesh = new THREE.Mesh(tileGeom, mat);
    mesh.position.set(x, TILE_HEIGHT / 2, z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    const name = BOARD_SQUARE_NAMES[i] ?? `Square ${i}`;
    const labelMat = new THREE.MeshBasicMaterial({
      map: makeLabelTexture(name),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const labelMesh = new THREE.Mesh(labelGeom, labelMat);
    labelMesh.position.set(x, LABEL_Y_OFFSET + LABEL_HEIGHT / 2, z);
    scene.add(labelMesh);
    labelMeshesRef.current.push(labelMesh);

    if (!BUILDABLE_POSITIONS.has(i)) continue;
    const level = DEMO_DEVELOPMENT[i] ?? 0;
    if (level === 0) continue;

    const baseY = TILE_HEIGHT + (level === 5 ? HOTEL_HEIGHT / 2 : HOUSE_HEIGHT / 2);

    if (level === 5) {
      const hotel = new THREE.Mesh(hotelGeom, hotelMaterial);
      hotel.position.set(x, baseY, z);
      hotel.castShadow = true;
      scene.add(hotel);
    } else {
      const step = 0.2;
      const offsets: [number, number][] =
        level === 1 ? [[0, 0]] :
        level === 2 ? [[-step / 2, 0], [step / 2, 0]] :
        level === 3 ? [[-step / 2, 0], [step / 2, 0], [0, step / 2]] :
        [[-step / 2, -step / 2], [step / 2, -step / 2], [-step / 2, step / 2], [step / 2, step / 2]];
      for (let h = 0; h < level; h++) {
        const [ox, oz] = offsets[h];
        const house = new THREE.Mesh(houseGeom, houseMaterial);
        house.position.set(x + ox, baseY, z + oz);
        house.castShadow = true;
        scene.add(house);
      }
    }
  }

  return scene;
}

export default function Board3DVanillaPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const labelMeshesRef = useRef<THREE.Mesh[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    labelMeshesRef.current = [];
    const scene = buildBoardScene(labelMeshesRef);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(new THREE.Vector3(...CAMERA_LOOK_AT));

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

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      labelMeshesRef.current.forEach((mesh) => mesh.lookAt(camera.position));
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameRef.current);
      controls.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      labelMeshesRef.current = [];
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#010F10]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
