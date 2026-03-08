# EGS (Embeddable Game Standard) deployment — do it together

Follow these steps in order. Replace placeholders with your values.

---

## Prerequisites

- **Dojo world** already deployed (you have `dojo_sepolia.toml` with `world_address` and run `migrate.sh` or `sozo -P sepolia migrate`).
- **Account**: `DOJO_ACCOUNT_ADDRESS` and `DOJO_PRIVATE_KEY` in `.env.sepolia` (same as for migrate).
- **RPC**: Sepolia RPC (e.g. `https://api.cartridge.gg/x/starknet/sepolia` or `NEXT_PUBLIC_STARKNET_RPC_URL`).

---

## Step 1 — Build (already done)

```bash
cd tycoon_contract
scarb build
```

The EGS adapter artifact is: `target/dev/tycoon_TycoonEGS.contract_class.json`.

---

## Step 2 — Migrate world (if needed)

`tycoon-EgsConfig` is in `[writers]` so that `tycoon-game` can write the adapter address when you call `set_egs_adapter` / `init_egs_config`. If you get **"Mismatch compiled class hash"** during migrate, see Troubleshooting below.

If you need to apply world changes (e.g. after adding the EgsConfig model in code), run:

```bash
sozo -P sepolia build
sozo -P sepolia migrate
```

---

## Step 3 — Deploy the EGS adapter (standalone contract)

The adapter constructor takes **one argument**: `owner` (Starknet contract address / felt252).

**Option A — Using `starkli` (if installed)**

```bash
# Declare the contract class (once per class)
starkli declare target/dev/tycoon_TycoonEGS.contract_class.json \
  --account <YOUR_ACCOUNT_JSON> \
  --rpc https://api.cartridge.gg/x/starknet/sepolia \
  --private-key <YOUR_PRIVATE_KEY>

# Deploy (use the class hash from the declare output)
starkli deploy <CLASS_HASH> <OWNER_ADDRESS> \
  --account <YOUR_ACCOUNT_JSON> \
  --rpc https://api.cartridge.gg/x/starknet/sepolia \
  --private-key <YOUR_PRIVATE_KEY>
```

**Option B — Using Starknet Foundry `sncast`**

First declare (run from `tycoon_contract/`); note the **class hash** from the output:

```bash
cd tycoon_contract
sncast declare --contract-name tycoon_TycoonEGS --url <YOUR_RPC> --account <ACCOUNT_NAME>
```

Then deploy (use the class hash from declare; owner = one felt252, e.g. your Dojo account address):

```bash
sncast deploy --class-hash <CLASS_HASH> --constructor-calldata <OWNER_ADDRESS> \
  --url <YOUR_RPC> --account <ACCOUNT_NAME>
```

**Option C — Using starknet.js (recommended)**

From the repo root, using the same `.env.sepolia` as migrate:

```bash
cd tycoon_contract && scarb build && cd ..
npm run deploy:egs
# Or: node frontend/scripts/deploy-egs-adapter.mjs
```

Uses `DOJO_ACCOUNT_ADDRESS` and `DOJO_PRIVATE_KEY` from `tycoon_contract/.env.sepolia`.  
Uses `STARKNET_RPC_URL` from that file, or falls back to Blast RPC if unset.

**Option D — Starknet CLI or other tools**

If you use the legacy `starknet` CLI or other tools, deploy with constructor calldata = owner address (one felt252).

**After deploy:** note the **adapter contract address** (e.g. `0x...`). You need it for Steps 4 and 5.

---

## Step 4 — Register adapter in the Dojo world

Tell the game system to use this adapter:

```bash
sozo -P sepolia execute tycoon-game set_egs_adapter --calldata <ADAPTER_ADDRESS>
```

Use the address from Step 3. Calldata is one felt252 (the adapter address).  
Example:

```bash
sozo -P sepolia execute tycoon-game set_egs_adapter --calldata 0x0123...abc
```

If your world was deployed **before** EgsConfig existed, run once:

```bash
sozo -P sepolia execute tycoon-game init_egs_config
```

Then run `set_egs_adapter` as above.

