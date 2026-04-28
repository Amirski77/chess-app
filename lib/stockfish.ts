import type { EvalScore } from "@/lib/audio";

export type Difficulty = "easy" | "medium" | "hard";

interface DifficultyConfig {
  skillLevel: number;
  movetime: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { skillLevel: 0, movetime: 300 },
  medium: { skillLevel: 8, movetime: 800 },
  hard: { skillLevel: 20, movetime: 2000 },
};

const ENGINE_URL = "/stockfish/stockfish-18-asm.js";

let worker: Worker | null = null;
let lastSkill: number | null = null;

// Chained-promise mutex: one worker, many callers, serialized.
let chain: Promise<unknown> = Promise.resolve();

function withWorker<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

function ensureWorker(): Promise<Worker> {
  if (worker) return Promise.resolve(worker);
  const w = new Worker(ENGINE_URL);
  worker = w;
  return waitFor(w, "uci", (line) => line === "uciok")
    .then(() => waitFor(w, "isready", (line) => line === "readyok"))
    .then(() => w);
}

function waitFor(
  w: Worker,
  cmd: string,
  predicate: (line: string) => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const handler = (e: MessageEvent) => {
      if (predicate(String(e.data))) {
        w.removeEventListener("message", handler);
        resolve();
      }
    };
    w.addEventListener("message", handler);
    w.postMessage(cmd);
  });
}

function setSkill(w: Worker, skill: number) {
  if (lastSkill !== skill) {
    w.postMessage(`setoption name Skill Level value ${skill}`);
    lastSkill = skill;
  }
}

export function getBestMove(
  fen: string,
  difficulty: Difficulty,
): Promise<string> {
  return withWorker(async () => {
    const w = await ensureWorker();
    const cfg = DIFFICULTY_CONFIG[difficulty];
    setSkill(w, cfg.skillLevel);

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const handler = (e: MessageEvent) => {
        const line = String(e.data);
        if (line.startsWith("bestmove ")) {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          w.removeEventListener("message", handler);
          const move = line.split(/\s+/)[1] ?? "";
          resolve(move);
        }
      };
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        w.removeEventListener("message", handler);
        reject(new Error("Stockfish timed out"));
      }, cfg.movetime + 5000);

      w.addEventListener("message", handler);
      w.postMessage(`position fen ${fen}`);
      w.postMessage(`go movetime ${cfg.movetime}`);
    });
  });
}

export function evaluatePosition(
  fen: string,
  movetime = 200,
): Promise<EvalScore> {
  return withWorker(async () => {
    const w = await ensureWorker();
    setSkill(w, 20);

    return new Promise<EvalScore>((resolve, reject) => {
      let settled = false;
      let lastScore: EvalScore = { type: "cp", value: 0 };
      const handler = (e: MessageEvent) => {
        const line = String(e.data);
        const mateMatch = line.match(/score mate (-?\d+)/);
        const cpMatch = line.match(/score cp (-?\d+)/);
        if (mateMatch) lastScore = { type: "mate", value: Number(mateMatch[1]) };
        else if (cpMatch) lastScore = { type: "cp", value: Number(cpMatch[1]) };
        if (line.startsWith("bestmove ")) {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          w.removeEventListener("message", handler);
          resolve(lastScore);
        }
      };
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        w.removeEventListener("message", handler);
        reject(new Error("Stockfish eval timed out"));
      }, movetime + 5000);

      w.addEventListener("message", handler);
      w.postMessage(`position fen ${fen}`);
      w.postMessage(`go movetime ${movetime}`);
    });
  });
}

export function disposeStockfish() {
  if (worker) {
    worker.terminate();
    worker = null;
    lastSkill = null;
  }
}
