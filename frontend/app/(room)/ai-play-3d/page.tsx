"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useQuery } from "@tanstack/react-query";
import { ApiResponse } from "@/types/api";
import { Game, GameProperty, Player, Property } from "@/types/game";
import { PROPERTY_ACTION } from "@/types/game";
import { apiClient } from "@/lib/api";
import { useGuestAuthOptional } from "@/context/GuestAuthContext";
import { useMediaQuery } from "@/components/useMediaQuery";
import GamePlayers from "@/components/game/ai-player/ai-player";
import { useIsRegisteredOnChain } from "@/hooks/useAllDojoReads";
import { Loader2, AlertCircle } from "lucide-react";
import { usePreventDoubleSubmit } from "@/hooks/usePreventDoubleSubmit";
import { postToCanvas } from "@/lib/board3d-iframe-messages";
import { getDiceValues, JAIL_POSITION, BOARD_SQUARES } from "@/components/game/constants";
import { getContractErrorMessage } from "@/lib/utils/contractErrors";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AI game on 3D board. Step-by-step minimal flow:
 * - No game code → "Create AI game" (play-ai-3d) or enter code
 * - AI game + code → play on 3D board (iframe /board-3d-canvas + postMessage state)
 */
export default function AiPlay3DPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [gameCode, setGameCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const { address } = useAccount();
  const guestAuth = useGuestAuthOptional();
  const guestUser = guestAuth?.guestUser ?? null;
  const isGuest = !!guestUser;
  const { isRegisteredOnChain: isUserRegistered, isLoading: isRegisteredLoading } = useIsRegisteredOnChain(address ?? undefined);

  useEffect(() => {
    const code = searchParams.get("gameCode") || localStorage.getItem("gameCode");
    if (code && code.length === 6) {
      setGameCode(code.trim().toUpperCase());
      localStorage.setItem("gameCode", code.trim().toUpperCase());
    }
  }, [searchParams]);

  // Redirect mobile to the dedicated mobile 3D board as soon as we have a code (so we never show desktop layout)
  useEffect(() => {
    if (isMobile && gameCode && gameCode.length === 6) {
      router.replace(`/board-3d-mobile?gameCode=${encodeURIComponent(gameCode)}`);
    }
  }, [isMobile, gameCode, router]);

  const handleGoWithCode = useCallback(() => {
    const trimmed = codeInput.trim().toUpperCase();
    if (trimmed.length === 6) {
      setGameCode(trimmed);
      localStorage.setItem("gameCode", trimmed);
      router.replace(`/board-3d?gameCode=${encodeURIComponent(trimmed)}`);
    }
  }, [codeInput, router]);

  const {
    data: game,
    isLoading: gameLoading,
    isError: gameError,
    error: gameQueryError,
    refetch: refetchGame,
  } = useQuery<Game>({
    queryKey: ["game", gameCode],
    queryFn: async () => {
      if (!gameCode) throw new Error("No game code");
      const res = await apiClient.get<ApiResponse>(`/games/code/${gameCode}`);
      if (!res.data?.success) throw new Error((res.data as { error?: string })?.error ?? "Game not found");
      return res.data.data;
    },
    enabled: !!gameCode && (!!isUserRegistered || isGuest),
    refetchInterval: 5000,
  });

  // Non-AI game → 2D multiplayer; AI game → real 3D board lives at board-3d
  useEffect(() => {
    if (!game || !gameCode) return;
    if (game.is_ai === false || game.is_ai === undefined) {
      router.replace(`/game-play?gameCode=${encodeURIComponent(gameCode)}`);
      return;
    }
    if (game.is_ai === true) {
      router.replace(`/board-3d?gameCode=${encodeURIComponent(gameCode)}`);
    }
  }, [game, gameCode, router]);

  const me = useMemo<Player | null>(() => {
    const myAddress = guestUser?.address ?? address;
    if (!game?.players || !myAddress) return null;
    return game.players.find((pl: Player) => pl.address?.toLowerCase() === myAddress.toLowerCase()) || null;
  }, [game, address, guestUser?.address]);

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse>("/properties");
      return res.data?.success ? res.data.data : [];
    },
  });

  const { data: game_properties = [] } = useQuery<GameProperty[]>({
    queryKey: ["game_properties", game?.id],
    queryFn: async () => {
      if (!game?.id) return [];
      const res = await apiClient.get<ApiResponse>(`/game-properties/game/${game.id}`);
      return res.data?.success ? res.data.data : [];
    },
    enabled: !!game?.id,
  });

  const my_properties: Property[] = useMemo(() => {
    const myAddress = guestUser?.address ?? address;
    if (!game_properties.length || !properties.length || !myAddress) return [];
    const propertyMap = new Map(properties.map((p) => [p.id, p]));
    return game_properties
      .filter((gp) => gp.address?.toLowerCase() === myAddress.toLowerCase())
      .map((gp) => propertyMap.get(gp.property_id))
      .filter((p): p is Property => !!p)
      .sort((a, b) => a.id - b.id);
  }, [game_properties, properties, address, guestUser?.address]);

  const currentPlayer = useMemo(() => {
    if (!game?.next_player_id || !game?.players) return null;
    return game.players.find((p) => p.user_id === game.next_player_id) || null;
  }, [game]);

  const isAITurn = useMemo(() => {
    if (!currentPlayer) return false;
    const u = (currentPlayer.username ?? "").toLowerCase();
    return u.includes("ai_") || u.includes("bot") || u.includes("computer");
  }, [currentPlayer]);

  const finishGameByTime = useCallback(async () => {
    if (!game?.id || !game?.is_ai || game?.status !== "RUNNING") return;
    try {
      await apiClient.post(`/games/${game.id}/finish-by-time`);
      await refetchGame();
    } catch (e) {
      console.error(e);
    }
  }, [game?.id, game?.is_ai, game?.status, refetchGame]);

  const finishByTimeGuard = usePreventDoubleSubmit();
  const onFinishGameByTime = useCallback(() => finishByTimeGuard.submit(() => finishGameByTime()), [finishGameByTime, finishByTimeGuard]);

  // ─── 3D canvas iframe (same pattern as board-3d-multi) ───
  const canvasIframeRef = useRef<HTMLIFrameElement>(null);
  const [canvasMounted, setCanvasMounted] = useState(false);
  const [canvasIframeReady, setCanvasIframeReady] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [landedPositionForBuy, setLandedPositionForBuy] = useState<number | null>(null);
  const [buyPrompted, setBuyPrompted] = useState(false);
  const [lastRollResult, setLastRollResult] = useState<{ die1: number; die2: number; total: number } | null>(null);
  const rollGuard = usePreventDoubleSubmit();

  const positions = useMemo(() => {
    const out: Record<number, number> = {};
    game?.players?.forEach((p) => {
      out[p.user_id] = p.position ?? 0;
    });
    return out;
  }, [game?.players]);

  const developmentByPropertyId = useMemo(() => {
    const out: Record<number, number> = {};
    game_properties.forEach((gp) => {
      out[gp.property_id] = gp.development ?? 0;
    });
    return out;
  }, [game_properties]);

  const ownerByPropertyId = useMemo(() => {
    const out: Record<number, string> = {};
    const players = game?.players ?? [];
    game_properties.forEach((gp) => {
      if (gp.address) {
        const owner = players.find((p) => p.address?.toLowerCase() === gp.address?.toLowerCase());
        if (owner?.username) out[gp.property_id] = owner.username;
      }
    });
    return out;
  }, [game_properties, game?.players]);

  const justLandedProperty = useMemo(() => {
    const pos = landedPositionForBuy ?? me?.position;
    if (pos == null) return null;
    const square = properties.find((p) => p.id === pos);
    if (!square || square.price == null) return null;
    const isOwned = game_properties.some((gp) => gp.property_id === pos);
    const action = PROPERTY_ACTION(pos);
    const isBuyableType = !!action && ["land", "railway", "utility"].includes(action);
    return !isOwned && isBuyableType ? square : null;
  }, [landedPositionForBuy, me?.position, properties, game_properties]);

  const playerCanRoll = Boolean(
    me && currentPlayer && me.user_id === currentPlayer.user_id && (currentPlayer.balance ?? 0) > 0
  );
  const showRollUi = playerCanRoll && !isRolling && !buyPrompted;

  const canvasStatePayload = useMemo(
    () => ({
      properties,
      players: game?.players ?? [],
      animatedPositions: positions,
      currentPlayerId: currentPlayer?.user_id ?? null,
      developmentByPropertyId,
      ownerByPropertyId,
      lastRollResult: lastRollResult ?? undefined,
      rollLabel: lastRollResult ? "You rolled" : undefined,
      history: game?.history ?? [],
      aiThinking: isAITurn,
      thinkingLabel: currentPlayer ? `${currentPlayer.username || "Player"} is thinking...` : undefined,
      showRollUi,
      isLiveGame: true,
    }),
    [
      properties,
      game?.players,
      positions,
      currentPlayer,
      developmentByPropertyId,
      ownerByPropertyId,
      lastRollResult,
      isAITurn,
      showRollUi,
      game?.history,
    ]
  );

  // Send state when iframe is ready (or we think it might be)
  useEffect(() => {
    if (!canvasMounted || !canvasIframeRef.current || !canvasIframeReady) return;
    postToCanvas(canvasIframeRef.current, {
      type: "BOARD_3D_STATE",
      payload: canvasStatePayload,
    });
  }, [canvasMounted, canvasIframeReady, canvasStatePayload]);

  // Fallback: assume iframe ready after delay so we don't rely only on BOARD_3D_READY
  useEffect(() => {
    if (!canvasMounted) return;
    const t = window.setTimeout(() => setCanvasIframeReady(true), 400);
    return () => window.clearTimeout(t);
  }, [canvasMounted]);

  // Keep sending state every 400ms for 3s so the iframe gets it when it finishes loading (avoids "Waiting for game…" if READY is missed or iframe loads late)
  useEffect(() => {
    if (!canvasMounted || !canvasIframeRef.current || !game?.id || properties.length === 0) return;
    const send = () => {
      if (canvasIframeRef.current) {
        postToCanvas(canvasIframeRef.current, {
          type: "BOARD_3D_STATE",
          payload: canvasStatePayload,
        });
      }
    };
    send();
    const id = window.setInterval(send, 400);
    const stop = window.setTimeout(() => window.clearInterval(id), 3000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [canvasMounted, game?.id, properties.length, canvasStatePayload]);

  const doRoll = useCallback(
    async (forPlayerId: number) => {
      const value = getDiceValues();
      const player = game?.players?.find((p) => p.user_id === forPlayerId);
      if (!player || !game?.id) return;
      const currentPos = player.position ?? 0;
      const isInJail = Boolean(player.in_jail) && currentPos === JAIL_POSITION;
      const rolledDouble = value.die1 === value.die2;
      const newPos = isInJail && !rolledDouble ? currentPos : (currentPos + value.total) % BOARD_SQUARES;
      try {
        const res = await apiClient.post<{ data?: { still_in_jail?: boolean } }>(
          "/game-players/change-position",
          {
            user_id: forPlayerId,
            game_id: game.id,
            position: newPos,
            rolled: value.total,
            is_double: rolledDouble,
          }
        );
        const data = (res?.data ?? res) as { still_in_jail?: boolean } | undefined;
        if (data?.still_in_jail && forPlayerId === me?.user_id) {
          toast("Rolled — still in jail. Pay $50 or use a card to leave.");
        }
        await refetchGame();
        setLastRollResult(value);
        if (forPlayerId === me?.user_id) {
          setLandedPositionForBuy(isInJail && !rolledDouble ? null : newPos);
          const square = properties.find((p) => p.id === newPos);
          const isOwned = game_properties.some((gp) => gp.property_id === newPos);
          const action = PROPERTY_ACTION(newPos);
          const buyable = square?.price != null && !isOwned && !!action && ["land", "railway", "utility"].includes(action);
          setBuyPrompted(!!buyable);
          if (!buyable) {
            setLandedPositionForBuy(null);
            await apiClient.post("/game-players/end-turn", { user_id: me.user_id, game_id: game.id }).catch(() => {});
            await refetchGame();
          }
        }
      } catch (err) {
        toast.error(getContractErrorMessage(err, "Roll failed"));
        await refetchGame();
      } finally {
        setIsRolling(false);
      }
    },
    [game?.id, game?.players, me?.user_id, properties, game_properties, refetchGame]
  );

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.source !== "tycoon-board3d-canvas") return;
      switch (e.data.type) {
        case "BOARD_3D_READY":
          setCanvasIframeReady(true);
          break;
        case "ROLL_CLICK":
          if (!playerCanRoll || isRolling) return;
          rollGuard.submit(async () => {
            setIsRolling(true);
            await doRoll(me!.user_id);
          });
          break;
        case "SQUARE_CLICK": {
          const propId = e.data.propertyId;
          if (justLandedProperty?.id === propId && buyPrompted) {
            // Focus only; buy modal is shown by our overlay when buyPrompted
          }
          break;
        }
        case "DICE_COMPLETE":
          refetchGame();
          break;
        case "FOCUS_COMPLETE":
          refetchGame();
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [playerCanRoll, isRolling, me, doRoll, justLandedProperty, buyPrompted, refetchGame, rollGuard]);

  // AI turn: auto-roll after delay
  useEffect(() => {
    if (!isAITurn || !currentPlayer || isRolling || !game?.id) return;
    const timer = window.setTimeout(() => {
      setIsRolling(true);
      doRoll(currentPlayer.user_id).then(() => {
        // After AI roll, end turn so backend advances
        apiClient.post("/game-players/end-turn", { user_id: currentPlayer.user_id, game_id: game.id }).catch(() => {});
        refetchGame();
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [isAITurn, currentPlayer?.user_id, game?.id, isRolling, doRoll, refetchGame]);

  const handleBuy = useCallback(async () => {
    if (!justLandedProperty || !me || !game?.id) return;
    try {
      await apiClient.post("/game-properties/buy", {
        user_id: me.user_id,
        game_id: game.id,
        property_id: justLandedProperty.id,
      });
      toast.success(`You bought ${justLandedProperty.name}!`);
      setBuyPrompted(false);
      setLandedPositionForBuy(null);
      await apiClient.post("/game-players/end-turn", { user_id: me.user_id, game_id: game.id });
      await refetchGame();
    } catch (err) {
      toast.error(getContractErrorMessage(err, "Purchase failed"));
    }
  }, [justLandedProperty, me, game?.id, refetchGame]);

  const handleSkipBuy = useCallback(async () => {
    setBuyPrompted(false);
    setLandedPositionForBuy(null);
    if (me && game?.id) {
      try {
        await apiClient.post("/game-players/end-turn", { user_id: me.user_id, game_id: game.id });
        await refetchGame();
      } catch {
        await refetchGame();
      }
    }
  }, [me, game?.id, refetchGame]);

  // Not registered (and not guest)
  if (!isRegisteredLoading && isUserRegistered === false && !isGuest) {
    return (
      <div className="w-full min-h-screen bg-[#010F10] flex flex-col items-center justify-center gap-8 px-8 text-center">
        <AlertCircle className="w-20 h-20 text-red-400" />
        <h2 className="text-3xl font-bold text-white">Registration required</h2>
        <p className="text-gray-300 max-w-md">Register your wallet to play, or continue as guest from the home page.</p>
        <Link href="/" className="px-8 py-4 bg-[#00F0FF] text-[#010F10] font-bold rounded-lg hover:opacity-90">
          Go home
        </Link>
      </div>
    );
  }

  // Mobile with game code: always send to board-3d-mobile (redirect runs in useEffect); never show desktop layout
  if (isMobile && gameCode && gameCode.length === 6) {
    return (
      <div className="w-full min-h-screen bg-[#010F10] flex flex-col items-center justify-center gap-4 text-cyan-300">
        <Loader2 className="w-12 h-12 animate-spin" />
        <p className="text-xl">Opening mobile 3D board…</p>
      </div>
    );
  }

  // No game code: create or enter code
  if (!gameCode) {
    return (
      <div className="w-full min-h-screen bg-[#010F10] flex flex-col items-center justify-center gap-6 p-6 text-white">
        <h1 className="text-2xl font-bold text-cyan-400">Play AI in 3D</h1>
        <p className="text-gray-400 text-center max-w-md">
          Create an AI game, then you’ll be sent here. Or enter a game code if you have one.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Link
            href="/play-ai-3d"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00FFAA] to-[#00F0FF] text-black font-semibold text-center hover:opacity-90"
          >
            Create AI game
          </Link>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Game code"
              maxLength={6}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-cyan-500/50 text-white placeholder-gray-500"
            />
            <button
              onClick={handleGoWithCode}
              disabled={codeInput.trim().length !== 6}
              className="px-4 py-3 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go
            </button>
          </div>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-cyan-400 mt-4">
          Back to home
        </Link>
      </div>
    );
  }

  if (isRegisteredLoading || gameLoading || propertiesLoading) {
    return (
      <div className="w-full min-h-screen bg-[#010F10] flex flex-col items-center justify-center gap-4 text-cyan-300">
        <Loader2 className="w-12 h-12 animate-spin" />
        <p className="text-xl">Loading game...</p>
      </div>
    );
  }

  if (gameError || !game) {
    return (
      <div className="w-full min-h-screen bg-[#010F10] flex flex-col items-center justify-center gap-6 p-6 text-center text-white">
        <p className="text-red-400">{gameQueryError?.message ?? "Game not found"}</p>
        <div className="flex gap-4">
          <button onClick={() => { setGameCode(""); setCodeInput(""); }} className="px-6 py-3 rounded-lg bg-cyan-600 text-white font-semibold">
            Enter another code
          </button>
          <Link href="/play-ai-3d" className="px-6 py-3 rounded-lg border border-cyan-500/50 text-cyan-300 font-semibold">
            Create AI game
          </Link>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-cyan-400 mt-4">Back to home</Link>
      </div>
    );
  }

  if (game.is_ai === false || game.is_ai === undefined) {
    return (
      <div className="w-full min-h-screen bg-[#010F10] flex items-center justify-center text-cyan-300">
        <Loader2 className="w-12 h-12 animate-spin" />
        <p className="ml-4">Redirecting...</p>
      </div>
    );
  }

  // AI game: real 3D board lives at board-3d (desktop) / board-3d-mobile (mobile already redirected above)
  return (
    <div className="w-full min-h-screen bg-[#010F10] flex items-center justify-center gap-4 text-cyan-300">
      <Loader2 className="w-12 h-12 animate-spin" />
      <p className="text-xl">Opening 3D board…</p>
    </div>
  );
}
