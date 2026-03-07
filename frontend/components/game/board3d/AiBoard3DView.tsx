"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Game, GameProperty, Player, Property } from "@/types/game";
import { PROPERTY_ACTION } from "@/types/game";
import { apiClient } from "@/lib/api";
import { postToCanvas } from "@/lib/board3d-iframe-messages";
import { getDiceValues, JAIL_POSITION, BOARD_SQUARES } from "@/components/game/constants";
import { getContractErrorMessage } from "@/lib/utils/contractErrors";
import { usePreventDoubleSubmit } from "@/hooks/usePreventDoubleSubmit";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import GamePlayers from "@/components/game/ai-player/ai-player";

export interface AiBoard3DViewProps {
  game: Game;
  properties: Property[];
  game_properties: GameProperty[];
  gameCode: string;
  refetchGame: () => Promise<unknown>;
  me: Player | null;
  currentPlayer: Player | null;
  isAITurn: boolean;
  my_properties: Property[];
  isGuest: boolean;
}

export default function AiBoard3DView({
  game,
  properties,
  game_properties,
  gameCode,
  refetchGame,
  me,
  currentPlayer,
  isAITurn,
  my_properties,
  isGuest,
}: AiBoard3DViewProps) {
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

  useEffect(() => {
    if (!canvasMounted || !canvasIframeRef.current || !canvasIframeReady) return;
    postToCanvas(canvasIframeRef.current, { type: "BOARD_3D_STATE", payload: canvasStatePayload });
  }, [canvasMounted, canvasIframeReady, canvasStatePayload]);

  useEffect(() => {
    if (!canvasMounted) return;
    const t = window.setTimeout(() => setCanvasIframeReady(true), 400);
    return () => window.clearTimeout(t);
  }, [canvasMounted]);

  useEffect(() => {
    if (!canvasMounted || !canvasIframeRef.current || !game?.id || properties.length === 0) return;
    const send = () => {
      if (canvasIframeRef.current) {
        postToCanvas(canvasIframeRef.current, { type: "BOARD_3D_STATE", payload: canvasStatePayload });
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
          const buyable =
            square?.price != null &&
            !isOwned &&
            !!action &&
            ["land", "railway", "utility"].includes(action);
          setBuyPrompted(!!buyable);
          if (!buyable) {
            setLandedPositionForBuy(null);
            await apiClient
              .post("/game-players/end-turn", { user_id: me.user_id, game_id: game.id })
              .catch(() => {});
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
  }, [playerCanRoll, isRolling, me, doRoll, refetchGame, rollGuard]);

  useEffect(() => {
    if (!isAITurn || !currentPlayer || isRolling || !game?.id) return;
    const timer = window.setTimeout(() => {
      setIsRolling(true);
      doRoll(currentPlayer.user_id).then(() => {
        apiClient
          .post("/game-players/end-turn", { user_id: currentPlayer.user_id, game_id: game.id })
          .catch(() => {});
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

  return (
    <main className="w-full h-screen overflow-hidden relative flex flex-row bg-[#010F10] lg:gap-4 p-4">
      <div className="hidden lg:block w-80 flex-shrink-0">
        <GamePlayers
          game={game}
          properties={properties}
          game_properties={game_properties}
          my_properties={my_properties}
          me={me}
          currentPlayer={currentPlayer}
          roll={lastRollResult}
          isAITurn={isAITurn}
          focusTrades={false}
          onViewedTrades={() => {}}
          isGuest={isGuest}
        />
      </div>
      <div
        className="flex-1 min-w-0 relative rounded-xl overflow-hidden border border-cyan-500/30 aspect-square max-w-[1200px] bg-[#010F10]"
        style={{ isolation: "isolate" }}
      >
        <div ref={(el) => setCanvasMounted(!!el)} className="absolute inset-0 w-full h-full">
          <iframe
            ref={canvasIframeRef}
            src="/board-3d-canvas"
            title="3D Board"
            className="absolute inset-0 w-full h-full border-0 bg-[#010F10]"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
      <Link
        href={`/ai-play?gameCode=${encodeURIComponent(gameCode)}`}
        className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-lg bg-slate-800/90 text-cyan-300 text-sm border border-cyan-500/50 hover:bg-slate-700"
      >
        2D board
      </Link>

      <AnimatePresence>
        {buyPrompted && justLandedProperty && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 z-[2147483647]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-2xl border-2 border-amber-500/50 bg-slate-900 p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-amber-200 mb-2">
                You landed on {justLandedProperty.name}
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                ${justLandedProperty.price?.toLocaleString()} — Buy or skip?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleBuy()}
                  disabled={(me?.balance ?? 0) < (justLandedProperty.price ?? 0)}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold"
                >
                  Buy
                </button>
                <button
                  onClick={() => handleSkipBuy()}
                  className="flex-1 py-3 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-bold"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
