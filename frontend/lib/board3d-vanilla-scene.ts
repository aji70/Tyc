/**
 * Vanilla Three.js board scene (no R3F). Used by board-3d-canvas iframe and board-3d-vanilla page.
 * Builds tiles, labels, buildings from properties and development state.
 */
import * as THREE from "three";
import { getPosition3D } from "@/components/game/board3d/positions";
import { BOARD_SQUARE_NAMES } from "@/components/game/board3d/squareNames";
import type { Property } from "@/types/game";

export const TILE_SIZE = 0.9;
export const TILE_HEIGHT = 0.05;
export const LABEL_HEIGHT = 0.15;
export const LABEL_Y_OFFSET = TILE_HEIGHT + 0.02;
export const HOUSE_SIZE = 0.2;
export const HOUSE_HEIGHT = 0.18;
export const HOTEL_SIZE = 0.28;
export const HOTEL_HEIGHT = 0.26;

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

const BUILDABLE_POSITIONS = new Set([
  1, 3, 6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23, 24, 26, 27, 28, 31, 32, 34, 37, 39,
]);

function hexToThreeColor(hex: string): THREE.Color {
  const n = parseInt(hex.replace(/^#/, ""), 16);
  return new THREE.Color(n);
}

function getTileMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
}

export function getColorSpec(prop: Property): string {
  if (prop.type === "chance") return "chance";
  if (prop.type === "community_chest") return "community_chest";
  if (prop.type === "income_tax") return "income_tax";
  if (prop.type === "luxury_tax") return "luxury_tax";
  return prop.color ?? TILE_COLORS[prop.id]?.color ?? "#1a3a3e";
}

export function makeLabelTexture(name: string): THREE.CanvasTexture {
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

export type BuildBoardSceneOptions = {
  properties: Property[];
  developmentByPropertyId?: Record<number, number>;
  /** Optional: meshes to make labels face camera each frame */
  labelMeshesRef?: { current: THREE.Mesh[] };
  /** Optional: tile meshes for raycasting (userData.propertyId set) */
  tileMeshesRef?: { current: THREE.Mesh[] };
};

export function buildBoardScene(options: BuildBoardSceneOptions): THREE.Scene {
  const { properties, developmentByPropertyId = {}, labelMeshesRef, tileMeshesRef } = options;
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
  const chanceColor = new THREE.Color(0xf39c12);
  const communityChestColor = new THREE.Color(0x1abc9c);
  const incomeTaxColor = new THREE.Color(0xbdc3c7);
  const luxuryTaxColor = new THREE.Color(0x9b59b6);
  const materialCache = new Map<string, THREE.MeshStandardMaterial>();
  function getMaterial(colorSpec: string): THREE.MeshStandardMaterial {
    let color: THREE.Color;
    if (colorSpec === "railroad") color = railroadColor;
    else if (colorSpec === "utility") color = utilityColor;
    else if (colorSpec === "chance") color = chanceColor;
    else if (colorSpec === "community_chest") color = communityChestColor;
    else if (colorSpec === "income_tax") color = incomeTaxColor;
    else if (colorSpec === "luxury_tax") color = luxuryTaxColor;
    else color = hexToThreeColor(colorSpec);
    const key = color.getStyle();
    if (!materialCache.has(key)) materialCache.set(key, getTileMaterial(color));
    return materialCache.get(key)!;
  }

  const labelGeom = new THREE.PlaneGeometry(TILE_SIZE * 0.95, LABEL_HEIGHT);
  const houseGeom = new THREE.BoxGeometry(HOUSE_SIZE, HOUSE_HEIGHT, HOUSE_SIZE);
  const hotelGeom = new THREE.BoxGeometry(HOTEL_SIZE, HOTEL_HEIGHT, HOTEL_SIZE);
  const houseMaterial = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6, metalness: 0.1 });
  const hotelMaterial = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6, metalness: 0.1 });

  const tileMeshes: THREE.Mesh[] = [];
  if (tileMeshesRef) tileMeshesRef.current = [];

  for (let i = 0; i < 40; i++) {
    const prop = properties[i];
    const [x, , z] = getPosition3D(i);
    const colorSpec = prop ? getColorSpec(prop) : TILE_COLORS[i]?.color ?? "#1a3a3e";
    const mat = getMaterial(colorSpec);
    const mesh = new THREE.Mesh(tileGeom, mat);
    mesh.position.set(x, TILE_HEIGHT / 2, z);
    mesh.receiveShadow = true;
    (mesh as THREE.Mesh & { userData: { propertyId?: number } }).userData.propertyId = i;
    scene.add(mesh);
    tileMeshes.push(mesh);
    if (tileMeshesRef) tileMeshesRef.current.push(mesh);

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
    if (labelMeshesRef) labelMeshesRef.current.push(labelMesh);

    if (!BUILDABLE_POSITIONS.has(i)) continue;
    const level = developmentByPropertyId[i] ?? 0;
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
