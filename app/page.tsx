"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Square } from "react-chessboard/dist/chessboard/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getBestMove, type Difficulty } from "@/lib/stockfish";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

type Mode = "human" | "ai";
type PlayerColor = "w" | "b";

export default function Home() {
  const [game, setGame] = useState(() => new Chess());
  const [position, setPosition] = useState(() => game.fen());
  const [moveCount, setMoveCount] = useState(0);
  const [boardWidth, setBoardWidth] = useState(360);

  const [mode, setMode] = useState<Mode>("human");
  const [playerColor, setPlayerColor] = useState<PlayerColor>("w");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [aiThinking, setAiThinking] = useState(false);

  const aiCallId = useRef(0);
  const savedRef = useRef(false);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    supabaseRef.current = supabase;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const turnLabel = game.turn() === "w" ? "White" : "Black";
  const gameOver =
    game.isCheckmate() || game.isStalemate() || game.isDraw();

  const isPlayersTurn =
    mode === "human" || game.turn() === playerColor;

  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square): boolean => {
      if (mode === "ai" && game.turn() !== playerColor) return false;
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
    [game, mode, playerColor],
  );

  // AI move trigger
  useEffect(() => {
    if (mode !== "ai" || gameOver || game.turn() === playerColor) {
      setAiThinking(false);
      return;
    }

    const callId = ++aiCallId.current;
    setAiThinking(true);

    getBestMove(game.fen(), difficulty)
      .then((bestmove) => {
        if (callId !== aiCallId.current) return;
        if (!bestmove || bestmove === "(none)") return;
        const from = bestmove.slice(0, 2);
        const to = bestmove.slice(2, 4);
        const promotion = bestmove.length === 5 ? bestmove[4] : undefined;
        try {
          game.move({ from, to, ...(promotion ? { promotion } : {}) });
          setPosition(game.fen());
          setMoveCount((c) => c + 1);
        } catch (e) {
          console.error("AI illegal move:", bestmove, e);
        }
      })
      .catch((e) => {
        if (callId === aiCallId.current) console.error("Stockfish error:", e);
      })
      .finally(() => {
        if (callId === aiCallId.current) setAiThinking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, mode, playerColor, difficulty]);

  // Save completed game once per finished game
  useEffect(() => {
    if (!gameOver || !user || savedRef.current) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;

    let result: string;
    if (game.isCheckmate()) {
      result = game.turn() === "w" ? "black_wins" : "white_wins";
    } else if (game.isDraw() || game.isStalemate()) {
      result = "draw";
    } else {
      return;
    }

    savedRef.current = true;
    supabase
      .from("games")
      .insert({
        user_id: user.id,
        opponent: mode === "ai" ? "ai" : "human",
        difficulty: mode === "ai" ? difficulty : null,
        user_color: mode === "ai" ? playerColor : null,
        result,
        pgn: game.pgn(),
      })
      .then(({ error }) => {
        if (error) {
          console.error("Save game failed:", error);
          savedRef.current = false;
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, user]);

  const newGame = () => {
    aiCallId.current++;
    savedRef.current = false;
    const fresh = new Chess();
    setGame(fresh);
    setPosition(fresh.fen());
    setMoveCount(0);
    setAiThinking(false);
  };

  const handleModeChange = (next: Mode) => {
    if (next === mode) return;
    aiCallId.current++;
    setMode(next);
    setAiThinking(false);
  };

  const canDrag = !gameOver && !aiThinking && isPlayersTurn;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-5 p-4">
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <SegmentedToggle
          options={[
            { value: "human", label: "Two players" },
            { value: "ai", label: "vs AI" },
          ]}
          value={mode}
          onChange={handleModeChange}
        />

        {mode === "ai" && (
          <>
            <SegmentedToggle
              options={[
                { value: "easy", label: "Easy" },
                { value: "medium", label: "Medium" },
                { value: "hard", label: "Hard" },
              ]}
              value={difficulty}
              onChange={setDifficulty}
            />
            <SegmentedToggle
              options={[
                { value: "w", label: "Play as White" },
                { value: "b", label: "Play as Black" },
              ]}
              value={playerColor}
              onChange={(c) => {
                aiCallId.current++;
                setPlayerColor(c);
                setAiThinking(false);
              }}
            />
          </>
        )}
      </div>

      <div style={{ width: boardWidth }}>
        <Chessboard
          id="chess-board"
          position={position}
          onPieceDrop={onPieceDrop}
          boardWidth={boardWidth}
          boardOrientation={playerColor === "b" ? "black" : "white"}
          arePiecesDraggable={canDrag}
          customBoardStyle={{
            borderRadius: "4px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      <div className="text-center space-y-1 min-h-[5rem]">
        <p className="text-lg font-medium">
          Turn: <span className="text-slate-300">{turnLabel}</span>
        </p>
        {aiThinking ? (
          <p className="text-sm text-sky-400">Thinking…</p>
        ) : (
          <p className="text-sm text-slate-400">Moves played: {moveCount}</p>
        )}
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

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="inline-flex bg-slate-800 rounded-md p-1 gap-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={
              "px-3 py-1.5 text-sm rounded transition-colors " +
              (active
                ? "bg-slate-600 text-slate-100"
                : "text-slate-400 hover:text-slate-200")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
