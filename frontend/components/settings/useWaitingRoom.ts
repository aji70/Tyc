"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import { Address } from "viem";
import { useAllDojoReads, useDojoUsername } from "@/hooks/useAllDojoReads";
import { useDojoGameActions } from "@/hooks/dojo/useDojoGameActions";
import { shortString } from "starknet";
import { usernameToFelt, codeToFelt, symbolToDojo } from "@/lib/dojo/calldata";
import { apiClient } from "@/lib/api";
import { Game } from "@/lib/types/games";
import { getPlayerSymbolData, PlayerSymbol, symbols } from "@/lib/types/symbol";
import { ApiResponse } from "@/types/api";
import { toast } from "react-toastify";
import { getContractErrorMessage } from "@/lib/utils/contractErrors";
import { useGuestAuthOptional } from "@/context/GuestAuthContext";
import { socketService } from "@/lib/socket";

const POLL_INTERVAL = 2000;
const SOCKET_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_SOCKET_URL ||
        (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, ""))
    : "";
const COPY_FEEDBACK_MS = 2000;
export const USDC_DECIMALS = 6;

/** Tournament match codes (e.g. T7-R0-M0). Skip contract read until game has contract_game_id to avoid RPC quota. */
function isTournamentMatchCode(code: string): boolean {
  return /^T\d+-R\d+-M\d+$/i.test(code);
}

const MOBILE_BREAKPOINT_PX = 768;

export interface UseWaitingRoomOptions {
  /** When game is RUNNING, redirect here (default: /game-play). e.g. /board-3d-multi for 3D board. */
  redirectToBoard?: string;
  /** On viewports <= 768px, redirect here instead of redirectToBoard (e.g. /board-3d-multi-mobile). */
  redirectToBoardMobile?: string;
}

