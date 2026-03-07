import "@/styles/globals.css";
import { getMetadata } from "@/utils/getMeatadata";
import { headers } from "next/headers";
import { minikitConfig } from "../minikit.config";
import type { Metadata } from "next";
import { LayoutSwitcher } from "@/components/LayoutSwitcher";

// Run before React: (1) Reload board when restored from bfcache so WebGL is fresh. (2) Disable bfcache on board so back button does full load instead of restore (avoids Context Lost + .style crash).
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

// Prevents "externalDetectWallets is not a function" when Cartridge/wallet code expects it on window
// or on the injected wallet object. Run first in head; keep patching for 15s to catch late-injected wallets.
// Recursively patches connectors, providers, and nested starknet objects.
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

// Remove the duplicate 'cookies' global variable—it's not needed

export async function generateMetadata(): Promise<Metadata> {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie"); // Local var is fine here
  return {
    title: "Tycoon",
    description:
      "Tycoon is a decentralized on-chain game inspired by the classic Monopoly game, built on Starknet. It allows players to buy, sell, and trade digital properties in a trustless gaming environment.",
    other: {
      "talentapp:project_verification":
        "5d078ddf22e877e4b4a4508b55b82c826e0b7d2bef4d1505b4b14945a216f62eaf013de3c9fe99c4fd58ae7fc896455a9ada31130565d32c8a5eb785b394113a",
      "base:app_id": "695d328c3ee38216e9af4359", 
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        images: {
          url: minikitConfig.miniapp.heroImageUrl,
          alt: "Tycoon - Monopoly Game Onchain",
        },
        button: {
          title: `Play ${minikitConfig.miniapp.name} `,
          action: {
            name: `Launch ${minikitConfig.miniapp.name}`,
            type: "launch_frame",
          },
        },
      }),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie"); // Local var—no need for global

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Run first so Cartridge/injected wallets get externalDetectWallets before any other script */}
        <script dangerouslySetInnerHTML={{ __html: EXTERNAL_DETECT_WALLETS_SHIM }} />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,100..1000&family=Krona+One&family=Orbitron:wght@400;500;700&display=swap"
        />
      </head>
      <body className="antialiased bg-[#010F10] w-full">
        <LayoutSwitcher cookies={cookies}>{children}</LayoutSwitcher>
      </body>
    </html>
  );
}