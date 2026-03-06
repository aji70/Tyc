'use client';

/**
 * App auth hook for the Dojo/Starknet frontend.
 * We do not use Privy; this returns a stub so components that previously
 * used usePrivy() keep working (wallet/guest flows only).
 */
export function useAppAuth() {
  return {
    ready: true,
    authenticated: false,
    login: () => {},
    logout: () => {},
    user: null as { id?: string; email?: { address?: string } | string } | null,
    getAccessToken: async (): Promise<string | null> => null,
  };
}