export function useWaitingRoom(options: UseWaitingRoomOptions = {}) {
  const { redirectToBoard = "/game-play", redirectToBoardMobile } = options;

  const getRedirectBoardUrl = useCallback(() => {
    const base = redirectToBoard;
    if (redirectToBoardMobile && typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT_PX) {
      return redirectToBoardMobile;
    }
    return base;
  }, [redirectToBoard, redirectToBoardMobile]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawGameCode = searchParams.get("gameCode") ?? "";
  const gameCode = rawGameCode.trim().toUpperCase();

  const { account, address } = useAccount();
  const guestAuth = useGuestAuthOptional();
  const guestUser = guestAuth?.guestUser ?? null;
  const { getGameByCode } = useAllDojoReads();
  const { joinGame: dojoJoinGame } = useDojoGameActions();

  const [game, setGame] = useState<Game | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol | null>(null);
  const [availableSymbols, setAvailableSymbols] = useState<PlayerSymbol[]>(symbols);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [copySuccessFarcaster, setCopySuccessFarcaster] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const actionGuardRef = useRef<boolean>(false);

  const tournamentLobby = isTournamentMatchCode(gameCode);
  const gameHasContract = !!(game && (game as Game & { contract_game_id?: string | null }).contract_game_id);
  const enableContractRead = !!gameCode && (!tournamentLobby || gameHasContract);

  const [dojoGame, setDojoGame] = useState<{
    id: bigint;
    creator?: string;
    status?: string;
    joinedPlayers?: number;
    numberOfPlayers?: number;
    stakePerPlayer?: bigint;
  } | null>(null);
  const [contractGameLoading, setContractGameLoading] = useState(false);
  const [contractGameErrorRaw, setContractGameErrorRaw] = useState<unknown>(null);

  useEffect(() => {
    if (!enableContractRead || !gameCode) {
      setDojoGame(null);
      return;
    }
    let cancelled = false;
    setContractGameLoading(true);
    setContractGameErrorRaw(null);
    getGameByCode(gameCode)
      .then((raw: unknown) => {
        if (cancelled) return;
        const arr = Array.isArray(raw) ? raw : [raw];
        const gameId = arr[0] != null ? BigInt(String(arr[0])) : BigInt(0);
        if (gameId === BigInt(0)) {
          setDojoGame(null);
          return;
        }
        // Game struct: id, code, creator, status, winner, number_of_players, joined_players, mode, ai, stake_per_player, ...
        setDojoGame({
          id: gameId,
          creator: arr[2] != null ? String(arr[2]) : undefined,
          status: arr[3] != null ? String(arr[3]) : undefined,
          numberOfPlayers: arr[5] != null ? Number(arr[5]) : undefined,
          joinedPlayers: arr[6] != null ? Number(arr[6]) : undefined,
          stakePerPlayer: arr[9] != null ? BigInt(String(arr[9])) : undefined,
        });
      })
      .catch((err) => {
        if (!cancelled) setContractGameErrorRaw(err);
      })
      .finally(() => {
        if (!cancelled) setContractGameLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameCode, enableContractRead, getGameByCode]);

  const PENDING_STATUS_FELT = useMemo(
    () => BigInt(shortString.encodeShortString("PENDING")),
    []
  );

  const contractGame = dojoGame
    ? {
        id: dojoGame.id,
        creator: dojoGame.creator,
        status: dojoGame.status,
        joinedPlayers: dojoGame.joinedPlayers,
        numberOfPlayers: dojoGame.numberOfPlayers,
        stakePerPlayer: dojoGame.stakePerPlayer,
      }
    : undefined;

  const isContractGameOpen = useMemo(() => {
    if (!contractGame?.status) return true;
    try {
      return BigInt(contractGame.status) === PENDING_STATUS_FELT;
    } catch {
      return true;
    }
  }, [contractGame?.status, PENDING_STATUS_FELT]);

  const contractGameError = useMemo(() => {
    if (!contractGameErrorRaw) return null;
    const errorMessage = (contractGameErrorRaw as Error)?.message || String(contractGameErrorRaw);
    if (errorMessage.includes("Not found") || errorMessage.includes("not found")) return null;
    return contractGameErrorRaw;
  }, [contractGameErrorRaw]);

  const contractId = contractGame?.id ?? null;
  const { username } = useDojoUsername(address ?? undefined);

  const contractAddress = undefined as Address | undefined;
  const usdcTokenAddress = undefined as Address | undefined;
  const usdcAllowance = undefined;
  const refetchAllowance = () => {};
  const approvePending = false;
  const approveConfirming = false;

  const stakePerPlayer = contractGame?.stakePerPlayer
    ? BigInt(contractGame.stakePerPlayer)
    : BigInt(0);

  const guestCannotJoinStaked = !!guestUser && stakePerPlayer > BigInt(0);

  const [joinError, setJoinError] = useState<unknown>(null);
  const isJoining = actionLoading;
  const approveUSDC = useCallback(async () => {}, []);
  const joinGame = useCallback(async () => undefined as string | undefined, []);

  const mountedRef = useRef(true);
  const refetchGameRef = useRef<{ fn: (() => Promise<void>) | null }>({ fn: null });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const origin = useMemo(() => {
    try {
      if (typeof window === "undefined") return "";
      return window.location?.origin ?? "";
    } catch {
      return "";
    }
  }, []);

  const gameUrl = useMemo(
    () => `${origin}/game-waiting?gameCode=${encodeURIComponent(gameCode)}`,
    [origin, gameCode]
  );

  const farcasterMiniappUrl = useMemo(
    () =>
      `https://farcaster.xyz/miniapps/bylqDd2BdAR5/tycoon/game-waiting?gameCode=${encodeURIComponent(gameCode)}`,
    [gameCode]
  );

  const shareText = useMemo(
    () => `Join my Tycoon game! Code: ${gameCode}. Waiting room: ${gameUrl}`,
    [gameCode, gameUrl]
  );

  const farcasterShareText = useMemo(
    () => `Join my Tycoon game! Code: ${gameCode}.`,
    [gameCode]
  );

  const telegramShareUrl = useMemo(
    () =>
      `https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(shareText)}`,
    [gameUrl, shareText]
  );

  const twitterShareUrl = useMemo(
    () => `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    [shareText]
  );

  const farcasterShareUrl = useMemo(
    () =>
      `https://warpcast.com/~/compose?text=${encodeURIComponent(farcasterShareText)}&embeds[]=${encodeURIComponent(farcasterMiniappUrl)}`,
    [farcasterShareText, farcasterMiniappUrl]
  );

  const computeAvailableSymbols = useCallback((g: Game | null) => {
    if (!g) return symbols;
    const taken = new Set(g.players.map((p) => p.symbol));
    return symbols.filter((s) => !taken.has(s.value));
  }, []);

  const checkPlayerJoined = useCallback(
    (g: Game | null) => {
      if (!g) return false;
      const addr = guestUser?.address ?? address;
      if (!addr) return false;
      return g.players.some(
        (p) => String(p.address || "").toLowerCase() === addr.toLowerCase()
      );
    },
    [address, guestUser?.address]
  );

  const isCreator = useMemo(() => {
    if (!game) return false;
    const addr = guestUser?.address ?? address;
    if (!addr) return false;
    return addr.toLowerCase() === String(contractGame?.creator).toLowerCase();
  }, [game, address, guestUser?.address, contractGame?.creator]);

  const showShare = useMemo(() => {
    if (!game) return false;
    return game.players.length < game.number_of_players || isCreator;
  }, [game, isCreator]);

  const handleCopyLink = useCallback(async () => {
    if (!gameUrl) {
      setError("No shareable URL available.");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(gameUrl);
      } else {
        const el = document.createElement("textarea");
        el.value = gameUrl;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopySuccess("Copied!");
      setTimeout(() => setCopySuccess(null), COPY_FEEDBACK_MS);
    } catch (err) {
      console.error("copy failed", err);
      setError("Failed to copy link. Try manually selecting the text.");
    }
  }, [gameUrl]);

  const handleCopyFarcasterLink = useCallback(async () => {
    if (!farcasterMiniappUrl) {
      setError("No shareable Farcaster URL available.");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(farcasterMiniappUrl);
      } else {
        const el = document.createElement("textarea");
        el.value = farcasterMiniappUrl;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopySuccessFarcaster("Farcaster link copied!");
      setTimeout(() => setCopySuccessFarcaster(null), COPY_FEEDBACK_MS);
    } catch (err) {
      console.error("copy farcaster failed", err);
      setError("Failed to copy Farcaster link. Try manually selecting the text.");
    }
  }, [farcasterMiniappUrl]);

  useEffect(() => {
    if (!gameCode) {
      setError("No game code provided. Please enter a valid game code.");
      setLoading(false);
      return;
    }

    let pollTimer: number | null = null;

    const fetchOnce = async () => {
      setError(null);
      try {
        const res = await apiClient.get<ApiResponse>(
          `/games/code/${encodeURIComponent(gameCode)}`
        );

        if (!mountedRef.current) return;

        if (!res?.data?.success || !res?.data?.data) {
          throw new Error(`Game ${gameCode} not found`);
        }

        const gameData = res.data.data;

        if (gameData.status === "RUNNING") {
          router.push(`${getRedirectBoardUrl()}?gameCode=${encodeURIComponent(gameCode)}`);
          return;
        }

        if (gameData.status !== "PENDING") {
          throw new Error(`Game ${gameCode} is not open for joining.`);
        }

        setGame(gameData);
        setAvailableSymbols(computeAvailableSymbols(gameData));
        setIsJoined(checkPlayerJoined(gameData));

        if (gameData.players.length === gameData.number_of_players) {
          const updateRes = await apiClient.put<ApiResponse>(`/games/${gameData.id}`, {
            status: "RUNNING",
          });
          if (updateRes?.data?.success)
            router.push(`${getRedirectBoardUrl()}?gameCode=${encodeURIComponent(gameCode)}`);
        }
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        if ((err as Error)?.name === "AbortError") return;
        console.error("fetchGame error:", err);
        setError(
          (err as Error)?.message ?? "Failed to fetch game data. Please try again."
        );
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    refetchGameRef.current.fn = fetchOnce;

    const startPolling = async () => {
      await fetchOnce();
      const tick = async () => {
        if (typeof document !== "undefined" && document.hidden) {
          pollTimer = window.setTimeout(tick, POLL_INTERVAL);
          return;
        }
        await fetchOnce();
        pollTimer = window.setTimeout(tick, POLL_INTERVAL);
      };
      pollTimer = window.setTimeout(tick, POLL_INTERVAL);
    };

    startPolling();

    return () => {
      refetchGameRef.current.fn = null;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [gameCode, computeAvailableSymbols, checkPlayerJoined, router, getRedirectBoardUrl]);

  // Socket: refetch immediately when someone joins (game-update / player-joined)
  useEffect(() => {
    if (!gameCode || !SOCKET_URL) return;
    const socket = socketService.connect(SOCKET_URL);
    socketService.joinGameRoom(gameCode);
    const onGameUpdate = (data: { gameCode?: string }) => {
      if (data?.gameCode === gameCode) refetchGameRef.current.fn?.();
    };
    const onPlayerJoined = () => {
      refetchGameRef.current.fn?.();
    };
    socketService.onGameUpdate(onGameUpdate);
    socketService.onPlayerJoined(onPlayerJoined);
    return () => {
      socketService.removeListener("game-update", onGameUpdate);
      socketService.removeListener("player-joined", onPlayerJoined);
      socketService.leaveGameRoom(gameCode);
    };
  }, [gameCode]);

  const playersJoined =
    contractGame?.joinedPlayers
      ? Number(contractGame.joinedPlayers)
      : (game?.players.length ?? 0);
  const maxPlayers =
    contractGame?.numberOfPlayers
      ? Number(contractGame.numberOfPlayers)
      : (game?.number_of_players ?? 0);

  const handleJoinGame = useCallback(async () => {
    if (!game) {
      setError("No game data found. Please enter a valid game code.");
      return;
    }

    if (
      !playerSymbol?.value ||
      !availableSymbols.some((s) => s.value === playerSymbol.value)
    ) {
      setError("Please select a valid symbol.");
      return;
    }

    if (game.players.length >= game.number_of_players) {
      setError("Game is full!");
      return;
    }

    // No wallet and not signed in as guest
    const hasWalletOrGuest = !!address || !!guestUser;
    if (!hasWalletOrGuest) {
      const isFree = stakePerPlayer === BigInt(0);
      setError(
        tournamentLobby
          ? "Connect your wallet to join this tournament match, or sign in as guest (Join Room)."
          : isFree
            ? "Sign in as guest to join this free game. Go to Join Room and sign in as guest, then return here."
            : "Connect a wallet or sign in as guest to join. Staked games require a connected wallet."
      );
      return;
    }

    if (actionGuardRef.current) return;
    actionGuardRef.current = true;
    setActionLoading(true);
    setError(null);
    const toastId = toast.loading("Joining the game...");

    if (guestUser) {
      if (stakePerPlayer > BigInt(0)) {
        setError("Guests cannot join staked games. Connect a wallet to join this game.");
        actionGuardRef.current = false;
        setActionLoading(false);
        toast.update(toastId, {
          render: "Guests cannot join staked games. Connect a wallet to join.",
          type: "error",
          isLoading: false,
          autoClose: 6000,
        });
        return;
      }
      try {
        await apiClient.post("/games/join-as-guest", {
          code: game.code,
          symbol: playerSymbol.value,
          joinCode: game.code,
        });
        if (mountedRef.current) {
          setIsJoined(true);
          setError(null);
        }
        toast.update(toastId, {
          render: "Successfully joined the game!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
      } catch (err: unknown) {
        const message = (err as any)?.response?.data?.message ?? (err as Error)?.message ?? "Failed to join game.";
        setError(message);
        toast.update(toastId, { render: message, type: "error", isLoading: false, autoClose: 8000 });
      } finally {
        if (mountedRef.current) {
          actionGuardRef.current = false;
          setActionLoading(false);
        }
      }
      return;
    }

    if (!account) {
      setError("Wallet not ready for transactions.");
      actionGuardRef.current = false;
      setActionLoading(false);
      toast.dismiss(toastId);
      return;
    }

    if (contractId == null || Number(contractId) === 0) {
      setError(
        tournamentLobby
          ? "Tournament match not ready yet. The first player needs to create the game with their wallet; then you can join."
          : "Game not found on-chain. Make sure you're on the correct network, or the game may still be creating."
      );
      actionGuardRef.current = false;
      setActionLoading(false);
      toast.dismiss(toastId);
      return;
    }

    if (!isContractGameOpen) {
      setError(
        "This game has already started on-chain. The backend may still show PENDING until it syncs. You can't join this game."
      );
      actionGuardRef.current = false;
      setActionLoading(false);
      toast.update(toastId, {
        render: "Game already started. You can't join.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
      toast.dismiss(toastId);
      return;
    }

    try {
      setJoinError(null);
      toast.update(toastId, { render: "Joining game on-chain (Dojo)..." });

      await dojoJoinGame(
        account,
        BigInt(contractId),
        usernameToFelt(username ?? ""),
        symbolToDojo(playerSymbol.value),
        codeToFelt(gameCode)
      );

      toast.update(toastId, { render: "Saving join to server..." });
      const res = await apiClient.post<ApiResponse>("/game-players/join", {
        address,
        symbol: playerSymbol.value,
        code: game.code,
      });

      if (res?.data?.success === false) {
        throw new Error(res?.data?.message ?? "Failed to join game");
      }

      if (mountedRef.current) {
        setIsJoined(true);
        setError(null);
      }

      toast.update(toastId, {
        render: "Successfully joined the game!",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
    } catch (err: unknown) {
      console.error("join error", err);
      if (mountedRef.current) setJoinError(err);
      const message = getContractErrorMessage(err, "Failed to join game. Please try again.");
      setError(message);
      toast.update(toastId, {
        render: message,
        type: "error",
        isLoading: false,
        autoClose: 8000,
      });
    } finally {
      if (mountedRef.current) {
        actionGuardRef.current = false;
        setActionLoading(false);
      }
    }
  }, [
    game,
    playerSymbol,
    availableSymbols,
    address,
    account,
    guestUser,
    dojoJoinGame,
    stakePerPlayer,
    contractId,
    tournamentLobby,
    isContractGameOpen,
  ]);

  const handleLeaveGame = useCallback(async () => {
    if (!game)
      return setError("No game data found. Please enter a valid game code.");
    if (actionGuardRef.current) return;
    actionGuardRef.current = true;
    setActionLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<ApiResponse>("/game-players/leave", {
        address,
        code: game.code,
      });
      if (res?.data?.success === false)
        throw new Error(res?.data?.message ?? "Failed to leave game");
      if (mountedRef.current) {
        setIsJoined(false);
        setPlayerSymbol(null);
      }
    } catch (err: unknown) {
      console.error("leave error", err);
      if (mountedRef.current)
        setError(
          (err as Error)?.message ?? "Failed to leave game. Please try again."
        );
    } finally {
      if (mountedRef.current) {
        actionGuardRef.current = false;
        setActionLoading(false);
      }
    }
  }, [game, address]);

  const handleGoHome = useCallback(() => router.push("/"), [router]);

  return {
    router,
    gameCode,
    game,
    setGame,
    playerSymbol,
    setPlayerSymbol,
    availableSymbols,
    isJoined,
    copySuccess,
    copySuccessFarcaster,
    error,
    setError,
    loading,
    actionLoading,
    contractGame,
    contractGameLoading,
    contractGameError,
    isContractGameOpen,
    contractId,
    username,
    contractAddress,
    usdcTokenAddress,
    usdcAllowance,
    refetchAllowance,
    approveUSDC,
    approvePending,
    approveConfirming,
    stakePerPlayer,
    guestCannotJoinStaked,
    guestUser,
    joinGame,
    isJoining,
    joinError,
    gameUrl,
    farcasterMiniappUrl,
    shareText,
    farcasterShareText,
    telegramShareUrl,
    twitterShareUrl,
    farcasterShareUrl,
    computeAvailableSymbols,
    checkPlayerJoined,
    isCreator,
    showShare,
    handleCopyLink,
    handleCopyFarcasterLink,
    playersJoined,
    maxPlayers,
    handleJoinGame,
    handleLeaveGame,
    handleGoHome,
    getPlayerSymbolData,
    symbols,
  };
}
