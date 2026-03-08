"use client";

import React from "react";
import Link from "next/link";
import { useEGSGames } from "@/hooks/useEGSGames";
import { EGS_DOCS_URL, EGS_GAMES_OVERVIEW_URL, type EGSGame } from "@/lib/egs-api";
import { Gamepad2, ChevronLeft, Loader2, ExternalLink, BookOpen } from "lucide-react";

function EGSGameCard({ game }: { game: EGSGame }) {
  const name = (game.name as string) ?? `Game #${game.gameId}`;
  const address = (game.gameAddress as string) ?? "";
  const shortAddress = address ? `${address.slice(0, 10)}...${address.slice(-8)}` : "";

  return (
    <div className="rounded-2xl border border-[#0E282A] bg-[#011112]/80 hover:bg-[#0E282A]/60 hover:border-[#003B3E] transition-all p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-white truncate">{name}</h2>
          {shortAddress && (
            <p className="text-xs text-white/50 font-mono mt-1 truncate" title={address}>
              {shortAddress}
            </p>
          )}
          {(game.description as string) && (
            <p className="text-sm text-white/60 mt-2 line-clamp-2">{game.description as string}</p>
          )}
        </div>
        <Gamepad2 className="w-5 h-5 text-cyan-400/80 shrink-0" />
      </div>
    </div>
  );
}

export default function EGSGamesPage() {
  const { data, isLoading, error } = useEGSGames({ limit: 30 });

  const games = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010F10] to-[#0E1415] text-white pt-[80px] md:pt-0">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-4 pr-20 md:pr-8 md:px-8 border-b border-white/10 bg-[#010F10]/90 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold text-sm transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-cyan-400" />
          EGS Games
        </h1>
        <a
          href={EGS_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition shrink-0 flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Docs
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
        <p className="text-white/70 text-sm mb-6">
          Games built on the{" "}
          <a
            href={EGS_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
          >
            Embeddable Game Standard (EGS)
            <ExternalLink className="w-3.5 h-3.5" />
          </a>{" "}
          — composable, provable on-chain games on Starknet. Tycoon integrates with EGS; learn more at{" "}
          <a
            href="https://docs.provable.games"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline"
          >
            docs.provable.games
          </a>
          .
        </p>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 px-4 py-3 text-sm">
            Could not load EGS games. The Provable Games API may be temporarily unavailable.{" "}
            <a href={EGS_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
              View docs
            </a>
          </div>
        )}
        {!isLoading && !error && games.length === 0 && (
          <p className="text-center text-white/60 py-12">
            No EGS games in the registry yet.{" "}
            <a href={EGS_GAMES_OVERVIEW_URL} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
              Learn about EGS games
            </a>
          </p>
        )}
        {!isLoading && !error && games.length > 0 && (
          <div className="space-y-4">
            {games.map((game) => (
              <EGSGameCard key={game.gameId ?? game.gameAddress ?? Math.random()} game={game} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
