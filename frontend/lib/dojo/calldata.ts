/**
 * Helpers for Dojo (tycoon_contract) calldata.
 * Use for createGame, joinGame, createAiGame writes.
 */
import { shortString } from "starknet";
import { GamePieces } from "@/lib/constants/games";

export function usernameToFelt(username: string): bigint {
  if (!username?.trim()) return BigInt(0);
  try {
    return BigInt(shortString.encodeShortString(username.trim()));
  } catch {
    return BigInt(0);
  }
}

export function codeToFelt(code: string): bigint {
  if (!code?.trim()) return BigInt(0);
  try {
    return BigInt(shortString.encodeShortString(code.trim().toUpperCase()));
  } catch {
    return BigInt(0);
  }
}

/**
 * Game type for Dojo: contract expects shortstring felt252 "PUBLIC" or "PRIVATE"
 * (see game_type_from_felt in tycoon_contract). Not the enum index 0/1.
 */
export function gameTypeToDojo(gameType: string): bigint {
  const s = String(gameType).toUpperCase();
  const word = s === "PRIVATE" || s === "PRIVATEGAME" ? "PRIVATE" : "PUBLIC";
  return BigInt(shortString.encodeShortString(word));
}

/**
 * Symbol id (e.g. "hat", "car") to Dojo player symbol.
 * Contract expects shortstring felt252 "HAT", "CAR", "DOG", etc. (see player_symbol_from_felt in tycoon_contract).
 */
const CONTRACT_SYMBOLS: Record<string, string> = {
  car: "CAR",
  dog: "DOG",
  hat: "HAT",
  thimble: "THIMBLE",
  wheelbarrow: "WHEELBARROW",
  battleship: "BATTLESHIP",
  boot: "BOOT",
  iron: "IRON",
  top_hat: "HAT", // contract has HAT only; map top_hat to HAT
};

export function symbolToDojo(symbolId: string): bigint {
  const id = String(symbolId || "").trim().toLowerCase();
  const word = CONTRACT_SYMBOLS[id] ?? (GamePieces.find((p) => p.id === id)?.name ?? "HAT");
  return BigInt(shortString.encodeShortString(word));
}
