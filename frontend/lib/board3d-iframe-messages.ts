/**
 * PostMessage protocol between parent (board-3d-multi) and iframe (board-3d-canvas).
 * Parent has Cartridge + game logic; iframe has only R3F to avoid React conflict.
 */

export const BOARD_3D_IFRAME_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

export type Board3DCanvasState = {
  properties: unknown[];
  players: unknown[];
  animatedPositions: Record<number, number>;
  currentPlayerId: number | null;
  developmentByPropertyId?: Record<number, number>;
  ownerByPropertyId?: Record<number, string>;
  rollingDice?: { die1: number; die2: number } | null;
  lastRollResult?: { die1: number; die2: number; total: number } | null;
  rollLabel?: string;
  history?: unknown[];
  aiThinking?: boolean;
  thinkingLabel?: string;
  resetViewTrigger?: number;
  focusTilePosition?: number | null;
  spinOrbitDegrees?: number;
  showRollUi?: boolean;
  showEndTurnUi?: boolean;
  isLiveGame?: boolean;
};

export type Board3DMessageFromParent = { type: 'BOARD_3D_STATE'; payload: Board3DCanvasState };
export type Board3DMessageFromCanvas =
  | { type: 'BOARD_3D_READY' }
  | { type: 'ROLL_CLICK' }
  | { type: 'SQUARE_CLICK'; propertyId: number }
  | { type: 'DICE_COMPLETE' }
  | { type: 'FOCUS_COMPLETE' }
  | { type: 'END_TURN_CLICK' };

export function isBoard3DStateMessage(m: unknown): m is Board3DMessageFromParent {
  return typeof m === 'object' && m !== null && (m as Record<string, unknown>).type === 'BOARD_3D_STATE';
}

export function postToCanvas(iframeRef: HTMLIFrameElement | null, msg: Board3DMessageFromParent): void {
  if (!iframeRef?.contentWindow) return;
  const origin = typeof window !== 'undefined' ? window.location.origin : '*';
  iframeRef.contentWindow.postMessage(msg, origin);
}