---

## Step 5 — Authorize the game system to call the adapter

The adapter only accepts `record_result` from `authorized_caller` or `owner`. Set `authorized_caller` to the **tycoon-game** contract address.

**Current tycoon-game address (from manifest):**  
`0x5a31a881755ac573ede94e35d6c16e72d3892745d2600f352b5e956fde817f`

Using **starkli**:

```bash
starkli invoke <ADAPTER_ADDRESS> set_authorized_caller 0x5a31a881755ac573ede94e35d6c16e72d3892745d2600f352b5e956fde817f \
  --account <YOUR_ACCOUNT_JSON> \
  --rpc https://api.cartridge.gg/x/starknet/sepolia \
  --private-key <YOUR_PRIVATE_KEY>
```

Using **sncast**:

```bash
sncast --url https://api.cartridge.gg/x/starknet/sepolia --account <ACCOUNT_NAME> \
  call --contract-address <ADAPTER_ADDRESS> \
  --function set_authorized_caller \
  --calldata 0x5a31a881755ac573ede94e35d6c16e72d3892745d2600f352b5e956fde817f
```

If your game contract address is different (e.g. after a new migration), use that address instead.

---

## Step 6 — Frontend env

In your frontend (e.g. Vercel or `.env.local`):

```env
NEXT_PUBLIC_EGS_ADAPTER_ADDRESS=0x...   # same as Step 3
```

Redeploy or restart the frontend so the EGS badge and polling use the adapter.

---

## Step 7 — Register with Provable Games (optional)

To list Tycoon in the EGS registry and on EGS platforms (e.g. Denshokan):

- Follow the [EGS registration guide](https://docs.provable.games/embeddable-game-standard).
- Use your **adapter contract address** (the one that implements `IMinigameTokenData` and SRC5).

---

## Troubleshooting: "Mismatch compiled class hash"

If migrate fails with **Mismatch compiled class hash for class with hash 0x...**:

The chain already has that class declared with a **different compiled (CASM) hash** from an older toolchain. Sozo is trying to declare it again with the current build’s CASM, and the chain rejects it.

**Option A — New world (most reliable)**  
Deploy a fresh world so every class is declared with the current compiler:

1. In `dojo_sepolia.toml`, change `seed` to a new value (e.g. `seed = "tycoon_sepolia_v2"`). That gives a new world address.
2. Run `./migrate.sh`. Sozo will deploy a new world and declare all classes; no mismatch.
3. Update the frontend (and any config) to use the new world address from the generated `manifest_sepolia.json`.
4. Re-run your one-time init (e.g. `init_game_config`, `init_reward`, etc.) on the new world.

**Option B — Match original toolchain**  
If you know the exact Dojo/Scarb version used when the world was first deployed:

1. Install that version (e.g. `dojoup install 1.8.0` or the version that was used).
2. `rm -rf target && sozo -P sepolia build && sozo -P sepolia migrate` (with account env loaded).
3. If the versions match the chain, the compiled hashes will match and migrate will succeed.

**Do not** add `tycoon-EgsConfig` to `[writers]`; that does not fix this and can make the migration diff worse. If you need more help, ask in [Dojo Discord](https://discord.gg/dojoengine) with the full error (class hash + Actual vs Expected).

---

## Quick reference

| What              | Value (example) |
|-------------------|------------------|
| EGS adapter class | `target/dev/tycoon_TycoonEGS.contract_class.json` |
| tycoon-game       | `0x5a31a881755ac573ede94e35d6c16e72d3892745d2600f352b5e956fde817f` |
| Constructor arg  | 1: `owner` (your account address) |
| Sozo set_adapter  | `sozo -P sepolia execute tycoon-game set_egs_adapter --calldata <ADAPTER>` |
| set_authorized    | Call `set_authorized_caller(<TYCOON_GAME_ADDRESS>)` on adapter |

Once Steps 1–6 are done, every game that ends via `exit_game` or `end_ai_game` will be recorded on the adapter, and the frontend will show **EGS Tracked** / **EGS Verified** when the adapter env var is set.
