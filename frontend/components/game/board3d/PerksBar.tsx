'use client';

import React from "react";
import { useDojoOwnedPerks } from "@/hooks/dojo/useDojoOwnedPerks";
import { Zap, Crown, Coins, Sparkles, Gem, Shield, Percent, CircleDollarSign, MapPin } from "lucide-react";

const PERK_ICONS: Record<number, React.ReactNode> = {
  1: <Zap className="w-4 h-4" />,
  2: <Crown className="w-4 h-4" />,
  3: <Coins className="w-4 h-4" />,
  4: <Sparkles className="w-4 h-4" />,
  5: <Gem className="w-4 h-4" />,
  6: <Zap className="w-4 h-4" />,
  7: <Shield className="w-4 h-4" />,
  8: <Coins className="w-4 h-4" />,
  9: <Gem className="w-4 h-4" />,
  10: <Sparkles className="w-4 h-4" />,
  11: <Percent className="w-4 h-4" />,
  12: <CircleDollarSign className="w-4 h-4" />,
  13: <Sparkles className="w-4 h-4" />,
  14: <MapPin className="w-4 h-4" />,
};

const PERK_NAMES: Record<number, string> = {
  1: "Extra Turn",
  2: "Jail Free",
  3: "Double Rent",
  4: "Roll Boost",
  5: "Instant Cash",
  6: "Teleport",
  7: "Shield",
  8: "Discount",
  9: "Tax Refund",
  10: "Exact Roll",
  11: "Rent Cashback",
  12: "Interest",
  13: "Lucky 7",
  14: "Free Parking Bonus",
};

interface PerksBarProps {
  onOpenModal: () => void;
  onUsePerk?: (tokenId: bigint, perk: number, strength: number, name: string) => void;
  className?: string;
}

export default function PerksBar({ onOpenModal, onUsePerk, className = "" }: PerksBarProps) {
  const { address, perksGrouped } = useDojoOwnedPerks();

  if (!address || perksGrouped.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpenModal}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/40 bg-violet-950/30 text-violet-200/80 hover:bg-violet-900/40 hover:border-violet-400/50 transition-colors text-sm font-medium ${className}`}
        aria-label="View perks"
      >
        <Sparkles className="w-4 h-4" />
        <span>Perks</span>
      </button>
    );
  }

  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      role="region"
      aria-label="Perks bar"
    >
      {perksGrouped.map(({ perk, count, tokenId, strength }) => (
        <button
          key={perk}
          type="button"
          onClick={() => (onUsePerk ? onUsePerk(tokenId, perk, strength, PERK_NAMES[perk] ?? `Perk ${perk}`) : onOpenModal())}
          title={`${PERK_NAMES[perk] ?? `Perk ${perk}`}${count > 1 ? ` (×${count})` : ""}`}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600/90 to-fuchsia-600/80 border border-violet-400/50 text-white hover:scale-105 hover:border-violet-300/70 active:scale-95 transition-transform shadow-md"
        >
          {PERK_ICONS[perk] ?? <Sparkles className="w-4 h-4" />}
          {count > 1 && (
            <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-md bg-slate-900/95 border border-violet-400/60 text-[9px] font-bold text-violet-200 flex items-center justify-center">
              ×{count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
