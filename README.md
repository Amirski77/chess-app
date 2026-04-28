# Chess — A Game That Sounds Like You're Winning (or Losing)

Most chess apps treat your game like a transaction: moves in, result out. Chess treats it like an experience.

As you play, a reactive soundtrack responds to your position in real time — evaluated by Stockfish after every move. When you're winning, the music builds. When you're losing, it turns dark. When you deliver checkmate, the beat drops. When the AI mates you, silence.

**Live:** https://chess-app-zeta-two.vercel.app

---

## What it does

- **Reactive soundtrack** — 4 original tracks generated specifically for this app. Stockfish evaluates your position (±100 centipawn threshold) and crossfades between base / advantage / tension layers. Procedural sound effects (click, capture, check) via Web Audio API — no extra files.
- **AI opponent** — Stockfish WASM running in-browser via Web Worker. Three difficulty levels: Easy (Skill 0, 300ms), Medium (Skill 8, 800ms), Hard (Skill 20, 2000ms). Choose your color.
- **Full chess rules** — powered by chess.js: castling, en passant, promotion, check/stalemate/draw detection.
- **Auth + game history** — Supabase email/password auth. Every completed game saved to your account. Row-level security: you only see your own games.
- **Light/dark theme** — toggle persists across sessions, no flash-of-wrong-theme on load.
- **Mobile-responsive** — plays on any screen size.

---

## Who it's for

Chess players who also care about atmosphere. The generation that grew up with Spotify playlists as emotional timestamps — not PGN files.

---

## Tech stack

- **Next.js 14** (App Router, TypeScript, Tailwind CSS)
- **chess.js** — rules engine
- **react-chessboard** — board UI
- **Stockfish** (asm.js, Web Worker) — AI + position evaluation
- **Howler.js** — multi-track audio with crossfade
- **Web Audio API** — procedural SFX
- **Supabase** — auth + PostgreSQL + RLS
- **Vercel** — deployment

---

## What's next

- **Real-time multiplayer** via Supabase Realtime / WebSockets — invite a friend by link
- **AI Coach** — post-game analysis via Claude API: "Here's where you lost the advantage"
- **Spotify integration** — AI-curated soundtrack based on your listening history
- **Shareable game replays** — 30-second highlight reel with your game's soundtrack
- **ELO rating system** and global leaderboard by city

---

## Running locally

```bash
git clone https://github.com/Amirski77/chess-app
cd chess-app
npm install
# add .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

---

*Built for nFactorial Incubator 2026 in 36 hours.*
