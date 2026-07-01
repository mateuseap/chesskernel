import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { GameState, GameClock, GameMove } from '@chesskernel/shared';

interface GameStoreState {
  gameState: GameState | null;
  chess: Chess;
  selectedSquare: string | null;
  pendingPromotion: { from: string; to: string } | null;
  isMyTurn: boolean;
  myColor: 'white' | 'black' | null;

  setGameState: (state: GameState, myUserId: string) => void;
  applyMoveOptimistic: (from: string, to: string, promotion?: string) => boolean;
  revertOptimistic: (fen: string) => void;
  applyServerMove: (move: GameMove, fen: string, clock: GameClock) => void;
  updateClock: (clock: GameClock) => void;
  selectSquare: (square: string | null) => void;
  setPendingPromotion: (from: string, to: string) => void;
  clearPendingPromotion: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  chess: new Chess(),
  selectedSquare: null,
  pendingPromotion: null,
  isMyTurn: false,
  myColor: null,

  setGameState: (state, myUserId) => {
    const myColor =
      state.white?.id === myUserId
        ? 'white'
        : state.black?.id === myUserId
          ? 'black'
          : null;

    const chess = new Chess(state.fen);

    set({
      gameState: state,
      chess,
      myColor,
      isMyTurn: myColor !== null && chess.turn() === myColor[0],
    });
  },

  applyMoveOptimistic: (from, to, promotion) => {
    const { chess } = get();
    const result = chess.move({ from, to, promotion });
    if (!result) return false;

    set((state) => ({
      chess: new Chess(chess.fen()),
      isMyTurn: false,
      selectedSquare: null,
      gameState: state.gameState
        ? { ...state.gameState, fen: chess.fen() }
        : null,
    }));
    return true;
  },

  revertOptimistic: (fen) => {
    const chess = new Chess(fen);
    set((state) => ({
      chess,
      isMyTurn: true,
      gameState: state.gameState ? { ...state.gameState, fen } : null,
    }));
  },

  applyServerMove: (move, fen, clock) => {
    const chess = new Chess(fen);
    set((state) => ({
      chess,
      isMyTurn:
        state.myColor !== null &&
        chess.turn() === state.myColor[0],
      selectedSquare: null,
      gameState: state.gameState
        ? {
            ...state.gameState,
            fen,
            moves: [...state.gameState.moves, move],
            clock,
          }
        : null,
    }));
  },

  updateClock: (clock) =>
    set((state) => ({
      gameState: state.gameState ? { ...state.gameState, clock } : null,
    })),

  selectSquare: (square) => set({ selectedSquare: square }),

  setPendingPromotion: (from, to) => set({ pendingPromotion: { from, to } }),

  clearPendingPromotion: () => set({ pendingPromotion: null }),

  reset: () =>
    set({
      gameState: null,
      chess: new Chess(),
      selectedSquare: null,
      pendingPromotion: null,
      isMyTurn: false,
      myColor: null,
    }),
}));
