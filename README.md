# Tycoon

A **Monopoly-style strategy game** on **Starknet** with **Dojo**: on-chain game state, multiplayer rooms, AI opponents, perks shop, and guest play. Built with **Next.js**, **React Three Fiber** (3D board), and a **Node/Express** backend for guest games, leaderboard, and shop.

---

## Features

- **On-chain gameplay** – Registration, game creation, joining, moves, and perks via Dojo/Cairo on Starknet (Sepolia).
- **3D board** – Interactive board with property tooltips and owner badges.
- **Multiplayer & AI** – Play with friends in rooms or challenge the AI.
- **Guest mode** – Sign in as guest (no wallet) and play; progress stored on the backend.
- **Perk shop** – Buy perks/bundles (USDC, TYC, or NGN via Flutterwave); vouchers redeemable on-chain.
- **Cartridge** – Connect with Cartridge Controller; optional session keys for gasless UX.
- **Torii** – Indexer for live game state; frontend subscribes via Dojo SDK.

---

## Project structure

```
Tyc/
├── frontend/          # Next.js 15 app (React, Dojo SDK, Starknet React, R3F)
├── backend/            # Express API (guest games, shop, auth, Socket.IO)
├── tycoon_contract/    # Dojo world (Cairo): game, player, reward systems
└── docs/               # Extra documentation
```

---

## Tech stack

| Layer        | Tech |
|-------------|------|
| **Chain**   | Starknet (Sepolia); Cartridge RPC/Controller |
| **Contracts** | Dojo, Cairo; Sozo build/migrate; Torii indexer |
| **Frontend** | Next.js, React, @dojoengine/sdk & torii-client, @starknet-react/core, React Three Fiber |
| **Backend**  | Node, Express, Knex, MySQL, Redis, Socket.IO |

---

## Prerequisites

- **Node.js** 18+
- **Sozo** (Dojo CLI) and **Katana** (local Starknet) – see [Dojo book](https://book.dojoengine.org/)
- **MySQL** and **Redis** for the backend (or use Docker)
- (Optional) **Torii** for indexing – run locally or use a deployed Torii URL

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/your-username/Tyc.git
cd Tyc
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # if present; set DB, REDIS, JWT, etc.
npm install
npm run migrate
npm run dev            # default port 3000; use PORT=3001 if frontend uses 3000
```

Set `PORT=3001` (or another port) if you run the frontend on 3000 to avoid conflicts.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Set at least:
#   NEXT_PUBLIC_TORII_URL=<your-torii-url>   # required for on-chain create/join
#   NEXT_PUBLIC_API_URL=http://localhost:3001/api   # backend API (if backend on 3001)
npm install
npm run dev            # http://localhost:3000
```

See `frontend/.env.example` for Torii, RPC, and API URL options.

### 4. Contracts (optional – for full on-chain flow)

For local development with Dojo:

```bash
# Terminal 1: local chain
katana --dev --dev.no-fee

# Terminal 2: build and migrate
cd tycoon_contract
sozo build
sozo migrate

# Start Torii (use world address from migrate output)
torii --world <WORLD_ADDRESS> --http.cors_origins "*"
```

Then point `NEXT_PUBLIC_TORII_URL` at your Torii (e.g. `http://localhost:8080`). For Sepolia, use your deployed world and Torii URL. Details: **tycoon_contract/README.md**.

---

## Scripts

| Where       | Command | Description |
|------------|---------|-------------|
| **frontend** | `npm run dev` | Next.js dev server |
| **frontend** | `npm run build` | Production build |
| **frontend** | `npm run dojo:manifest` | Generate Dojo manifest for Cartridge |
| **backend**  | `npm run dev` | Nodemon (Express) |
| **backend**  | `npm run migrate` | Knex migrations |
| **backend**  | `npm run seed` | Seed DB |
| **tycoon_contract** | `sozo build` | Build Dojo world |
| **tycoon_contract** | `sozo migrate` | Deploy to chain |
| **tycoon_contract** | `sozo test` | Cairo unit tests |

---

## Environment

- **Frontend** – Copy `frontend/.env.example` to `frontend/.env.local` and set:
  - `NEXT_PUBLIC_TORII_URL` – Torii indexer (required for on-chain create/join).
  - `NEXT_PUBLIC_API_URL` – Backend base URL (e.g. `http://localhost:3001/api`).
  - Optional: `NEXT_PUBLIC_STARKNET_RPC_URL`, relay URL, etc.
- **Backend** – Database (e.g. MySQL), Redis, JWT/Privy (if used), and any contract RPC/keys as needed.

---

## Docs

- **https://docs.provable.games** – Provable Games documentation (EGS, Loot Survivor, Budokan, etc.).
- **EGS (Embeddable Game Standard)** – [docs](https://docs.provable.games/embeddable-game-standard); Tycoon integrates via the EGS games list and Denshokan API; see `/egs-games` in the app.
- **tycoon_contract/README.md** – Dojo world, Katana/Torii, Cartridge session keys, testing.
- **tycoon_contract/docs/INTEGRATION_TEST.md** – Full integration test flow.

---

## Contributing

Contributions are welcome: open issues or PRs. For contract changes, run `sozo test` and follow the Dojo workflow in `tycoon_contract/`.
