import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type GameRow = {
  id: string;
  opponent: string;
  difficulty: string | null;
  user_color: string | null;
  result: string;
  pgn: string;
  created_at: string;
};

function formatResult(g: GameRow): string {
  if (g.result === "draw") return "Draw";
  const winnerColor = g.result === "white_wins" ? "w" : "b";
  if (g.opponent === "human") {
    return winnerColor === "w" ? "White won" : "Black won";
  }
  if (g.user_color) {
    return winnerColor === g.user_color ? "You won" : "You lost";
  }
  return g.result;
}

function formatOpponent(g: GameRow): string {
  if (g.opponent === "ai") {
    const diff = g.difficulty ? ` (${g.difficulty})` : "";
    const side =
      g.user_color === "w"
        ? " — played White"
        : g.user_color === "b"
          ? " — played Black"
          : "";
    return `vs AI${diff}${side}`;
  }
  return "Two players (local)";
}

export default async function GamesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: games, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-medium mb-4">My Games</h1>

        {error && (
          <p className="text-red-600 dark:text-red-400">Failed to load games: {error.message}</p>
        )}

        {games && games.length === 0 && (
          <p className="text-slate-600 dark:text-slate-400">
            No games yet.{" "}
            <Link href="/" className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
              Play one
            </Link>{" "}
            and finish it to see it here.
          </p>
        )}

        {games && games.length > 0 && (
          <ul className="space-y-2">
            {(games as GameRow[]).map((g) => (
              <li
                key={g.id}
                className="bg-slate-200 dark:bg-slate-800 rounded p-3 flex justify-between items-center gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{formatResult(g)}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {formatOpponent(g)}
                  </p>
                </div>
                <time className="text-sm text-slate-500 shrink-0">
                  {new Date(g.created_at).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
