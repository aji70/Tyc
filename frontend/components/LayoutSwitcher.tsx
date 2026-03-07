'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import ContextProvider from '@/context';
import { TycoonProvider } from '@/context/ContractProvider';
import { GuestAuthProvider } from '@/context/GuestAuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SocketProvider } from '@/context/SocketContext';
import { TournamentProvider } from '@/context/TournamentContext';
import { Toaster } from 'react-hot-toast';
import FarcasterReady from '@/components/FarcasterReady';
import Script from 'next/script';
import ClientLayout from '@/clients/ClientLayout';
import QueryProvider from '@/app/QueryProvider';
import BfcacheReloadGuard from '@/components/BfcacheReloadGuard';
import { LayoutBody } from '@/app/layout-body';
import ScrollToTopBtn from '@/components/shared/scroll-to-top-btn';

const BFCACHE_RELOAD_SCRIPT = `
(function(){
  var boardPath = /\\/board-3d-(mobile|multi-mobile)(\\/|$)/;
  function isBoard() { return boardPath.test(window.location.pathname); }
  window.addEventListener('pageshow', function(e) {
    if (e.persisted && isBoard()) { window.location.reload(); }
  });
  if (isBoard()) {
    window.addEventListener('unload', function() {});
  }
})();
`;

const EXTERNAL_DETECT_WALLETS_SHIM = `
(function(){
  if (typeof window === 'undefined') return;
  var noop = function externalDetectWallets() {};
  if (typeof window.externalDetectWallets !== 'function') {
    try { Object.defineProperty(window, 'externalDetectWallets', { value: noop, writable: true, configurable: true }); }
    catch (e) { window.externalDetectWallets = noop; }
  }
  function isConnectorLike(obj) {
    return obj && typeof obj === 'object' && typeof obj.connect === 'function' && typeof obj.disconnect === 'function';
  }
  function patch(obj, depth) {
    if (!obj || typeof obj !== 'object' || (depth || 0) > 5) return;
    if (isConnectorLike(obj) || typeof obj.connect === 'function') {
      if (typeof obj.externalDetectWallets !== 'function') {
        try { obj.externalDetectWallets = noop; } catch (e) {}
        try { Object.defineProperty(obj, 'externalDetectWallets', { value: noop, writable: true, configurable: true }); } catch (e) {}
      }
    }
    if (typeof obj.externalDetectWallets !== 'function') {
      try { obj.externalDetectWallets = noop; } catch (e) {}
      try { Object.defineProperty(obj, 'externalDetectWallets', { value: noop, writable: true, configurable: true }); } catch (e) {}
    }
    var keys = ['connectors','connector','providers','provider','options','wallets','accounts'];
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v && typeof v === 'object') { patch(v, (depth || 0) + 1); }
      if (Array.isArray(v)) for (var j = 0; j < v.length; j++) patch(v[j], (depth || 0) + 1);
    }
  }
  function patchAll() {
    try {
      patch(window.starknet, 0);
      for (var k in window) {
        if ((k.indexOf('starknet_') === 0 || k === 'starknet') && window[k]) patch(window[k], 0);
      }
      if (window.starknet && typeof window.starknet === 'object') {
        var arr = window.starknet;
        if (Array.isArray(arr)) for (var i = 0; i < arr.length; i++) patch(arr[i], 0);
      }
    } catch (e) {}
  }
  patchAll();
  var count = 0;
  var id = setInterval(function() { patchAll(); if (++count >= 75) clearInterval(id); }, 200);
  if (document.readyState !== 'complete') {
    window.addEventListener('load', function() { patchAll(); });
  }
  document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') patchAll(); });
})();
`;

/** Canvas route: no Cartridge/LayoutBody so R3F runs in isolation and avoids ReactCurrentBatchConfig. */
const CANVAS_ROUTE = '/board-3d-canvas';

export function LayoutSwitcher({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const pathname = usePathname();

  if (pathname === CANVAS_ROUTE) {
    return (
      <div className="min-h-screen bg-[#010F10] w-full" suppressHydrationWarning>
        {children}
      </div>
    );
  }

  return (
    <>
      <Script id="bfcache-reload" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: BFCACHE_RELOAD_SCRIPT }} />
      <Script id="external-detect-wallets-shim-body" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: EXTERNAL_DETECT_WALLETS_SHIM }} />
      <FarcasterReady />
      <ContextProvider cookies={cookies}>
        <LayoutBody>
          <TycoonProvider>
            <GuestAuthProvider>
              <TournamentProvider>
                <QueryProvider>
                  <BfcacheReloadGuard />
                  <ClientLayout cookies={cookies}>
                    {children}
                  </ClientLayout>
                  <ScrollToTopBtn />
                  <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="dark"
                    toastStyle={{
                      fontFamily: 'Orbitron, sans-serif',
                      background: '#0E1415',
                      color: '#00F0FF',
                      border: '1px solid #003B3E',
                    }}
                  />
                  <Toaster position="top-center" />
                </QueryProvider>
              </TournamentProvider>
            </GuestAuthProvider>
          </TycoonProvider>
        </LayoutBody>
      </ContextProvider>
    </>
  );
}
