import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'

// Reown AppKit (WalletConnect) project ID. Set NEXT_PUBLIC_PROJECT_ID in Vercel for production.
export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID || '912f9a3279905a7dd417a7bf68e04209'

// Starknet migration: AppKit has no native Starknet; use mainnet as fallback for WagmiProvider. Chain resolution uses Starknet IDs.
export const networks = [mainnet]

/** Backend chain name. Starknet chain IDs: mainnet 0x534e5f4d41494e, Sepolia 0x534e5f5345504f4c4941. */
function chainIdToBackendChain(chainId: number): 'POLYGON' | 'STARKNET' | 'BASE' {
  if (chainId === 137 || chainId === 80001) return 'POLYGON'
  if (chainId === 0x534e5f4d41494e || chainId === 0x534e5f5345504f4c4941) return 'STARKNET'
  if (chainId === 8453 || chainId === 84531) return 'BASE'
  return 'STARKNET'
}

export const defaultNetwork = networks[0]
export const appChain = chainIdToBackendChain(defaultNetwork?.id ?? 0x534e5f5345504f4c4941)

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig
