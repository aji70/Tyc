# Tycoon — Project Summary

Tycoon is a **Monopoly-style strategy game** on **Starknet**, built with **Dojo** and **Cairo** for on-chain game logic, **Next.js** and **React Three Fiber** for the 3D frontend, and a **Node/Express** backend for guest games, leaderboard, and shop. It integrates with the **Embeddable Game Standard (EGS)** for verifiable on-chain game results.

---

## Key Features

- **On-chain gameplay** — Registration, game creation, joining, moves, and perks via Dojo on Starknet (Sepolia)
- **3D board** — Interactive Monopoly-style board with property tooltips and owner badges
- **Multiplayer & AI** — Play with friends in rooms or challenge AI opponents
- **Guest mode** — Play without a wallet; progress stored on the backend
- **Perk shop** — Purchase perks and collectibles (USDC, TYC, or NGN via Flutterwave)
- **EGS integration** — On-chain game results stored via EGS adapter for discovery and verification

---

## EGS (Embeddable Game Standard)

Tycoon implements the **Embeddable Game Standard** from Provable Games so that game results are recorded on-chain and can be discovered and verified by EGS-compatible platforms (e.g. Denshokan).

### How EGS Works in Tycoon

1. **TycoonEGS adapter** — A standalone Starknet contract that implements `IMinigameTokenData` (score, game_over) and SRC5.
2. **On game end** — When a game finishes via `exit_game` or `end_ai_game`, the Tycoon game system calls `record_result(game_id, score)` on the adapter.
3. **UI badges** — The chat sidebar shows:
   - **EGS Tracked** (blue) while the game is in progress
   - **EGS Verified** (green) with score (e.g. "1-0") after the game is finalized on-chain
4. **Verification** — EGS platforms can query the adapter for score and game_over by game id, enabling leaderboards and verification.

### Tech Details

- Adapter: `tycoon_TycoonEGS` (Cairo), deployed separately from the Dojo world
- Config: `EgsConfig` singleton in the Dojo world stores the adapter address
- Authorization: Only the Tycoon game contract can call `record_result`
- Docs: See `tycoon_contract/EGS_DEPLOY.md` for deployment steps

---

## Tech Stack

| Layer       | Technology |
|------------|------------|
| **Chain**  | Starknet (Sepolia); Cartridge RPC / Controller |
| **Contracts** | Dojo, Cairo; Sozo build/migrate; Torii indexer |
| **Frontend** | Next.js, React, @dojoengine/sdk, starknet-react, React Three Fiber |
| **Backend**  | Node, Express, Knex, MySQL, Redis, Socket.IO |

---

## Project Structure

```
Tyc/
├── frontend/          # Next.js 15 app (Dojo SDK, Starknet, R3F)
├── backend/           # Express API (guest games, shop, auth)
├── tycoon_contract/   # Dojo world (game, player, reward, EGS adapter)
└── docs/              # Documentation
```

---

## Links

- **Provable Games / EGS** — [docs.provable.games](https://docs.provable.games)
- **Embeddable Game Standard** — [docs.provable.games/embeddable-game-standard](https://docs.provable.games/embeddable-game-standard)
- **Dojo** — [book.dojoengine.org](https://book.dojoengine.org)
