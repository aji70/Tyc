/**
 * Vanilla Three.js board scene (no R3F). Used by board-3d-canvas iframe and board-3d-vanilla page.
 * Builds tiles, labels, buildings from properties and development state.
 */
import * as THREE from "three";
import { getPosition3D, getTokenOffset } from "@/components/game/board3d/positions";
import { getPlayerSymbol } from "@/lib/types/symbol";
import type { Property } from "@/types/game";

/** Minimal player shape for token placement (from Board3DCanvasState). */
export type BoardScenePlayer = { user_id: number; position?: number; symbol?: string };

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

/** Special tile type by position (when prop.type is missing). */
function getSpecialTypeByPosition(i: number): "chance" | "community_chest" | "income_tax" | "luxury_tax" | null {
  if ([7, 22, 36].includes(i)) return "chance";
  if ([2, 17, 33].includes(i)) return "community_chest";
  if (i === 4) return "income_tax";
  if (i === 38) return "luxury_tax";
  return null;
}

// Monopoly color groups (match BoardScene); used for property building height.
const COLOR_GROUPS: Record<string, number[]> = {
  brown: [1, 3],
  lightblue: [6, 8, 9],
  pink: [11, 13, 14],
  orange: [16, 18, 19],
  red: [21, 23, 24],
  yellow: [26, 27, 29],
  green: [31, 32, 34],
  darkblue: [37, 39],
  railroad: [5, 15, 25, 35],
  utility: [12, 28],
};

const GROUP_HEIGHT: Record<string, number> = {
  brown: 0.14,
  lightblue: 0.16,
  pink: 0.18,
  orange: 0.2,
  red: 0.22,
  yellow: 0.2,
  green: 0.24,
  darkblue: 0.26,
};

function getGroupIndex(id: number): { group: string; index: number } {
  for (const [group, ids] of Object.entries(COLOR_GROUPS)) {
    const idx = ids.indexOf(id);
    if (idx >= 0) return { group, index: idx };
  }
  return { group: "other", index: 0 };
}

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

