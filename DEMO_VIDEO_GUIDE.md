# Tycoon — Demo Video Guide

Step-by-step outline for recording a demo video. Adjust timing and depth as needed.

---

## Pre-recording

- [ ] Backend, frontend, and Torii (if used) running
- [ ] Wallet connected (Cartridge or compatible)
- [ ] Game world deployed on Sepolia; manifest in frontend
- [ ] EGS adapter deployed and configured (optional; enables EGS Tracked / EGS Verified badge)

---

## 1. Intro (30–60 sec)

**Show:** Project name and tagline

**Say:**
- "Tycoon is a Monopoly-style strategy game on Starknet."
- Built with Dojo and Cairo for on-chain game logic, plus Next.js and React Three Fiber for the 3D board.
- Integrates with the Embeddable Game Standard (EGS) for verifiable on-chain results.

---

## 2. Landing / Home (30 sec)

**Show:** Landing page, navigation

**Highlight:**
- Clean layout, how to start or join a game
- Guest play vs wallet connect

---

## 3. Game Creation (1 min)

**Show:** Create game flow

**Steps:**
1. Connect wallet (or use guest)
2. Create game (choose mode: Public/Private, number of players, stake if staked games)
3. Get game code / invite link
4. Point out **EGS Tracked** badge in the chat sidebar (blue) — "This game is tracked by EGS and will be verified on-chain when it ends"

---

## 4. Multiplayer Flow (1–2 min)

**Show:** Join and play

**Steps:**
1. Share code or link; second player joins
2. Start game when everyone is ready
3. Walk through a few turns:
   - Roll dice
   - Land on property
   - Buy or auction
   - Build houses
4. Show property tooltips, owner badges, 3D board interaction

**Say:**
- Moves are sent to the Dojo world on Starknet
- Game state is indexed by Torii and reflected in real time

---

## 5. AI Mode (45 sec)

**Show:** Create AI game and play

**Steps:**
1. Create AI game (select number of AI opponents)
2. Play through a few turns
3. End game and show payout (if applicable)

**Say:**
- AI games are fully on-chain; no backend required for core logic
- Results are recorded for EGS verification when the game ends

---

## 6. EGS Verification (30–45 sec)

**Show:** EGS Tracked → EGS Verified

**Steps:**
1. Open a game that has ended (or finish one live)
2. Point out **EGS Verified** badge (green) with score (e.g. "1–0")
3. Explain: "This means the result is stored on-chain via the EGS adapter. EGS-compatible platforms can discover and index Tycoon games."

**Optional:** Show `/egs-games` page if you have it listing EGS-registered games.

---

## 7. Perks & Rewards (30 sec)

**Show:** Shop and collectibles

**Highlight:**
- Perks shop (USDC, TYC, or NGN via Flutterwave)
- Vouchers and collectibles
- Redeeming on-chain

---

## 8. Tech Stack Summary (30 sec)

**Show:** Architecture or code snippet (optional)

**Say:**
- Starknet + Dojo for on-chain logic
- Next.js + React Three Fiber for 3D frontend
- Node/Express backend for guest games, shop, and auth
- Torii for indexing
- EGS (Embeddable Game Standard) for verifiable game results

---

## 9. Outro (15 sec)

**Say:**
- "Tycoon — Monopoly on Starknet with EGS support."
- Mention links: repo, docs, Provable Games.

---

## Quick Reference — Key Talking Points

| Topic | Point |
|-------|-------|
| **On-chain** | Game state, moves, and results live on Starknet via Dojo |
| **EGS** | EGS Tracked (blue) during game; EGS Verified (green) after; results verifiable by EGS platforms |
| **3D** | Interactive board with React Three Fiber |
| **Modes** | Multiplayer rooms, AI opponents, guest play |
| **Stack** | Dojo, Cairo, Next.js, R3F, Torii, Cartridge |

---

## Checklist Before Publish

- [ ] Audio clear; no background noise
- [ ] Wallet addresses / keys not visible
- [ ] Demo uses testnet (Sepolia)
- [ ] EGS badge visible in at least one segment
