import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Chess",
  description: "Two-player chess with a reactive soundtrack",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900`}
      >
        <header className="bg-slate-800 text-slate-100 px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-medium hover:text-sky-400 transition-colors">
            Chess
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="text-slate-400 hidden sm:inline">{user.email}</span>
                <Link href="/games" className="text-slate-300 hover:text-sky-400 transition-colors">
                  My Games
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-slate-300 hover:text-sky-400 transition-colors"
                  >
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-300 hover:text-sky-400 transition-colors">
                  Login
                </Link>
                <Link href="/signup" className="text-slate-300 hover:text-sky-400 transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
