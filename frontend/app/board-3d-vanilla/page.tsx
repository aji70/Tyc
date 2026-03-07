"use client";

import { useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getPosition3D } from "@/components/game/board3d/positions";
import { BOARD_SQUARE_NAMES, getSquareName } from "@/components/game/board3d/squareNames";
import { useStarknetWallet } from "@/context/starknet-wallet-provider";
import { apiClient } from "@/lib/api";
import { ApiResponse } from "@/types/api";
import type { Property } from "@/types/game";

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

const HOUSE_SIZE = 0.2;
const HOUSE_HEIGHT = 0.18;
const HOTEL_SIZE = 0.28;
const HOTEL_HEIGHT = 0.26;

/** Property/tile colors. Chance, Community Chest, and Tax use unique colors. Fallback when API has no data. */
const TILE_COLORS: { id: number; color: string }[] = [
  { id: 0, color: "#2ecc71" }, { id: 1, color: "#8B4513" }, { id: 2, color: "community_chest" }, { id: 3, color: "#8B4513" }, { id: 4, color: "income_tax" },
  { id: 5, color: "railroad" }, { id: 6, color: "#87CEEB" }, { id: 7, color: "chance" }, { id: 8, color: "#87CEEB" }, { id: 9, color: "#87CEEB" },
  { id: 10, color: "#7f8c8d" }, { id: 11, color: "#FF69B4" }, { id: 12, color: "utility" }, { id: 13, color: "#FF69B4" }, { id: 14, color: "#FF69B4" },
  { id: 15, color: "railroad" }, { id: 16, color: "#FFA500" }, { id: 17, color: "community_chest" }, { id: 18, color: "#FFA500" }, { id: 19, color: "#FFA500" },
  { id: 20, color: "#3498db" }, { id: 21, color: "#FF0000" }, { id: 22, color: "chance" }, { id: 23, color: "#FF0000" }, { id: 24, color: "#FF0000" },
  { id: 25, color: "railroad" }, { id: 26, color: "#FFD700" }, { id: 27, color: "#FFD700" }, { id: 28, color: "utility" }, { id: 29, color: "#FFD700" },
  { id: 30, color: "#e74c3c" }, { id: 31, color: "#228B22" }, { id: 32, color: "#228B22" }, { id: 33, color: "community_chest" }, { id: 34, color: "#228B22" },
  { id: 35, color: "railroad" }, { id: 36, color: "chance" }, { id: 37, color: "#0000CD" }, { id: 38, color: "luxury_tax" }, { id: 39, color: "#0000CD" },
];

/** Fetch board properties from backend (same as other 3D boards). Fallback to static data when API fails or returns < 40. */
function useBoardProperties(): { properties: Property[]; isLoading: boolean } {
  const { data: apiProperties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse>("/properties");
      return res.data?.success ? res.data.data : [];
    },
    staleTime: Infinity,
  });

  const fallback = useMemo(() => {
    return TILE_COLORS.map((t) => ({
      id: t.id,
      type: t.color === "chance" ? "chance" : t.color === "community_chest" ? "community_chest" : t.color === "income_tax" ? "income_tax" : t.color === "luxury_tax" ? "luxury_tax" : t.color === "railroad" ? "property" : t.color === "utility" ? "property" : "property",
      name: getSquareName(t.id),
      group_id: Math.floor(t.id / 10),
      position: "bottom" as const,
      grid_row: 11,
      grid_col: 11,
      price: 0,
      rent_site_only: 0,
      rent_one_house: 0,
      rent_two_houses: 0,
      rent_three_houses: 0,
      rent_four_houses: 0,
      rent_hotel: 0,
      cost_of_house: 0,
      is_mortgaged: false,
      color: t.color,
    })) as Property[];
  }, []);

  if (apiProperties.length >= 40) {
    const sorted = [...apiProperties].sort((a, b) => a.id - b.id);
    return { properties: sorted, isLoading: false };
  }
  return { properties: fallback, isLoading };
}

function hexToThreeColor(hex: string): THREE.Color {
  const n = parseInt(hex.replace(/^#/, ""), 16);
  return new THREE.Color(n);
}

/** R3F-style material: roughness 0.85, metalness 0.05. */
function getTileMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.05,
  });
}

function makeLabelTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const w = 256;
  const h = 64;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.length > 18 ? name.slice(0, 16) + "…" : name, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Resolve tile color from backend property: use type for chance/chest/tax, else property.color. */
