import Link from "next/link";
import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <form
        action={login}
        className="w-full max-w-sm flex flex-col gap-4 bg-slate-200 dark:bg-slate-800 p-6 rounded-md"
      >
        <h1 className="text-2xl font-medium">Log in</h1>
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-sky-500"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          autoComplete="current-password"
          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-500 text-white rounded px-4 py-2 font-medium transition-colors"
        >
          Log in
        </button>
        {searchParams.error && (
          <p className="text-red-600 dark:text-red-400 text-sm">{searchParams.error}</p>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No account?{" "}
          <Link href="/signup" className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
            Sign up
          </Link>
        </p>
      </form>
    </main>
  );
}
