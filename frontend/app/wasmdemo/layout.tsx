'use client';

/**
 * Tycoon Dojo wasmdemo layout.
 * Wraps with StarknetDojoProviders so Dojo SDK hooks (useDojoPlayerActions, etc.) work.
 */
import { StarknetDojoProviders } from '@/components/StarknetDojoProviders';

export default function WasmdemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StarknetDojoProviders>{children}</StarknetDojoProviders>;
}
