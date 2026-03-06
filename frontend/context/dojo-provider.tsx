'use client';

import { ReactNode, useEffect, useState } from 'react';
import { DojoSdkProvider } from '@dojoengine/sdk/react';
import { dojoConfig } from '@/lib/dojo/dojoConfig';
import { setupWorld } from '@/lib/dojo/contracts.gen';
import type { SchemaType } from '@/lib/dojo/models.gen';

interface DojoProviderProps {
  children: ReactNode;
}

export function DojoProvider({ children }: DojoProviderProps) {
  const [sdk, setSdk] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeSdk() {
      const toriiUrl =
        process.env.NEXT_PUBLIC_TORII_URL ??
        (dojoConfig as { toriiUrl?: string }).toriiUrl ??
        '';

      // Solution: do not init Torii client when URL is missing → avoids "invalid content type: application/json" and 404
      if (!toriiUrl || !toriiUrl.trim()) {
        setSdk(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { init } = await import('@dojoengine/sdk');

        const relayUrl =
          process.env.NEXT_PUBLIC_RELAY_URL ??
          (dojoConfig as { relayUrl?: string }).relayUrl ??
          '';
        const worldAddress = dojoConfig.manifest.world.address;

        const sdkInstance = await init<SchemaType>({
          client: {
            toriiUrl: toriiUrl.trim(),
            relayUrl,
            worldAddress,
          },
          domain: {
            name: 'Tycoon',
            revision: '1.0.0',
            chainId: 'SN_SEPOLIA',
            version: '1.0.0',
          },
        });

        setSdk(sdkInstance);
      } catch (err) {
        console.error('Failed to initialize Dojo SDK:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    initializeSdk();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading Dojo SDK...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-400">
        <div>Dojo SDK error: {error}</div>
      </div>
    );
  }

  // When Torii URL was missing we skipped init; render children without Dojo SDK so no Torii calls run
  if (sdk === null && !isLoading) {
    return <>{children}</>;
  }

  return (
    <DojoSdkProvider sdk={sdk} dojoConfig={dojoConfig} clientFn={setupWorld}>
      {children}
    </DojoSdkProvider>
  );
}
