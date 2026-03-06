![Dojo Starter](./assets/cover.png)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/mark-dark.svg">
  <img alt="Dojo logo" align="right" width="120" src=".github/mark-light.svg">
</picture>

<a href="https://x.com/ohayo_dojo">
<img src="https://img.shields.io/twitter/follow/dojostarknet?style=social"/>
</a>
<a href="https://github.com/dojoengine/dojo/stargazers">
<img src="https://img.shields.io/github/stars/dojoengine/dojo?style=social"/>
</a>

[![discord](https://img.shields.io/badge/join-dojo-green?logo=discord&logoColor=white)](https://discord.com/invite/dojoengine)
[![Telegram Chat][tg-badge]][tg-url]

[tg-badge]: https://img.shields.io/endpoint?color=neon&logo=telegram&label=chat&style=flat-square&url=https%3A%2F%2Ftg.sumanjay.workers.dev%2Fdojoengine
[tg-url]: https://t.me/dojoengine

# Tycoon (Dojo)

Dojo port of the Solidity Tycoon game: self-service registration, game lifecycle, rewards, and TYC token.

## Cartridge session keys (gasless / sign on behalf)

[Cartridge Controller](https://docs.cartridge.gg/controller/sessions) supports **session keys** so the game can sign transactions on behalf of users (e.g. gasless, no prompt per action). **No contract changes are required** for this to work.

- Session validation happens in the **account contract** (Controller), not in the Tycoon world.
- When a user approves a session, the **account contract** still executes calls; `get_caller_address()` in our systems remains the **user’s account address** (their Cartridge wallet).
- To enable sessions from your frontend, define **policies** that list this world’s system contract addresses and the entrypoints you need (e.g. `register_player`, `create_game`, `join_game`, `leave_pending_game`, `exit_game`, `redeem_voucher`, `buy_collectible`, `burn_collectible_for_perk`). Users approve once; later calls that match the policy can be executed without a new signature.

Example policy shape (use your deployed contract addresses):

```ts
const policies = {
  contracts: {
    "<tycoon-player-address>": {
      name: "Tycoon Player",
      methods: [
        { name: "Register", entrypoint: "register_player" },
      ],
    },
    "<tycoon-game-address>": {
      name: "Tycoon Game",
      methods: [
        { name: "Create Game", entrypoint: "create_game" },
        { name: "Join Game", entrypoint: "join_game" },
        { name: "Leave Pending", entrypoint: "leave_pending_game" },
        { name: "Exit Game", entrypoint: "exit_game" },
      ],
    },
    "<tycoon-reward-address>": {
      name: "Tycoon Reward",
      methods: [
        { name: "Redeem Voucher", entrypoint: "redeem_voucher" },
        { name: "Buy Collectible", entrypoint: "buy_collectible" },
        { name: "Burn for Perk", entrypoint: "burn_collectible_for_perk" },
      ],
    },
  },
};
```

See [Cartridge Sessions](https://docs.cartridge.gg/controller/sessions) and [Dojo + Telegram (Cartridge)](https://book.dojoengine.org/client/sdk/telegram) for full details.

---

## Testing

- **Cairo unit tests**: run `sozo test` (or `scarb run test`) from the contract directory. No chain needed. Covers enums and game helpers (see `src/tests/test_world.cairo`, `src/systems/game.cairo`, `src/model/reward_model.cairo`).
- **Test register / create game scripts** (`scarb run register`, `scarb run join_game`, etc.): these call **http://localhost:5050**. If you see *error sending request for url (http://localhost:5050/)*, start the chain first:
  1. **Terminal 1**: `katana --dev --dev.no-fee`
  2. **Terminal 2**: `cd tycoon_contract && scarb run migrate` (then once: init_player_config and init_game_config via sozo execute; see docs/INTEGRATION_TEST.md)
  3. Then run `scarb run register` (registers "alice") or `scarb run register_then_create_ai`
- **Full integration flow**: see **docs/INTEGRATION_TEST.md**.

---

## Running locally

#### Terminal one (Make sure this is running)

```bash
# Run Katana
katana --dev --dev.no-fee
```

#### Terminal two

```bash
# Build the example
sozo build

# Inspect the world
sozo inspect

# Migrate the example
sozo migrate

# Start Torii
# Replace <WORLD_ADDRESS> with the address of the deployed world from the previous step
torii --world <WORLD_ADDRESS> --http.cors_origins "*"
```

## Docker
You can start stack using docker compose. [Here are the installation instruction](https://docs.docker.com/engine/install/)

```bash
docker compose up
```
You'll get all services logs in the same terminal instance. Whenever you want to stop just ctrl+c

---

## Contribution

1. **Report a Bug**

    - If you think you have encountered a bug, and we should know about it, feel free to report it [here](https://github.com/dojoengine/dojo-starter/issues) and we will take care of it.

2. **Request a Feature**

    - You can also request for a feature [here](https://github.com/dojoengine/dojo-starter/issues), and if it's viable, it will be picked for development.

3. **Create a Pull Request**
    - It can't get better then this, your pull request will be appreciated by the community.

Happy coding!
