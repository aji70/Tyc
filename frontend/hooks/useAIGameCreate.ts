"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import { useNetwork } from "@starknet-react/core";
import { toast } from "react-toastify";
import { getContractErrorMessage } from "@/lib/utils/contractErrors";
import { withRpcRetry } from "@/lib/utils/rpcRetry";
import { generateGameCode } from "@/lib/utils/games";
import { GamePieces } from "@/lib/constants/games";
import { apiClient } from "@/lib/api";
import { useMediaQuery } from "@/components/useMediaQuery";
import { useAllDojoReads, useIsRegisteredOnChain, useDojoUsername } from "@/hooks/useAllDojoReads";
import { useDojoGameActions } from "@/hooks/dojo/useDojoGameActions";
import { useGuestAuthOptional } from "@/context/GuestAuthContext";
import { MINIPAY_CHAIN_IDS } from "@/constants/contracts";
import { usernameToFelt, codeToFelt, gameTypeToDojo, symbolToDojo } from "@/lib/dojo/calldata";

/** Backend expects this chain name so User.resolveUserByAddress finds the user (same as HeroSection / login-by-wallet). */
function chainToBackendChain(chain: { id?: number | bigint; name?: string } | undefined): string {
  const id = Number(chain?.id ?? 0);
  if (id === 137 || id === 80001) return "POLYGON";
  if (id === 8453 || id === 84531) return "BASE";
  if (id === 42220 || id === 44787) return "CELO";
  // Starknet mainnet / Sepolia and any other -> Starknet (backend normalizes to STARKNET)
  return "Starknet";
}

export const AI_ADDRESSES = [
  "0xA1FF1c93600c3487FABBdAF21B1A360630f8bac6",
  "0xB2EE17D003e63985f3648f6c1d213BE86B474B11",
  "0xC3FF882E779aCbc112165fa1E7fFC093e9353B21",
  "0xD4FFDE5296C3EE6992bAf871418CC3BE84C99C32",
  "0xE5FF75Fcf243C4cE05B9F3dc5Aeb9F901AA361D1",
  "0xF6FF469692a259eD5920C15A78640571ee845E8",
  "0xA7FFE1f969Fa6029Ff2246e79B6A623A665cE69",
  "0xB8FF2cEaCBb67DbB5bc14D570E7BbF339cE240F6",
];

export type AIDifficulty = "easy" | "medium" | "hard" | "boss";

export interface AIGameSettings {
  symbol: string;
  aiCount: number;
  startingCash: number;
  aiDifficulty: AIDifficulty;
  auction: boolean;
  rentInPrison: boolean;
  mortgage: boolean;
  evenBuild: boolean;
  duration: number;
}

const DEFAULT_SETTINGS: AIGameSettings = {
  symbol: "hat",
  aiCount: 1,
  startingCash: 1500,
  aiDifficulty: "boss",
  auction: true,
  rentInPrison: false,
  mortgage: true,
  evenBuild: true,
  duration: 30,
};

interface GameCreateResponse {
  data?: { data?: { id: string | number }; id?: string | number };
  id?: string | number;
}

export interface UseAIGameCreateOptions {
  /** When true, redirect to 3D board (board-3d) after creating the game. */
  redirectTo3D?: boolean;
}

const POLL_GAME_ID_ATTEMPTS = 10;
const POLL_GAME_ID_MS = 1500;

