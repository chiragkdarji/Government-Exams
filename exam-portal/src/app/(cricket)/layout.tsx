import type { Metadata } from "next";
import { Rajdhani, Inter } from "next/font/google";

export const metadata: Metadata = {
  title: {
    default: "Live Cricket Scores, IPL 2026, Rankings & Records | Rizz Jobs",
    template: "%s | Cricket — Rizz Jobs",
  },
  description:
    "Follow live international cricket, IPL 2026 scores, ICC rankings, player stats, and cricket news — all in one place.",
  openGraph: {
    siteName: "Rizz Jobs",
    locale: "en_IN",
    type: "website",
  },
};

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cricket-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cricket-stats",
  display: "swap",
});

export default function CricketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${rajdhani.variable} ${inter.variable} min-h-screen`}
      style={{ background: "#0A0A0F", color: "#F0EDE8" }}
    >
      <main>{children}</main>
    </div>
  );
}
