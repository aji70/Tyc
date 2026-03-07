#!/usr/bin/env node
/**
 * Generates frontend Dojo manifest with world.abi and contracts[].abi so
 * @dojoengine/core can create Contract instances (full Dojo client execution).
 *
 * Copies tycoon_contract manifest (which has root-level "abis") and injects
 * abi into world and each contract. Run from repo root or frontend:
 *
 *   node frontend/scripts/generate-dojo-manifest.mjs
 *   # or from frontend:
 *   node scripts/generate-dojo-manifest.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve paths: script may run from repo root or frontend
const frontendDir = __dirname.includes("/frontend/") ? path.join(__dirname, "..") : path.join(__dirname, "..", "frontend");
const contractDir = path.join(frontendDir, "..", "tycoon_contract");
const manifestPath = path.join(contractDir, "manifest_sepolia.json");
const outPath = path.join(frontendDir, "lib", "dojo", "manifest_sepolia.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (!Array.isArray(manifest.abis) || manifest.abis.length === 0) {
  console.error("tycoon_contract/manifest_sepolia.json has no root 'abis' array. Run 'sozo -P sepolia build' in tycoon_contract first.");
  process.exit(1);
}

// @dojoengine/core expects manifest.world.abi and manifest.contracts[].abi
if (!manifest.world) {
  console.error("Manifest has no 'world'.");
  process.exit(1);
}
manifest.world.abi = [...manifest.abis];

const contracts = manifest.contracts || [];
for (let i = 0; i < contracts.length; i++) {
  contracts[i].abi = [...manifest.abis];
}

// Optional: remove root "abis" to avoid duplication (core only reads world.abi / contract.abi)
delete manifest.abis;

writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");
console.log("Wrote", outPath, "with world.abi and contracts[].abi for full Dojo client execution.");
