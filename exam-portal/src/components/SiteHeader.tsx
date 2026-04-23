"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Search,
  LogOut,
  User,
  ShieldCheck,
  Settings,
  X,
} from "lucide-react";
import NewsLatestTicker from "@/components/NewsLatestTicker";
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

const SECTION_CONFIG = {
  jobs:    { accent: "#6366f1", bg: "#030712", border: "#1f2937" },
  news:    { accent: "#f0a500", bg: "#070708", border: "#221c07" },
  cricket: { accent: "#FFB800", bg: "#0A0A0F", border: "#2A2A3A" },
};

const JOB_CHIPS = [
  { label: "UPSC / SSC",  href: "/jobs/upsc-ssc" },
  { label: "Banking",     href: "/jobs/banking" },
  { label: "Railway",     href: "/jobs/railway" },
  { label: "Defense",     href: "/jobs/defense-police" },
  { label: "Teaching",    href: "/jobs/teaching" },
  { label: "Engineering", href: "/jobs/engineering" },
  { label: "Medical",     href: "/jobs/medical" },
  { label: "10th / 12th",href: "/jobs/10th-12th-pass" },
  { label: "PSU",         href: "/jobs/psu" },
  { label: "State Jobs",  href: "/jobs/state-jobs" },
  { label: "Admit Cards", href: "/jobs/admit-cards" },
  { label: "Results",     href: "/jobs/results" },
];

const NEWS_CHIPS = [
  { label: "All",      href: "/news" },
  { label: "Finance",  href: "/news/finance" },
  { label: "Business", href: "/news/business" },
  { label: "Markets",  href: "/news/markets" },
  { label: "Economy",  href: "/news/economy" },
  { label: "Startups", href: "/news/startups" },
];

const CRICKET_INT_CHIPS = [
  { label: "Home",     href: "/cricket" },
  { label: "🔴 Live",  href: "/cricket/live" },
  { label: "Schedule", href: "/cricket/upcoming" },
  { label: "Rankings", href: "/cricket/rankings" },
  { label: "Records",  href: "/cricket/records" },
  { label: "News",     href: "/cricket/news" },
];

const CRICKET_IPL_CHIPS = [
  { label: "Scores",       href: "/cricket/ipl" },
  { label: "Points Table", href: "/cricket/ipl/points-table" },
  { label: "Orange Cap",   href: "/cricket/ipl/orange-cap" },
  { label: "Purple Cap",   href: "/cricket/ipl/purple-cap" },
  { label: "Teams",        href: "/cricket/ipl/teams" },
  { label: "Schedule",     href: "/cricket/ipl/schedule" },
  { label: "Stats",        href: "/cricket/ipl/stats" },
  { label: "Fantasy",      href: "/cricket/ipl/fantasy" },
  { label: "News",         href: "/cricket/ipl/news" },
];

function getSection(pathname: string): keyof typeof SECTION_CONFIG {
  if (pathname.startsWith("/news"))    return "news";
  if (pathname.startsWith("/cricket")) return "cricket";
  return "jobs";
}

