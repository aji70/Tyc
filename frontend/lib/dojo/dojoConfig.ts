import { createDojoConfig } from "@dojoengine/core";
import manifest from "./manifest_sepolia.json";

const rpcUrl =
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL ??
  "https://api.cartridge.gg/x/starknet/sepolia";

export const dojoConfig = createDojoConfig({
  manifest,
  rpcUrl,
});
