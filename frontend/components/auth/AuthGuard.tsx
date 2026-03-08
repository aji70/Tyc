"use client";

import React, { ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "@starknet-react/core";
import { useGuestAuthOptional } from "@/context/GuestAuthContext";
import { Wallet, User, Home, Sparkles } from "lucide-react";
import WalletConnectModal from "@/components/shared/wallet-connect-modal";

/** Paths that do not require wallet or guest sign-in (user can access anonymously). */
const PUBLIC_PATHS = [
  "/",
  "/join-room",
  "/join-room-3d",
  "/verify-email",
  "/waitlist",
  "/rooms",
  "/wasmdemo",
  "/read-demo",
];

function isPublicPath(pathname: string): boolean {
  const path = pathname?.split("?")[0] ?? "";
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Guard that ensures the user is either connected via wallet or signed in as guest
 * before allowing access to protected pages. Public paths (home, join-room, etc.) are always allowed.
 */
export default function AuthGuard({ children }: AuthGuardProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { address } = useAccount();
  const guestAuth = useGuestAuthOptional();
  const guestUser = guestAuth?.guestUser ?? null;
  const authLoading = guestAuth?.isLoading ?? true;
  const [showConnectModal, setShowConnectModal] = useState(false);

  const isPublic = isPublicPath(pathname ?? "");
  const isAuthenticated = !!address || !!guestUser;

  if (isPublic) {
    return <>{children}</>;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-[#010F10]">
        <div className="w-10 h-10 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#00F0FF]/80 font-dmSans">Checking sign-in…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-[#010F10] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
          {/* Background */}
          <div
            className="absolute inset-0 -z-10 opacity-50"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 240, 255, 0.12), transparent 50%),
                linear-gradient(180deg, #010F10 0%, #0A1618 40%, #0E1415 100%)
              `,
            }}
          />
          <div
            className="absolute inset-0 -z-10 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300F0FF' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="w-full max-w-md">
            {/* Card */}
            <div className="rounded-2xl border border-[#003B3E] bg-[#0E1415]/90 backdrop-blur-xl shadow-[0_0_40px_rgba(0,240,255,0.08)] overflow-hidden">
              <div className="p-8 md:p-10">
                <div className="flex justify-center mb-6">
                  <div className="w-14 h-14 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-[#00F0FF]" />
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#F0F7F7] text-center font-orbitron mb-2">
                  Sign in to continue
                </h1>
                <p className="text-[#869298] text-sm text-center font-dmSans mb-8">
                  Connect your wallet or sign in as a guest to use this page.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(true)}
                    className="w-full h-12 rounded-xl bg-[#00F0FF]/90 hover:bg-[#00F0FF] text-[#010F10] font-orbitron font-semibold flex items-center justify-center gap-2 transition-colors border border-[#00F0FF]/50"
                  >
                    <Wallet className="w-5 h-5" />
                    Connect Wallet
                  </button>
                  <Link
                    href="/join-room"
                    className="w-full h-12 rounded-xl border border-[#003B3E] bg-[#0E1415] hover:border-[#00F0FF]/40 hover:bg-[#022a2c]/80 text-[#00F0FF] font-dmSans font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <User className="w-5 h-5" />
                    Sign in as guest
                  </Link>
                  <Link
                    href="/"
                    className="w-full h-11 rounded-xl text-[#869298] hover:text-[#00F0FF]/90 font-dmSans text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    Go to home
                  </Link>
                </div>
              </div>
            </div>
            <p className="text-center text-[#6B8A8F] text-xs mt-6 font-dmSans">
              Use the menu to connect your wallet from any page.
            </p>
          </div>
        </div>

        <WalletConnectModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
        />
      </>
    );
  }

  return <>{children}</>;
}
