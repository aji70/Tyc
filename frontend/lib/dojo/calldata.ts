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

/** Symbol id (e.g. "hat", "car") to Dojo player symbol index. */
export function symbolToDojo(symbolId: string): number {
  const i = GamePieces.findIndex((p) => p.id === symbolId);
  return i >= 0 ? i : 0;
}
