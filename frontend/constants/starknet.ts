/**
 * Starknet / Dojo Tycoon world config.
 * World address from tycoon_contract manifest_sepolia.json (deployed via sozo migrate).
 */
export const DOJO_WORLD_ADDRESS =
  process.env.NEXT_PUBLIC_DOJO_WORLD_ADDRESS ??
  '0x041167a2e9f249d46e52079a9eee47f75389801dd7e06fe933e275fde8fe742b';

export const STARKNET_CHAIN_ID = 'SN_SEPOLIA' as const;
