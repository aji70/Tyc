/**
 * WASM Loading Utilities
 * Provides helper functions for loading and initializing WebAssembly modules.
 * Used by the Tycoon Dojo wasmdemo page.
 */

export interface WasmModule {
  instance: WebAssembly.Instance;
  module: WebAssembly.Module;
}

/**
 * Check if WebAssembly is supported in the current environment
 */
export function isWasmSupported(): boolean {
  return typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function';
}

/**
 * Get WASM capabilities of the current environment
 */
export function getWasmCapabilities() {
  return {
    supported: isWasmSupported(),
    streaming: typeof WebAssembly !== 'undefined' && 'instantiateStreaming' in WebAssembly,
    threads: typeof SharedArrayBuffer !== 'undefined',
    simd: (() => {
      try {
        return typeof WebAssembly !== 'undefined' && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      } catch {
        return false;
      }
    })(),
  };
}
