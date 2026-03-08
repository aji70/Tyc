# New world (Option A) — checklist

Config is set: `seed = "tycoon_sepolia_v2"` and `world_address` is commented out in `dojo_sepolia.toml`.

## 1. Deploy the new world

**Critical:** Sozo uses the existing `manifest_sepolia.json` if present. That file points at the **old** world, so Sozo would try to migrate it again and hit "Mismatch compiled class hash". Before the first migrate for a new world, remove or rename the old manifest:

```bash
cd tycoon_contract
mv manifest_sepolia.json manifest_sepolia.json.old_world.bak   # or delete it
```

Then with account env loaded:

```bash
./migrate.sh
```

This deploys a **new** world and all contracts; no "Mismatch compiled class hash" because everything is declared fresh. When it finishes, the new world address is in `tycoon_contract/manifest_sepolia.json` under `world.address`.

**If you see "error decoding response body"** — usually a transient RPC issue (timeout or rate limit during the 31 class declarations). Wait a minute and run `./migrate.sh` again; Sozo may resume or retry. If it keeps failing, try at a different time or check RPC status.

## 2. Copy manifest to frontend

So the app uses the new world and contract addresses:

From repo root (or from `frontend/`):

```bash
cd frontend && node scripts/generate-dojo-manifest.mjs
```

Or copy manually: `tycoon_contract/manifest_sepolia.json` → `frontend/lib/dojo/manifest_sepolia.json`.

## 3. Init the new world (one-time)

Run your usual init commands against the **new** world. Example (adjust to your flow):

```bash
cd tycoon_contract
# Load .env.sepolia (e.g. source .env.sepolia or use migrate.sh env)
# Game config (min_stake, stake_token, reward_contract, owner)
sozo -P sepolia execute tycoon-game init_game_config --calldata <min_stake> <stake_token> <reward_contract> <owner>
# Player config
sozo -P sepolia execute tycoon-player init_player_config --calldata <game_contract> <reward_contract> <owner>
# Reward contract init (game, player, owner, tyc, usdc, erc1155)
sozo -P sepolia execute tycoon-reward init_reward --calldata ...
# Token init
sozo -P sepolia execute tycoon-token init_token --calldata <owner>
```

Use the **new** contract addresses from `manifest_sepolia.json` where calldata references game, player, or reward contracts.

## 4. (Optional) EGS adapter

After the new world is inited, follow **EGS_DEPLOY.md** from Step 3: deploy the EGS adapter, then:

```bash
sozo -P sepolia execute tycoon-game set_egs_adapter --calldata <ADAPTER_ADDRESS>
```

Then call `set_authorized_caller(<tycoon_game_address>)` on the adapter (use the new tycoon-game address from the manifest).

## 5. Torii / indexer

If you run Torii for the old world, point it at the new world address and restart:

```bash
torii --world <NEW_WORLD_ADDRESS> --rpc <RPC_URL> ...
```

Update `NEXT_PUBLIC_TORII_URL` if the indexer URL changes.

---

**Old world:** `0x041167a2e9f249d46e52079a9eee47f75389801dd7e06fe933e275fde8fe742b` — no longer used after you switch the frontend to the new manifest.
