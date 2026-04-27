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

const ENGINE_URL = "/stockfish/stockfish-18-lite-single.js";

let worker: Worker | null = null;
let lastSkill: number | null = null;

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

export async function getBestMove(
  fen: string,
  difficulty: Difficulty,
): Promise<string> {
  const w = await ensureWorker();
  const cfg = DIFFICULTY_CONFIG[difficulty];

  if (lastSkill !== cfg.skillLevel) {
    w.postMessage(`setoption name Skill Level value ${cfg.skillLevel}`);
    lastSkill = cfg.skillLevel;
  }

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
}

export function disposeStockfish() {
  if (worker) {
    worker.terminate();
    worker = null;
    lastSkill = null;
  }
}