function getColorSpec(prop: Property): string {
  if (prop.type === "chance") return "chance";
  if (prop.type === "community_chest") return "community_chest";
  if (prop.type === "income_tax") return "income_tax";
  if (prop.type === "luxury_tax") return "luxury_tax";
  return prop.color ?? TILE_COLORS[prop.id]?.color ?? "#1a3a3e";
}

function buildBoardScene(labelMeshesRef: { current: THREE.Mesh[] }, properties: Property[]): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010f10);

  const ambient = new THREE.AmbientLight(0x404060, 0.8);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(8, 12, 8);
  dir.castShadow = true;
  scene.add(dir);

  const tileGeom = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
  const railroadColor = new THREE.Color(0xf2f2f5);
  const utilityColor = new THREE.Color(0xf4d03f);
  const chanceColor = new THREE.Color(0xf39c12);       // orange/gold
  const communityChestColor = new THREE.Color(0x1abc9c); // teal
  const incomeTaxColor = new THREE.Color(0xbdc3c7);     // light gray
  const luxuryTaxColor = new THREE.Color(0x9b59b6);     // purple
  const materialCache = new Map<string, THREE.MeshStandardMaterial>();
  function getMaterial(colorSpec: string): THREE.MeshStandardMaterial {
    let key = colorSpec;
    let color: THREE.Color;
    if (colorSpec === "railroad") color = railroadColor;
    else if (colorSpec === "utility") color = utilityColor;
    else if (colorSpec === "chance") color = chanceColor;
    else if (colorSpec === "community_chest") color = communityChestColor;
    else if (colorSpec === "income_tax") color = incomeTaxColor;
    else if (colorSpec === "luxury_tax") color = luxuryTaxColor;
    else color = hexToThreeColor(colorSpec);
    key = color.getStyle();
    if (!materialCache.has(key)) materialCache.set(key, getTileMaterial(color));
    return materialCache.get(key)!;
  }

  const labelGeom = new THREE.PlaneGeometry(TILE_SIZE * 0.95, LABEL_HEIGHT);

  const houseGeom = new THREE.BoxGeometry(HOUSE_SIZE, HOUSE_HEIGHT, HOUSE_SIZE);
  const hotelGeom = new THREE.BoxGeometry(HOTEL_SIZE, HOTEL_HEIGHT, HOTEL_SIZE);
  const houseMaterial = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6, metalness: 0.1 });
  const hotelMaterial = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6, metalness: 0.1 });

  for (let i = 0; i < 40; i++) {
    const prop = properties[i];
    const [x, , z] = getPosition3D(i);
    const colorSpec = prop ? getColorSpec(prop) : TILE_COLORS[i]?.color ?? "#1a3a3e";
    const mat = getMaterial(colorSpec);
    const mesh = new THREE.Mesh(tileGeom, mat);
    mesh.position.set(x, TILE_HEIGHT / 2, z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    const name = prop?.name ?? BOARD_SQUARE_NAMES[i] ?? `Square ${i}`;
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
      const step = 0.26;
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
  const { properties, isLoading } = useBoardProperties();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const labelMeshesRef = useRef<THREE.Mesh[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || properties.length < 40) return;

    labelMeshesRef.current = [];
    const scene = buildBoardScene(labelMeshesRef, properties);
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
  }, [properties]);

  const { account, connectors, connectWallet, disconnectWallet } = useStarknetWallet();
  const isConnected = !!account;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#010F10] flex flex-col">
      {/* Cartridge bar: visible on same page as vanilla 3D board to test no crash */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center justify-between bg-[#0a1214] border-b border-cyan-500/30 z-10">
        <span className="text-cyan-400/90 text-sm font-medium">Vanilla 3D board + Cartridge</span>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              type="button"
              onClick={() => disconnectWallet()}
              className="px-3 py-1.5 rounded-lg bg-rose-900/60 text-rose-200 text-sm border border-rose-500/50"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => connectors[0] && connectWallet(connectors[0])}
              className="px-3 py-1.5 rounded-lg bg-cyan-900/60 text-cyan-200 text-sm border border-cyan-500/50"
            >
              Connect Cartridge
            </button>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="flex-1 min-h-0 w-full flex items-center justify-center gap-2 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin" />
          <p className="text-sm">Loading board…</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 min-h-0 w-full" />
      )}
    </div>
  );
}
