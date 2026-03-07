"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import type { Property, Player, History } from "@/types/game";
import {
  isBoard3DStateMessage,
  type Board3DCanvasState,
  type Board3DMessageFromCanvas,
} from "@/lib/board3d-iframe-messages";

const Canvas = dynamic(
  () => import("@react-three/fiber").then((m) => m.Canvas),
  { ssr: false }
);
const BoardScene = dynamic(
  () => import("@/components/game/board3d/BoardScene").then((m) => m.default),
  { ssr: false }
);

const BOARD_3D_MESSAGE_SOURCE = "tycoon-board3d-canvas";

function postToParent(msg: Board3DMessageFromCanvas) {
  if (typeof window === "undefined" || !window.parent) return;
  window.parent.postMessage({ ...msg, source: BOARD_3D_MESSAGE_SOURCE }, window.location.origin);
}

export default function Board3DCanvasPage() {
  const [state, setState] = useState<Board3DCanvasState | null>(null);
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    postToParent({ type: "BOARD_3D_READY" });
    const readyInterval = window.setInterval(() => postToParent({ type: "BOARD_3D_READY" }), 200);
    const stop = window.setTimeout(() => window.clearInterval(readyInterval), 2000);
    return () => {
      window.clearInterval(readyInterval);
      window.clearTimeout(stop);
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!mountedRef.current) return;
      if (e.origin !== window.location.origin) return;
      if (isBoard3DStateMessage(e.data)) {
        setState(e.data.payload);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const onSquareClick = useCallback((property: Property) => {
    postToParent({ type: "SQUARE_CLICK", propertyId: property.id });
  }, []);

  const onDiceComplete = useCallback(() => {
    postToParent({ type: "DICE_COMPLETE" });
  }, []);

  const onRoll = useCallback(() => {
    postToParent({ type: "ROLL_CLICK" });
  }, []);

  const onFocusComplete = useCallback(() => {
    postToParent({ type: "FOCUS_COMPLETE" });
  }, []);

  if (!state) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#010F10]">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin" />
          <p className="text-sm">Waiting for game…</p>
        </div>
      </div>
    );
  }

  const properties = (state.properties ?? []) as Property[];
  const players = (state.players ?? []) as Player[];
  const history = (state.history ?? []) as History[];

  if (!mounted || properties.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#010F10]">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/50 border-t-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-[#010F10]">
      <Canvas
        camera={{ position: [0, 12, 12], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100%", height: "100%" }}
      >
        <BoardScene
          properties={properties}
          players={players}
          animatedPositions={state.animatedPositions ?? {}}
          currentPlayerId={state.currentPlayerId ?? null}
          developmentByPropertyId={state.developmentByPropertyId}
          ownerByPropertyId={state.ownerByPropertyId}
          onSquareClick={onSquareClick}
          rollingDice={state.rollingDice ?? undefined}
          onDiceComplete={state.isLiveGame ? onDiceComplete : undefined}
          lastRollResult={state.lastRollResult ?? undefined}
          rollLabel={state.rollLabel}
          onRoll={state.showRollUi ? onRoll : undefined}
          history={history}
          aiThinking={state.aiThinking}
          thinkingLabel={state.thinkingLabel}
          resetViewTrigger={state.resetViewTrigger}
          focusTilePosition={state.focusTilePosition ?? undefined}
          onFocusComplete={onFocusComplete}
          spinOrbitDegrees={state.spinOrbitDegrees}
        />
      </Canvas>
    </div>
  );
}