export function useAIGameCreate(options?: UseAIGameCreateOptions) {
  const router = useRouter();
  const { account, address } = useAccount();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const redirectTo3D = options?.redirectTo3D ?? false;
  const { chain } = useNetwork();
  const board3DUrl = redirectTo3D ? `/board-3d?gameCode=` : null;
  const guestAuth = useGuestAuthOptional();
  const isGuest = !!guestAuth?.guestUser;

  const { username } = useDojoUsername(address ?? undefined);
  const { isRegisteredOnChain: isUserRegistered, isLoading: isRegisteredLoading } = useIsRegisteredOnChain(address ?? undefined);
  const { createAiGame: dojoCreateAiGame } = useDojoGameActions();
  const { getGameByCode } = useAllDojoReads();

  const registeredAgents: string[] = [];
  const agentsLoading = false;
  const registrySupported = false;

  const isMiniPay = false;
  const chainName = chainToBackendChain(chain);

  const [settings, setSettings] = useState<AIGameSettings>(DEFAULT_SETTINGS);
  const [isCreatePending, setIsCreatePending] = useState(false);

  const gameCode = generateGameCode();
  const totalPlayers = settings.aiCount + 1;
  const contractAddress = undefined;

  const handlePlay = async () => {
    const toastId = toast.loading(
      `Summoning ${settings.aiCount} AI opponent${settings.aiCount > 1 ? "s" : ""}...`
    );

    if (isGuest) {
      try {
        toast.update(toastId, { render: "Creating AI game (guest)..." });
        const res = await apiClient.post<any>("/games/create-ai-as-guest", {
          code: gameCode,
          symbol: settings.symbol,
          number_of_players: totalPlayers,
          is_minipay: isMiniPay,
          chain: chainName,
          duration: settings.duration,
          settings: {
            auction: settings.auction,
            rent_in_prison: settings.rentInPrison,
            mortgage: settings.mortgage,
            even_build: settings.evenBuild,
            starting_cash: settings.startingCash,
          },
        });
        const data = (res as any)?.data;
        const dbGameId = data?.data?.id ?? data?.id;
        if (!dbGameId) throw new Error("Backend did not return game ID");

        toast.update(toastId, { render: "Adding AI opponents..." });
        let availablePieces = GamePieces.filter((p) => p.id !== settings.symbol);
        for (let i = 0; i < settings.aiCount; i++) {
          if (availablePieces.length === 0) availablePieces = [...GamePieces];
          const randomIndex = Math.floor(Math.random() * availablePieces.length);
          const aiSymbol = availablePieces[randomIndex].id;
          availablePieces.splice(randomIndex, 1);
          try {
            await apiClient.post("/game-players/join", {
              address: AI_ADDRESSES[i],
              symbol: aiSymbol,
              code: gameCode,
            });
          } catch (_) {}
        }
        try {
          await apiClient.put(`/games/${dbGameId}`, { status: "RUNNING" });
        } catch (_) {}
        toast.update(toastId, {
          render: "Battle begins! Good luck, Tycoon!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
        router.push(board3DUrl ? `${board3DUrl}${gameCode}` : `/ai-play?gameCode=${gameCode}`);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? "Failed to create AI game.";
        toast.update(toastId, { render: msg, type: "error", isLoading: false, autoClose: 8000 });
      }
      return;
    }

    if (!address || !username || !isUserRegistered) {
      toast.error("Please connect your wallet and register first!", { autoClose: 5000 });
      return;
    }

    if (!account) {
      toast.error("Wallet not ready for transactions.");
      return;
    }

    setIsCreatePending(true);
    try {
      toast.update(toastId, { render: "Creating AI game on-chain (Dojo)..." });

      await dojoCreateAiGame(
        account,
        usernameToFelt(username),
        gameTypeToDojo("PRIVATE"),
        symbolToDojo(settings.symbol),
        settings.aiCount,
        codeToFelt(gameCode),
        BigInt(settings.startingCash)
      );

      let onChainGameId: bigint | null = null;
      for (let i = 0; i < POLL_GAME_ID_ATTEMPTS; i++) {
        await new Promise((r) => setTimeout(r, POLL_GAME_ID_MS));
        const raw = await withRpcRetry(() => getGameByCode(gameCode));
        const arr = Array.isArray(raw) ? raw : [raw];
        const id = arr[0] != null ? BigInt(String(arr[0])) : BigInt(0);
        if (id !== BigInt(0)) {
          onChainGameId = id;
          break;
        }
      }

      if (!onChainGameId) throw new Error("Game created but could not read game ID. Try refreshing.");

      toast.update(toastId, { render: "Saving game to server..." });

      let dbGameId: string | number | undefined;
      try {
        const saveRes: GameCreateResponse = await apiClient.post("/games", {
          id: onChainGameId.toString(),
          code: gameCode,
          mode: "PRIVATE",
          address,
          symbol: settings.symbol,
          number_of_players: totalPlayers,
          ai_opponents: settings.aiCount,
          ai_difficulty: settings.aiDifficulty,
          is_ai: true,
          is_minipay: isMiniPay,
          chain: chainName,
          duration: settings.duration,
          settings: {
            auction: settings.auction,
            rent_in_prison: settings.rentInPrison,
            mortgage: settings.mortgage,
            even_build: settings.evenBuild,
            starting_cash: settings.startingCash,
          },
        });

        const payload = typeof saveRes?.data === "object" ? saveRes.data : saveRes;
        if (payload && (payload as { success?: boolean }).success === false) {
          const msg = (payload as { message?: string }).message || "Save failed";
          throw new Error(
            msg.toLowerCase().includes("user not found")
              ? "Wallet not registered. Please sign in or register your wallet first."
              : msg
          );
        }

        dbGameId =
          typeof saveRes === "string" || typeof saveRes === "number"
            ? saveRes
            : saveRes?.data?.data?.id ?? (saveRes?.data as { id?: number })?.id ?? saveRes?.id;

        if (!dbGameId) throw new Error("Backend did not return game ID");
      } catch (backendError: any) {
        console.error("Backend save error:", backendError);
        const msg =
          backendError?.response?.data?.message ??
          backendError?.message ??
          "Failed to save game on server";
        const status = backendError?.response?.status;
        throw new Error(status ? `[${status}] ${msg}` : msg);
      }

      toast.update(toastId, { render: "Adding AI opponents..." });

      // Use backend endpoint to add AI players (works for wallet-created games; join endpoint requires on-chain verification)
      try {
        const addAiRes = await apiClient.post(`/games/${dbGameId}/add-ai-players`, {
          ai_count: settings.aiCount,
        });
        const resData = (addAiRes as any)?.data;
        if (!resData?.success) {
          throw new Error(resData?.message || "Failed to add AI players");
        }
      } catch (addAiErr: any) {
        console.error("Failed to add AI players:", addAiErr);
        throw new Error(
          addAiErr?.response?.data?.message || "Failed to add AI players to game"
        );
      }

      try {
        await apiClient.put(`/games/${dbGameId}`, { status: "RUNNING" });
      } catch (statusErr) {
        console.warn("Failed to set game status to RUNNING:", statusErr);
      }

      toast.update(toastId, {
        render: "Battle begins! Good luck, Tycoon!",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });

      router.push(board3DUrl ? `${board3DUrl}${gameCode}` : `/ai-play?gameCode=${gameCode}`);
    } catch (err: any) {
      console.error("handlePlay error:", err);
      const message = getContractErrorMessage(err, "Something went wrong. Please try again.");
      toast.update(toastId, {
        render: message,
        type: "error",
        isLoading: false,
        autoClose: 8000,
      });
    } finally {
      setIsCreatePending(false);
    }
  };

  const canCreate = isGuest || (address && username && isUserRegistered);

  return {
    settings,
    setSettings,
    gameCode,
    totalPlayers,
    handlePlay,
    canCreate,
    isCreatePending,
    isGuest,
    isRegisteredLoading,
    address,
    username,
    isUserRegistered,
    contractAddress,
    registeredAgents,
    agentsLoading,
    registrySupported,
  };
}
