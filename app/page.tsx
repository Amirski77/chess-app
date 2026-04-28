"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Square } from "react-chessboard/dist/chessboard/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  getBestMove,
  evaluatePosition,
  type Difficulty,
} from "@/lib/stockfish";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  initAudio,
  playTrack,
  stopMusic,
  playCheckmate,
  playClick,
  playCapture,
  playCheck,
  setMuted,
  bucketFromEval,
} from "@/lib/audio";

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

  const [musicStarted, setMusicStarted] = useState(false);
  const [muted, setMutedState] = useState(false);

  const aiCallId = useRef(0);
  const evalCallId = useRef(0);
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
      if (!musicStarted) {
        initAudio();
        playTrack("base");
        setMusicStarted(true);
      }
      setPosition(game.fen());
      setMoveCount((c) => c + 1);
      return true;
    },
    [game, mode, playerColor, musicStarted],
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

  // SFX + reactive music dispatch after every move
  useEffect(() => {
    if (moveCount === 0) return;
    initAudio();

    if (game.isCheckmate()) {
      // Bump evalCallId so any in-flight eval from BEFORE this move
      // can't slip past the .then() guard and call playTrack on a
      // game that's already over.
      evalCallId.current++;
      const loser = game.turn();
      const winner: PlayerColor = loser === "w" ? "b" : "w";
      const humanWon = mode === "human" || winner === playerColor;
      if (humanWon) {
        playCheckmate();
      } else {
        stopMusic();
      }
      return;
    }

    // Move SFX (priority: check > capture > click)
    if (game.isCheck()) {
      playCheck();
    } else {
      const lastMove = game.history({ verbose: true }).slice(-1)[0];
      if (lastMove?.captured) {
        playCapture();
      } else {
        playClick();
      }
    }

    // Stop music on draw/stalemate (game-end without checkmate stinger)
    if (game.isStalemate() || game.isDraw()) {
      evalCallId.current++;
      stopMusic();
      return;
    }

    // Eval-driven track switch — only after music has been started by player gesture
    if (!musicStarted) return;

    const callId = ++evalCallId.current;
    evaluatePosition(game.fen())
      .then((score) => {
        if (callId !== evalCallId.current) return;
        const sideToMove = game.turn();
        const anchor: PlayerColor = mode === "ai" ? playerColor : "w";
        const matches = sideToMove === anchor;
        const bucket = bucketFromEval(score, matches);
        playTrack(bucket);
      })
      .catch((e) => console.error("Eval failed:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveCount]);

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
    evalCallId.current++;
    savedRef.current = false;
    stopMusic();
    setMusicStarted(false);
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

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  const canDrag = !gameOver && !aiThinking && isPlayersTurn;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center gap-5 p-4">
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
          Turn: <span className="text-slate-700 dark:text-slate-300">{turnLabel}</span>
        </p>
        {aiThinking ? (
          <p className="text-sm text-sky-600 dark:text-sky-400">Thinking…</p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">Moves played: {moveCount}</p>
        )}
        {status && (
          <p className="text-yellow-600 dark:text-yellow-400 font-medium">{status}</p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={newGame}
          className="bg-slate-300 hover:bg-slate-400 active:bg-slate-200 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:active:bg-slate-800 dark:text-slate-100 px-5 py-2 rounded-md transition-colors"
        >
          New game
        </button>
        <button
          onClick={toggleMute}
          className="bg-slate-300 hover:bg-slate-400 active:bg-slate-200 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:active:bg-slate-800 dark:text-slate-100 px-5 py-2 rounded-md transition-colors"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
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
    <div className="inline-flex bg-slate-200 dark:bg-slate-800 rounded-md p-1 gap-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={
              "px-3 py-1.5 text-sm rounded transition-colors " +
              (active
                ? "bg-slate-400 text-slate-900 dark:bg-slate-600 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
