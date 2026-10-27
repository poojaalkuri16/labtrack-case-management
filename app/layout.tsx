import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { LAB_TZ } from "@/lib/dates";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabTrack",
  description: "Case tracking for dental labs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700&family=Instrument+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-ink text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3c-2.5 0-4 2-4 4.5 0 2 1 3.5 1.5 6S5.5 21 7.5 21c1.7 0 1.5-4 4.5-4s2.8 4 4.5 4c2 0 2.5-4 3-7s1.5-4.500 1.500-6.500C21 5 19.500 3 17 3c-2 0-3 1-5 1S9 3 7 3z" />
                </svg>
              </span>
              LabTrack
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs text-ink/60">
          Dates are calendar dates in lab time ({LAB_TZ.replace("_", " ")}). They never change with the viewer’s timezone.
        </footer>
      </body>
    </html>
  );
}
