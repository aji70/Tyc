'use client';

import { useMemo } from 'react';
import { useNetwork } from '@starknet-react/core';
import { DOJO_CONTRACT_ADDRESSES } from '@/lib/dojo-contracts';
import {
  STARKNET_MAINNET_CHAIN_ID,
  STARKNET_SEPOLIA_CHAIN_ID,
  TYC_TOKEN_ADDRESS,
  USDC_TOKEN_ADDRESS,
} from '@/constants/contracts';

export function useDojoRewardTokenAddresses() {
  const { chain } = useNetwork();
  const chainId = chain?.id ?? STARKNET_SEPOLIA_CHAIN_ID;

  return useMemo(() => {
    const tycAddress = TYC_TOKEN_ADDRESS[chainId as keyof typeof TYC_TOKEN_ADDRESS] ?? undefined;
    const usdcAddress = USDC_TOKEN_ADDRESS[chainId as keyof typeof USDC_TOKEN_ADDRESS] ?? undefined;
    return {
      tycAddress: tycAddress ?? undefined,
      usdcAddress: usdcAddress ?? undefined,
      rewardAddress: DOJO_CONTRACT_ADDRESSES.reward ?? undefined,
      isLoading: false,
    };
  }, [chainId]);
}
