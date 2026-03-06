/**
 * Cartridge session key policies for Tycoon.
 * When users connect with these policies, they approve the game to sign on their behalf
 * for the listed entrypoints (gasless / no prompt per action).
 *
 * Contract addresses must match the deployed Tycoon world (manifest_sepolia.json).
 * Update these if you redeploy.
 */
import type { SessionPolicies } from '@cartridge/controller';

const TYCOON_PLAYER =
  process.env.NEXT_PUBLIC_TYCOON_PLAYER_ADDRESS ??
  '0x29dff7a557a1179b8c2ae9e79d82b4eeadb2d007011310e0b7b03327b074bbf';
const TYCOON_GAME =
  process.env.NEXT_PUBLIC_TYCOON_GAME_ADDRESS ??
  '0x5a31a881755ac573ede94e35d6c16e72d3892745d2600f352b5e956fde817f';
const TYCOON_REWARD =
  process.env.NEXT_PUBLIC_TYCOON_REWARD_ADDRESS ??
  '0x1de57e19e93759eb4f183dfa732d85a6974dd70fede81ff6cfe7aa5f46cb85f';
const TYCOON_TOKEN =
  process.env.NEXT_PUBLIC_TYCOON_TOKEN_ADDRESS ??
  '0x4097e6b0de5527a59f8d27c6fc5175186f895f4470807799db3635b369a8a4d';

export const TYCOON_SESSION_POLICIES: SessionPolicies = {
  contracts: {
    [TYCOON_PLAYER]: {
      name: 'Tycoon Player',
      description: 'Register and manage your player',
      methods: [
        { name: 'Register Player', entrypoint: 'register_player' },
      ],
    },
    [TYCOON_GAME]: {
      name: 'Tycoon Game',
      description: 'Create, join, and manage games',
      methods: [
        { name: 'Create Game', entrypoint: 'create_game' },
        { name: 'Create AI Game', entrypoint: 'create_ai_game' },
        { name: 'Join Game', entrypoint: 'join_game' },
        { name: 'Leave Pending Game', entrypoint: 'leave_pending_game' },
        { name: 'Exit Game', entrypoint: 'exit_game' },
        { name: 'End AI Game', entrypoint: 'end_ai_game' },
        { name: 'Transfer Property', entrypoint: 'transfer_property_ownership' },
      ],
    },
    [TYCOON_REWARD]: {
      name: 'Tycoon Reward',
      description: 'Shop and collectibles',
      methods: [
        { name: 'Redeem Voucher', entrypoint: 'redeem_voucher' },
        { name: 'Buy Collectible', entrypoint: 'buy_collectible' },
        { name: 'Buy Collectible Batch', entrypoint: 'buy_collectible_batch' },
        { name: 'Burn for Perk', entrypoint: 'burn_collectible_for_perk' },
      ],
    },
    [TYCOON_TOKEN]: {
      name: 'Tycoon TYC Token',
      description: 'Transfer and approve TYC',
      methods: [
        { name: 'Transfer', entrypoint: 'transfer' },
        { name: 'Approve', entrypoint: 'approve' },
      ],
    },
  },
};
