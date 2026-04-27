import { mkdir, copyFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const src = resolve(root, "node_modules/stockfish/bin");
const dst = resolve(root, "public/stockfish");

const files = [
  "stockfish-18-lite-single.js",
  "stockfish-18-lite-single.wasm",
];

try {
  await access(src);
} catch {
  console.warn("[copy-stockfish] node_modules/stockfish/bin not found; skipping. Run npm install first.");
  process.exit(0);
}

await mkdir(dst, { recursive: true });
for (const f of files) {
  await copyFile(resolve(src, f), resolve(dst, f));
  console.log(`[copy-stockfish] ${f}`);
}
