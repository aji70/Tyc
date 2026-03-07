/**
 * Tycoon Dojo contract addresses and view ABIs for direct RPC reads.
 * Addresses from manifest_sepolia.json.
 */
import manifest from './dojo/manifest_sepolia.json';

type ContractInfo = { tag: string; address: string };
const contracts = (manifest as { contracts?: ContractInfo[] }).contracts ?? [];

function getAddress(tag: string): string {
  const c = contracts.find((x) => x.tag === tag);
  return c?.address?.trim() ?? '';
}

export const DOJO_CONTRACT_ADDRESSES = {
  world: (manifest as { world?: { address?: string } }).world?.address?.trim() ?? '0x41167a2e9f249d46e52079a9eee47f75389801dd7e06fe933e275fde8fe742b',
  game: getAddress('tycoon-game') || '0x5a31a881755ac573ede94e35d6c16e72d3892745d2600f352b5e956fde817f',
  player: getAddress('tycoon-player') || '0x29dff7a557a1179b8c2ae9e79d82b4eeadb2d007011310e0b7b03327b074bbf',
  reward: getAddress('tycoon-reward') || '0x1de57e19e93759eb4f183dfa732d85a6974dd70fede81ff6cfe7aa5f46cb85f',
  token: getAddress('tycoon-token') || '0x4097e6b0de5527a59f8d27c6fc5175186f895f4470807799db3635b369a8a4d',
} as const;

export const PLAYER_VIEW_ABI = [
  { type: 'function', name: 'get_username', inputs: [{ name: 'address', type: 'felt' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
  { type: 'function', name: 'is_registered', inputs: [{ name: 'address', type: 'felt' }], outputs: [{ type: 'bool' }], state_mutability: 'view' },
  { type: 'function', name: 'get_user', inputs: [{ name: 'username', type: 'felt' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
] as const;

export const GAME_VIEW_ABI = [
  { type: 'function', name: 'get_game', inputs: [{ name: 'game_id', type: 'u256' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
  { type: 'function', name: 'get_game_by_code', inputs: [{ name: 'code', type: 'felt' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
  { type: 'function', name: 'get_game_player', inputs: [{ name: 'game_id', type: 'u256' }, { name: 'player', type: 'felt' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
  { type: 'function', name: 'get_game_settings', inputs: [{ name: 'game_id', type: 'u256' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
  { type: 'function', name: 'get_players_in_game', inputs: [{ name: 'game_id', type: 'u256' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
  { type: 'function', name: 'get_last_game_code', inputs: [{ name: 'account', type: 'felt' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
] as const;

export const REWARD_VIEW_ABI = [
  { type: 'function', name: 'balance_of', inputs: [{ name: 'owner', type: 'felt' }, { name: 'token_id', type: 'u256' }], outputs: [{ type: 'u256' }], state_mutability: 'view' },
  { type: 'function', name: 'get_cash_tier_value', inputs: [{ name: 'tier', type: 'u8' }], outputs: [{ type: 'u256' }], state_mutability: 'view' },
  { type: 'function', name: 'get_collectible_info', inputs: [{ name: 'token_id', type: 'u256' }], outputs: [{ type: 'felt' }], state_mutability: 'view' },
] as const;
