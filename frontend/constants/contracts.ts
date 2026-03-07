// constants/contracts.ts
import { Address } from 'viem';

// Starknet chain IDs (mainnet, Sepolia)
export const STARKNET_MAINNET_CHAIN_ID = 0x534e5f4d41494e;
export const STARKNET_SEPOLIA_CHAIN_ID = 0x534e5f5345504f4c4941;

// This frontend is Starknet-only.
export const TYCOON_CONTRACT_ADDRESSES: Record<number, Address | undefined> = {
  [STARKNET_MAINNET_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET as Address,
  [STARKNET_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_SEPOLIA as Address,
};
export const REWARD_CONTRACT_ADDRESSES: Record<number, Address | undefined> = {
  [STARKNET_MAINNET_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_REWARD as Address,
  [STARKNET_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_REWARD as Address,
};
/** TYC token address (must be the token contract, not the reward contract). Use useRewardTokenAddresses() in shop for addresses that match the reward contract. */
export const TYC_TOKEN_ADDRESS: Record<number, Address | undefined> = {
  [STARKNET_MAINNET_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_TYC as Address | undefined,
  [STARKNET_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_TYC as Address | undefined,
};

export const USDC_TOKEN_ADDRESS: Record<number, Address | undefined> = {
  [STARKNET_MAINNET_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_USDC as Address,
  [STARKNET_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_USDC as Address,
};

export const AI_AGENT_REGISTRY_ADDRESSES: Record<number, Address | undefined> = {
  [STARKNET_MAINNET_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_AI_REGISTRY as Address,
  [STARKNET_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_AI_REGISTRY as Address,
};

/** Tournament escrow (entry fees + prize pool). ABI: context/abi/TycoonTournamentEscrow.json */
export const TOURNAMENT_ESCROW_ADDRESSES: Record<number, Address | undefined> = {
  [STARKNET_MAINNET_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_TOURNAMENT_ESCROW as Address | undefined,
  [STARKNET_SEPOLIA_CHAIN_ID]: process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_TOURNAMENT_ESCROW as Address | undefined,
};

export const MINIPAY_CHAIN_IDS = [STARKNET_MAINNET_CHAIN_ID]; // Starknet Mainnet

/** ERC-8004 Agent Trust Protocol (legacy EVM). Starknet uses Dojo. */
export const ERC8004_REPUTATION_REGISTRY_ADDRESSES: Record<number, Address | undefined> = {
  [STARKNET_MAINNET_CHAIN_ID]: (process.env.NEXT_PUBLIC_ERC8004_REPUTATION as Address) || ('0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as Address),
  [STARKNET_SEPOLIA_CHAIN_ID]: (process.env.NEXT_PUBLIC_ERC8004_REPUTATION as Address) || ('0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as Address),
};
export const ERC8004_IDENTITY_REGISTRY_ADDRESS = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as Address;