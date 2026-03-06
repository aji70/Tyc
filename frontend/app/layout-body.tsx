/**
 * Wrapper used by root layout. Default: passthrough (no Dojo/Starknet) so the build
 * succeeds (Dojo's torii-wasm can trigger webpack WASM parse errors on some setups).
 * To enable Starknet/Dojo: in layout.tsx use StarknetDojoProviders instead of LayoutBody.
 */
import { ReactNode } from "react";

export function LayoutBody({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
