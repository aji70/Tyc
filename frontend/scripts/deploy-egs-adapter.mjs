#!/usr/bin/env node
/**
 * Deploy TycoonEGS adapter to Starknet Sepolia via starknet.js.
 * Run from repo root: npm run deploy:egs  OR  node frontend/scripts/deploy-egs-adapter.mjs
 * Requires: DOJO_ACCOUNT_ADDRESS, DOJO_PRIVATE_KEY in tycoon_contract/.env.sepolia
 * Build first: cd tycoon_contract && scarb build
 */
import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { Account, RpcProvider } from "starknet";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "../..");
const contractDir = join(root, "tycoon_contract");
const envPath = join(contractDir, ".env.sepolia");

// Load .env.sepolia (handles export KEY=value)
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^(?:export\s+)?([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

const RPC = process.env.STARKNET_RPC_URL || "https://starknet-sepolia.public.blastapi.io";
const ADDRESS = process.env.DOJO_ACCOUNT_ADDRESS;
const PRIVATE_KEY = process.env.DOJO_PRIVATE_KEY;

if (!ADDRESS || !PRIVATE_KEY) {
  console.error("Set DOJO_ACCOUNT_ADDRESS and DOJO_PRIVATE_KEY in tycoon_contract/.env.sepolia");
  process.exit(1);
}

// Starknet constructor expects one felt252 (owner). Use hex string.
function toFelt252(addr) {
  if (typeof addr === "string" && addr.startsWith("0x")) return addr;
  if (typeof addr === "string") return "0x" + BigInt(addr).toString(16);
  return "0x" + BigInt(addr).toString(16);
}

function getTycoonGameAddress() {
  const manifestPaths = [
    join(contractDir, "manifest_sepolia.json"),
    join(contractDir, "target/manifest_sepolia.json"),
  ];
  for (const p of manifestPaths) {
    if (!existsSync(p)) continue;
    try {
      const manifest = JSON.parse(readFileSync(p, "utf8"));
      const world = manifest.world || manifest;
      const addr = world.address || world.world_address;
      if (addr) return addr;
      const contracts = manifest.contracts || world.contracts || [];
      const game = contracts.find((c) => (c.name || c.contract || "").includes("tycoon-game") || (c.name || c.contract || "").includes("game"));
      if (game && game.address) return game.address;
    } catch (_) {}
  }
  return null;
}

async function main() {
  const sierraPath = join(contractDir, "target/dev/tycoon_TycoonEGS.contract_class.json");
  const casmPath = join(contractDir, "target/dev/tycoon_TycoonEGS.compiled_contract_class.json");

  let sierra, casm;
  try {
    sierra = JSON.parse(readFileSync(sierraPath, "utf8"));
    casm = JSON.parse(readFileSync(casmPath, "utf8"));
  } catch (e) {
    console.error("Run `cd tycoon_contract && scarb build` first.");
    console.error(e.message);
    process.exit(1);
  }

  const provider = new RpcProvider({ nodeUrl: RPC });
  const account = new Account(provider, ADDRESS, PRIVATE_KEY);

  const ownerFelt = toFelt252(ADDRESS);
  console.log("Declaring and deploying TycoonEGS adapter (owner:", ownerFelt.slice(0, 18) + "...)...");
  const result = await account.declareAndDeploy({
    contract: sierra,
    casm,
    constructorCalldata: [ownerFelt],
  });

  const deployedAddress = result.deploy?.contract_address ?? result.contract_address;
  const classHash = result.declare?.class_hash ?? result.class_hash;
  console.log("TycoonEGS deployed at:", deployedAddress);
  if (classHash) console.log("Class hash:", classHash);

  const tycoonGameAddr = getTycoonGameAddress();
  console.log("\n--- Next: register adapter and authorize (run from tycoon_contract with env loaded) ---\n");
  console.log("  # 1) Register adapter in world (if EgsConfig never inited, run init first):");
  console.log("  #    sozo -P sepolia execute tycoon-game init_egs_config");
  console.log("  sozo -P sepolia execute tycoon-game set_egs_adapter --calldata " + deployedAddress);
  console.log("");
  console.log("  # 2) Authorize tycoon-game to call adapter (use tycoon-game address from manifest):");
  if (tycoonGameAddr) {
    console.log("  starkli invoke " + deployedAddress + " set_authorized_caller " + tycoonGameAddr + " \\");
    console.log("    --account <YOUR_ACCOUNT> --rpc " + RPC + " --private-key <YOUR_KEY>");
    console.log("  # Or with sncast: sncast call --contract-address " + deployedAddress + " --function set_authorized_caller --calldata " + tycoonGameAddr);
  } else {
    console.log("  starkli invoke <ADAPTER> set_authorized_caller <TYCOON_GAME_ADDRESS> \\");
    console.log("    --account <YOUR_ACCOUNT> --rpc " + RPC + " --private-key <YOUR_KEY>");
    console.log("  # Get tycoon-game address from tycoon_contract/manifest_sepolia.json or target/manifest_sepolia.json after migrate.");
  }
  console.log("");
  console.log("  # 3) Frontend .env:");
  console.log("  NEXT_PUBLIC_EGS_ADAPTER_ADDRESS=" + deployedAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
