"use client";

import { useMediaQuery } from "@/components/useMediaQuery";
import PlayWithAI3D from "@/components/settings/game-ai-3d";
import PlayWithAI3DMobile from "@/components/settings/game-ai-3d-mobile";
import { useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import { useIsRegisteredOnChain } from "@/hooks/useAllDojoReads";
import { Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

const REGISTRATION_CHECK_TIMEOUT_MS = 12_000;

/** New page: AI game settings that redirect to 3D board. Does not edit production play-ai or rewards. */
export default function PlayAI3DPage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const router = useRouter();
  const { address } = useAccount();
  const [registrationTimedOut, setRegistrationTimedOut] = useState(false);

  const {
    isRegisteredOnChain: isUserRegistered,
    isLoading: isRegisteredLoading,
    error: registrationError,
  } = useIsRegisteredOnChain(address ?? undefined);

  useEffect(() => {
    if (!isRegisteredLoading) {
      setRegistrationTimedOut(false);
      return;
    }
    const t = setTimeout(() => setRegistrationTimedOut(true), REGISTRATION_CHECK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isRegisteredLoading]);

  if (isRegisteredLoading && !registrationTimedOut) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-[#0E282A] via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4 text-cyan-300">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
        <p className="text-xl font-orbitron">Checking registration...</p>
      </div>
    );
  }

  if (registrationError || registrationTimedOut) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-[#0E282A] via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-8 px-8 text-center">
        <AlertCircle className="w-20 h-20 text-cyan-400/80" />
        <div>
          <h2 className="text-3xl font-bold text-white mb-4 font-orbitron">
            Couldn’t verify registration
          </h2>
          <p className="text-lg text-slate-300 max-w-md">
            {registrationTimedOut
              ? "The check is taking longer than usual. Connect your wallet and try again, or go back home."
              : "We couldn’t verify your wallet registration. Try again or go to the home page."}
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold rounded-xl border-2 border-cyan-400/50 transition-all transform hover:scale-105"
        >
          Go to Home Page
        </button>
      </div>
    );
  }

  if (!isRegisteredLoading && isUserRegistered === false) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-[#0E282A] via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-8 px-8 text-center">
        <AlertCircle className="w-20 h-20 text-cyan-400/80" />
        <div>
          <h2 className="text-3xl font-bold text-white mb-4 font-orbitron">
            Registration Required
          </h2>
          <p className="text-lg text-slate-300 max-w-md">
            You need to register your wallet before creating a 3D AI game.
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-900 font-bold rounded-xl border-2 border-cyan-400/50 transition-all transform hover:scale-105"
        >
          Go to Home Page
        </button>
      </div>
    );
  }

  return (
    <main className="w-full overflow-x-hidden min-h-screen bg-gradient-to-br from-[#0E282A] via-slate-900 to-slate-950">
      {isMobile ? <PlayWithAI3DMobile /> : <PlayWithAI3D />}
    </main>
  );
}
