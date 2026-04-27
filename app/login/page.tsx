import Link from "next/link";
import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <form
        action={login}
        className="w-full max-w-sm flex flex-col gap-4 bg-slate-800 p-6 rounded-md"
      >
        <h1 className="text-2xl font-medium">Log in</h1>
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-sky-500"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          autoComplete="current-password"
          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-500 rounded px-4 py-2 font-medium transition-colors"
        >
          Log in
        </button>
        {searchParams.error && (
          <p className="text-red-400 text-sm">{searchParams.error}</p>
        )}
        <p className="text-sm text-slate-400">
          No account?{" "}
          <Link href="/signup" className="text-sky-400 hover:text-sky-300">
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