/** Create a texture with text (e.g. "?", "Chest", "$") for Chance/Chest/Tax labels. */
function makeTextTexture(text: string, opts: { fontSize?: number; fontColor?: string; bgColor?: string } = {}): THREE.CanvasTexture {
  const { fontSize = 32, fontColor = "#1a1a1a", bgColor = "transparent" } = opts;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (bgColor !== "transparent") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fontColor;
  ctx.fillText(text, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Create a texture with the emoji drawn on a circular background (for player token sprites). */
function makeEmojiTexture(emoji: string, isCurrent: boolean): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = isCurrent ? "rgba(34, 211, 238, 0.5)" : "rgba(0,0,0,0.6)";
  ctx.fill();
  ctx.strokeStyle = isCurrent ? "#22d3ee" : "rgba(255,255,255,0.5)";
  ctx.lineWidth = isCurrent ? 3 : 2;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText(emoji, cx, cy);
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
  /** Optional: players and positions to draw token sprites on the board */
  players?: BoardScenePlayer[];
  animatedPositions?: Record<number, number>;
  currentPlayerId?: number | null;
};

export function buildBoardScene(options: BuildBoardSceneOptions): THREE.Scene {
  const { properties, developmentByPropertyId = {}, labelMeshesRef, tileMeshesRef, players = [], animatedPositions = {}, currentPlayerId = null } = options;
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

  const houseMaterial = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.75, metalness: 0.1 });
  const hotelMaterial = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7, metalness: 0.1 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.85, metalness: 0.05 });

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

    const size = TILE_SIZE;

    // ---- CORNERS: GO, Jail, Free Parking, Go to Jail ----
    if (i === 0) {
      const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), new THREE.MeshStandardMaterial({ color: 0x27ae60 }));
      signPost.position.set(x, 0.14, z);
      signPost.castShadow = true;
      scene.add(signPost);
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(size * 0.65, 0.1, 0.04), new THREE.MeshStandardMaterial({ color: 0x2ecc71 }));
      signBoard.position.set(x, 0.28, z);
      signBoard.castShadow = true;
      scene.add(signBoard);
    } else if (i === 10) {
      const jailBase = new THREE.Mesh(new THREE.BoxGeometry(size * 0.7, 0.32, size * 0.7), new THREE.MeshStandardMaterial({ color: 0x5d6d7e }));
      jailBase.position.set(x, 0.18, z);
      jailBase.castShadow = true;
      scene.add(jailBase);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(size * 0.76, 0.06, size * 0.76), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
      roof.position.set(x, 0.38, z);
      roof.castShadow = true;
      scene.add(roof);
      const barW = 0.03;
      const barH = 0.28;
      for (let b = -2; b <= 2; b++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(barW, barH, barW), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
        bar.position.set(x + b * 0.14, 0.18, z + size * 0.32);
        bar.castShadow = true;
        scene.add(bar);
      }
    } else if (i === 20) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
      post.position.set(x, 0.12, z);
      post.castShadow = true;
      scene.add(post);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(size * 0.5, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0x3498db }));
      sign.position.set(x, 0.26, z);
      sign.castShadow = true;
      scene.add(sign);
    } else if (i === 30) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(size * 0.75, 0.1, size * 0.5), new THREE.MeshStandardMaterial({ color: 0x3d3d3d }));
      base.position.set(x, 0.08, z);
      base.castShadow = true;
      scene.add(base);
      const gateL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
      gateL.position.set(x - size * 0.22, 0.28, z);
      gateL.castShadow = true;
      scene.add(gateL);
      const gateR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
      gateR.position.set(x + size * 0.22, 0.28, z);
      gateR.castShadow = true;
      scene.add(gateR);
      const arch = new THREE.Mesh(new THREE.BoxGeometry(size * 0.6, 0.1, 0.14), new THREE.MeshStandardMaterial({ color: 0xc0392b }));
      arch.position.set(x, 0.52, z);
      arch.castShadow = true;
      scene.add(arch);
      const barW = 0.022;
      for (let b = -2; b <= 2; b++) {
        const goBar = new THREE.Mesh(new THREE.BoxGeometry(barW, 0.42, 0.08), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
        goBar.position.set(x + b * 0.14, 0.28, z);
        goBar.castShadow = true;
        scene.add(goBar);
      }
    }
    // ---- RAILROADS ----
    else if (i === 5 || i === 15 || i === 25 || i === 35) {
      const platform = new THREE.Mesh(new THREE.BoxGeometry(size * 0.85, 0.08, size * 0.5), new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
      platform.position.set(x, 0.06, z);
      platform.castShadow = true;
      scene.add(platform);
      const station = new THREE.Mesh(new THREE.BoxGeometry(size * 0.45, 0.25, size * 0.4), new THREE.MeshStandardMaterial({ color: 0xd5d8dc }));
      station.position.set(x, 0.22, z);
      station.castShadow = true;
      scene.add(station);
      const awning = new THREE.Mesh(new THREE.BoxGeometry(size * 0.9, 0.04, size * 0.35), new THREE.MeshStandardMaterial({ color: 0x27ae60 }));
      awning.position.set(x, 0.38, z);
      awning.castShadow = true;
      scene.add(awning);
      const engine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.18), new THREE.MeshStandardMaterial({ color: 0xc0392b }));
      engine.position.set(x - size * 0.2, 0.14, z);
      engine.castShadow = true;
      scene.add(engine);
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
      chimney.position.set(x - size * 0.2, 0.24, z);
      chimney.castShadow = true;
      scene.add(chimney);
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.16), new THREE.MeshStandardMaterial({ color: 0x2980b9 }));
      carriage.position.set(x + size * 0.15, 0.12, z);
      carriage.castShadow = true;
      scene.add(carriage);
    }
    // ---- CHANCE: standing card with ? label ----
    else if ((prop?.type ?? getSpecialTypeByPosition(i)) === "chance") {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(size * 0.3, 0.08, size * 0.3), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
      stand.position.set(x, 0.05, z);
      stand.castShadow = true;
      scene.add(stand);
      const card = new THREE.Mesh(new THREE.BoxGeometry(size * 0.28, size * 0.5, 0.02), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
      card.position.set(x, 0.2, z);
      card.castShadow = true;
      scene.add(card);
      const chanceTex = makeTextTexture("?", { fontSize: 28, fontColor: "#1a1a1a" });
      const chanceSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: chanceTex, transparent: true, depthTest: false }));
      chanceSprite.position.set(x, 0.22, z);
      chanceSprite.scale.set(0.35, 0.35, 1);
      scene.add(chanceSprite);
    }
    // ---- COMMUNITY CHEST: treasure chest + "Chest" label ----
    else if ((prop?.type ?? getSpecialTypeByPosition(i)) === "community_chest") {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(size * 0.55, 0.025, size * 0.45), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
      pad.position.set(x, 0.02, z);
      pad.castShadow = true;
      scene.add(pad);
      const body = new THREE.Mesh(new THREE.BoxGeometry(size * 0.48, size * 0.24, size * 0.36), new THREE.MeshStandardMaterial({ color: 0x1e8449, roughness: 0.6 }));
      body.position.set(x, 0.14, z);
      body.castShadow = true;
      scene.add(body);
      const bandH = new THREE.Mesh(new THREE.BoxGeometry(size * 0.5, 0.045, 0.04), new THREE.MeshStandardMaterial({ color: 0xd4a574 }));
      bandH.position.set(x, 0.14, z + size * 0.2);
      bandH.castShadow = true;
      scene.add(bandH);
      const bandC = new THREE.Mesh(new THREE.BoxGeometry(size * 0.5, 0.045, 0.04), new THREE.MeshStandardMaterial({ color: 0xd4a574 }));
      bandC.position.set(x, 0.14, z);
      bandC.castShadow = true;
      scene.add(bandC);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(size * 0.5, 0.06, size * 0.38), new THREE.MeshStandardMaterial({ color: 0x229954, roughness: 0.6 }));
      lid.position.set(x, 0.3, z);
      lid.castShadow = true;
      scene.add(lid);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
      lock.position.set(x, 0.1, z + size * 0.19);
      lock.castShadow = true;
      scene.add(lock);
      const chestTex = makeTextTexture("Chest", { fontSize: 12, fontColor: "#fff" });
      const chestSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: chestTex, transparent: true, depthTest: false }));
      chestSprite.position.set(x, 0.22, z);
      chestSprite.scale.set(0.4, 0.15, 1);
      scene.add(chestSprite);
    }
    // ---- TAX: tax office + $ label ----
    else if ((prop?.type ?? getSpecialTypeByPosition(i)) === "income_tax" || (prop?.type ?? getSpecialTypeByPosition(i)) === "luxury_tax") {
      const steps = new THREE.Mesh(new THREE.BoxGeometry(size * 0.65, 0.04, size * 0.65), new THREE.MeshStandardMaterial({ color: 0x4a235a }));
      steps.position.set(x, 0.03, z);
      steps.castShadow = true;
      scene.add(steps);
      const building = new THREE.Mesh(new THREE.BoxGeometry(size * 0.55, 0.28, size * 0.55), new THREE.MeshStandardMaterial({ color: 0x5b2c6f }));
      building.position.set(x, 0.18, z);
      building.castShadow = true;
      scene.add(building);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(size * 0.6, 0.05, size * 0.6), new THREE.MeshStandardMaterial({ color: 0x4a235a }));
      roof.position.set(x, 0.34, z);
      roof.castShadow = true;
      scene.add(roof);
      const taxTex = makeTextTexture("$", { fontSize: 14, fontColor: "#fff" });
      const taxSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: taxTex, transparent: true, depthTest: false }));
      taxSprite.position.set(x, 0.22, z);
      taxSprite.scale.set(0.3, 0.3, 1);
      scene.add(taxSprite);
    }
    // ---- PROPERTIES: terraced building + pitched roof + houses/hotel on top ----
    else if (BUILDABLE_POSITIONS.has(i)) {
      const { group } = getGroupIndex(i);
      const groupHeight = GROUP_HEIGHT[group] ?? 0.18;
      const bodyH = groupHeight * 0.65;
      const roofH = groupHeight * 0.35;
      const bodyMat = getMaterial(colorSpec);
      const body = new THREE.Mesh(new THREE.BoxGeometry(size * 0.65, bodyH, size * 0.65), bodyMat);
      body.position.set(x, 0.02 + bodyH / 2, z);
      body.castShadow = true;
      scene.add(body);
      const roofW = size * 0.48;
      const roofSlant1 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.72, roofH, roofW), roofMaterial);
      roofSlant1.position.set(x, 0.02 + bodyH + roofH / 2, z - roofW * 0.15);
      roofSlant1.rotation.x = Math.PI / 6;
      roofSlant1.castShadow = true;
      scene.add(roofSlant1);
      const roofSlant2 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.72, roofH, roofW), roofMaterial);
      roofSlant2.position.set(x, 0.02 + bodyH + roofH / 2, z + roofW * 0.15);
      roofSlant2.rotation.x = -Math.PI / 6;
      roofSlant2.castShadow = true;
      scene.add(roofSlant2);

      const development = developmentByPropertyId[i] ?? 0;
      const baseY = 0.02 + bodyH + roofH;
      const houseH = 0.08;
      const houseW = size * 0.2;
      const gap = 0.04;
      const housePositions: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      if (development >= 5) {
        const hotelH = 0.2;
        const hotel = new THREE.Mesh(new THREE.BoxGeometry(size * 0.35, hotelH, size * 0.35), hotelMaterial);
        hotel.position.set(x, baseY + hotelH / 2, z);
        hotel.castShadow = true;
        scene.add(hotel);
      } else if (development >= 1 && development <= 4) {
        for (let h = 0; h < development; h++) {
          const [sx, sz] = housePositions[h];
          const hx = x + sx * (houseW / 2 + gap / 2);
          const hz = z + sz * (houseW / 2 + gap / 2);
          const house = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseW), houseMaterial);
          house.position.set(hx, baseY + houseH / 2, hz);
          house.castShadow = true;
          scene.add(house);
        }
      }
    }
  }

  // Player tokens: sprites with emoji at each player's position
  if (players.length > 0 && Object.keys(animatedPositions).length > 0) {
    const positionCounts: Record<number, number> = {};
    const positionIndex: Record<number, number> = {};
    players.forEach((p) => {
      const pos = animatedPositions[p.user_id] ?? (p.position ?? 0);
      positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
    });
    const TOKEN_SIZE = 0.45;
    const TOKEN_Y = 0.08; // above tile top (TILE_HEIGHT = 0.05) so tokens are visible
    players.forEach((player) => {
      const pos = animatedPositions[player.user_id] ?? (player.position ?? 0);
      const totalOnSquare = positionCounts[pos] ?? 1;
      const idxOnSquare = positionIndex[pos] ?? 0;
      positionIndex[pos] = idxOnSquare + 1;
      const [x, , z] = getPosition3D(pos);
      const [ox] = getTokenOffset(idxOnSquare, totalOnSquare);
      const emoji = getPlayerSymbol(player.symbol) ?? "🎲";
      const isCurrent = currentPlayerId != null && player.user_id === currentPlayerId;
      const tex = makeEmojiTexture(emoji, isCurrent);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false, // keep tokens visible above board from any angle
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(x + ox, TOKEN_Y, z);
      sprite.scale.set(TOKEN_SIZE, TOKEN_SIZE, 1);
      scene.add(sprite);
    });
  }

  return scene;
}
