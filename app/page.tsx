"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Square } from "react-chessboard/dist/chessboard/types";

export default function Home() {
  const [game, setGame] = useState(() => new Chess());
  const [position, setPosition] = useState(() => game.fen());
  const [moveCount, setMoveCount] = useState(0);
  const [boardWidth, setBoardWidth] = useState(360);

  useEffect(() => {
    const update = () => {
      const w = Math.min(window.innerWidth - 32, 480);
      setBoardWidth(Math.max(w, 280));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const status = useMemo(() => {
    if (game.isCheckmate()) {
      const winner = game.turn() === "w" ? "Black" : "White";
      return `Checkmate — ${winner} wins`;
    }
    if (game.isStalemate()) return "Stalemate";
    if (game.isDraw()) return "Draw";
    if (game.isCheck()) return "Check";
    return null;
    // position changes whenever a legal move mutates the game instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const turnLabel = game.turn() === "w" ? "White" : "Black";
  const gameOver =
    game.isCheckmate() || game.isStalemate() || game.isDraw();

  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square): boolean => {
      try {
        const move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
        if (!move) return false;
      } catch {
        return false;
      }
      setPosition(game.fen());
      setMoveCount((c) => c + 1);
      return true;
    },
    [game]
  );

  const newGame = () => {
    const fresh = new Chess();
    setGame(fresh);
    setPosition(fresh.fen());
    setMoveCount(0);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-6 p-4">
      <Chessboard
        id="chess-board"
        position={position}
        onPieceDrop={onPieceDrop}
        boardWidth={boardWidth}
        arePiecesDraggable={!gameOver}
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}
      />

      <div className="text-center space-y-1">
        <p className="text-lg font-medium">
          Turn: <span className="text-slate-300">{turnLabel}</span>
        </p>
        <p className="text-sm text-slate-400">Moves played: {moveCount}</p>
        {status && (
          <p className="text-yellow-400 font-medium">{status}</p>
        )}
      </div>

      <button
        onClick={newGame}
        className="bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 px-5 py-2 rounded-md transition-colors"
      >
        New game
      </button>
    </main>
  );
}