function isChipActive(chip: { href: string }, pathname: string): boolean {
  const exactMatch = ["/news", "/cricket", "/cricket/ipl", "/"];
  if (exactMatch.includes(chip.href)) return pathname === chip.href;
  return pathname.startsWith(chip.href);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const section  = getSection(pathname);
  const cfg      = SECTION_CONFIG[section];
  const isIpl    = pathname.startsWith("/cricket/ipl");

  const [user, setUser]           = useState<{ email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch]     = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipsRef   = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) { setIsLoading(false); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll active chip into view on navigation
  useEffect(() => {
    if (!chipsRef.current) return;
    const active = chipsRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) active.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [pathname]);

  const chips =
    section === "jobs"    ? JOB_CHIPS :
    section === "news"    ? NEWS_CHIPS :
    isIpl                 ? CRICKET_IPL_CHIPS :
                            CRICKET_INT_CHIPS;

  const searchTarget =
    section === "news"    ? "/news" :
    section === "cricket" ? "/cricket" :
    "/";

  const accentText = section === "jobs" ? "#fff" : "#000";

  return (
    <div style={{ background: cfg.bg }}>
      {/* ── Top bar ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ borderBottom: `1px solid ${cfg.border}`, background: `${cfg.bg}e8` }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-12 md:h-16 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 group shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-base md:text-xl font-black tracking-tighter text-white italic">
              Rizz Jobs
            </span>
          </Link>

          {/* Desktop primary nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: "/",       label: "Jobs",    id: "jobs",    accent: "#6366f1" },
              { href: "/news",   label: "News",    id: "news",    accent: "#f0a500" },
              { href: "/cricket",label: "Cricket", id: "cricket", accent: "#FFB800" },
            ].map((item) => {
              const active = section === item.id;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    color:      active ? item.accent : "#9ca3af",
                    background: active ? `${item.accent}18` : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Desktop search */}
            <form action={searchTarget} method="get" className="hidden md:flex">
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  placeholder="Search..."
                  className="w-36 lg:w-52 bg-white/[0.04] border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              </div>
            </form>

            {/* Mobile search icon */}
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-gray-300" />
            </button>

            {/* Auth */}
            {!isLoading && (
              <div
                className="relative"
                onMouseEnter={() => {
                  if (closeTimer.current) clearTimeout(closeTimer.current);
                  setShowUserMenu(true);
                }}
                onMouseLeave={() => {
                  closeTimer.current = setTimeout(() => setShowUserMenu(false), 120);
                }}
              >
                {user ? (
                  <>
                    <button
                      className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all overflow-hidden flex items-center justify-center"
                      onClick={() => setShowUserMenu((v) => !v)}
                      aria-label="User menu"
                    >
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {user.email ? user.email[0].toUpperCase() : "U"}
                      </div>
                    </button>
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#0d111c] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <Link href="/dashboard"          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-sm text-gray-300 hover:text-white border-b border-white/5" onClick={() => setShowUserMenu(false)}><User className="w-4 h-4" /> Dashboard</Link>
                        <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-sm text-gray-300 hover:text-white border-b border-white/5" onClick={() => setShowUserMenu(false)}><Settings className="w-4 h-4" /> Settings</Link>
                        {ADMIN_EMAIL && user?.email === ADMIN_EMAIL && (
                          <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-500/10 text-sm text-indigo-400 hover:text-indigo-300 border-b border-white/5" onClick={() => setShowUserMenu(false)}><ShieldCheck className="w-4 h-4" /> Admin</Link>
                        )}
                        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-sm text-gray-300 hover:text-white">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-colors whitespace-nowrap"
                    style={{ background: cfg.accent, color: accentText }}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile search expand */}
        {showSearch && (
          <div className="md:hidden px-4 pb-3">
            <div className="relative">
              <form action={searchTarget} method="get">
                <input
                  type="text"
                  name="q"
                  placeholder="Search..."
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </form>
              <button onClick={() => setShowSearch(false)} className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Section sub-nav ──────────────────────────────── */}
      {section === "cricket" ? (
        /* Cricket: 2-tier */
        <div className="sticky top-12 md:top-16 z-40" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
          {/* Tier 1 tabs */}
          <div className="max-w-7xl mx-auto px-4 flex gap-0 border-b border-white/5">
            <Link
              href="/cricket"
              className="px-4 py-2 text-xs font-bold border-b-2 transition-all"
              style={{ color: !isIpl ? cfg.accent : "#5A566A", borderColor: !isIpl ? cfg.accent : "transparent" }}
            >
              International
            </Link>
            <Link
              href="/cricket/ipl"
              className="px-4 py-2 text-xs font-bold border-b-2 transition-all"
              style={{ color: isIpl ? cfg.accent : "#5A566A", borderColor: isIpl ? cfg.accent : "transparent" }}
            >
              IPL 2026
            </Link>
          </div>
          {/* Tier 2 chips */}
          <div
            ref={chipsRef}
            className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide max-w-7xl mx-auto"
            style={{ touchAction: "pan-x" }}
          >
            {chips.map((chip) => {
              const active = isChipActive(chip, pathname);
              return (
                <Link
                  key={chip.href}
                  href={chip.href}
                  data-active={String(active)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap"
                  style={{
                    color:       active ? "#000" : "#9A96A0",
                    background:  active ? cfg.accent : "transparent",
                    borderColor: active ? cfg.accent : "#2A2A3A",
                  }}
                >
                  {chip.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : chips.length > 0 ? (
        /* Jobs / News: single-tier */
        <div className="sticky top-12 md:top-16 z-40" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
          <div
            ref={chipsRef}
            className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide max-w-7xl mx-auto"
            style={{ touchAction: "pan-x" }}
          >
            {chips.map((chip) => {
              const active = isChipActive(chip, pathname);
              return (
                <Link
                  key={chip.href}
                  href={chip.href}
                  data-active={String(active)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap"
                  style={{
                    color:       active ? accentText : "#9ca3af",
                    background:  active ? cfg.accent : "transparent",
                    borderColor: active ? cfg.accent : "#374151",
                  }}
                >
                  {chip.label}
                </Link>
              );
            })}
            {section === "news" && <NewsLatestTicker />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
