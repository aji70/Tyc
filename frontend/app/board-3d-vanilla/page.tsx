"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { getPosition3D } from "@/components/game/board3d/positions";

/**
 * Skeletal 3D Monopoly-style board using vanilla Three.js only (no R3F).
 * Avoids ReactCurrentBatchConfig conflict with Cartridge.
 */

const TILE_SIZE = 0.9;
const TILE_HEIGHT = 0.05;
const CAMERA_POSITION: [number, number, number] = [0, 12, 12];
const CAMERA_LOOK_AT: [number, number, number] = [0, 0, 0];

function buildBoardScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010f10);

  // Lights
  const ambient = new THREE.AmbientLight(0x404060, 0.8);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(8, 12, 8);
  dir.castShadow = true;
  scene.add(dir);

  // 40 tiles in a loop (same layout as positions.ts)
  const tileGeom = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
  const cornerColor = new THREE.Color(0x2ecc71);
  const tileColor = new THREE.Color(0x1a3a3e);
  const cornerMaterial = new THREE.MeshStandardMaterial({ color: cornerColor });
  const tileMaterial = new THREE.MeshStandardMaterial({ color: tileColor });

  for (let i = 0; i < 40; i++) {
    const [x, , z] = getPosition3D(i);
    const isCorner = i === 0 || i === 10 || i === 20 || i === 30;
    const mat = isCorner ? cornerMaterial : tileMaterial;
    const mesh = new THREE.Mesh(tileGeom, mat);
    mesh.position.set(x, TILE_HEIGHT / 2, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  return scene;
}

export default function Board3DVanillaPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = buildBoardScene();
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
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameRef.current);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#010F10]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
