"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, AlertCircle, RefreshCw, CheckCircle, Newspaper } from "lucide-react";

type ActionState = {
  running: boolean;
  error: string | null;
  success: string | null;
};

const idle: ActionState = { running: false, error: null, success: null };

const PRESET_OPTIONS = [5, 10, 15, 20] as const;

function LimitPicker({
  label,
  value,
  onChange,
  customValue,
  onCustomChange,
  accentClass,
  includeAll = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  accentClass: string;
  includeAll?: boolean;
}) {
  const isCustom = value === -1;
  return (
    <div>
      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {includeAll && (
          <button
            onClick={() => onChange(0)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              value === 0
                ? `${accentClass} text-white`
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            All
          </button>
        )}
        {PRESET_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              value === n
                ? `${accentClass} text-white`
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onChange(-1)}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            isCustom
              ? `${accentClass} text-white`
              : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
          }`}
        >
          Custom
        </button>
      </div>
      {isCustom && (
        <input
          type="number"
          min={1}
          max={500}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Enter number…"
          className="mt-2 w-36 px-3 py-2 rounded-xl text-sm font-bold bg-white/5 border border-white/20 text-white placeholder-gray-600 focus:outline-none focus:border-white/40"
        />
      )}
    </div>
  );
}

export default function ScraperPage() {
  const [scrape, setScrape] = useState<ActionState>(idle);
  const [refill, setRefill] = useState<ActionState>(idle);
  const [news, setNews]     = useState<ActionState>(idle);

  const [scrapeLimit, setScrapeLimit] = useState(0);
  const [scrapeCustom, setScrapeCustom] = useState("25");

  const [newsLimit, setNewsLimit] = useState(10);
  const [newsCustom, setNewsCustom] = useState("25");

  const [refillLimit, setRefillLimit] = useState(10);
  const [refillCustom, setRefillCustom] = useState("25");

  const effectiveScrapeLimit = scrapeLimit === -1 ? (parseInt(scrapeCustom) || 0) : scrapeLimit;
  const effectiveNewsLimit   = newsLimit === -1   ? (parseInt(newsCustom)   || 10) : newsLimit;
  const effectiveRefillLimit = refillLimit === -1 ? (parseInt(refillCustom) || 10) : refillLimit;

  const anyRunning = scrape.running || refill.running || news.running;

  const handleTrigger = async () => {
    setScrape({ running: true, error: null, success: null });
    try {
      const res  = await fetch(`/api/admin/scraper/trigger?limit=${effectiveScrapeLimit}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setScrape({ running: false, error: data.error || "Failed to trigger scraper", success: null });
        return;
      }
      setScrape({ running: false, error: null, success: data.message || "Scraper triggered!" });
      setTimeout(() => setScrape(idle), 6000);
    } catch (err) {
      setScrape({ running: false, error: err instanceof Error ? err.message : "Error", success: null });
    }
  };

  const handleNewsScrape = async () => {
    setNews({ running: true, error: null, success: null });
    try {
      const res  = await fetch(`/api/admin/news-scraper/trigger?limit=${effectiveNewsLimit}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setNews({ running: false, error: data.error || "Failed to trigger news scraper", success: null });
        return;
      }
      setNews({ running: false, error: null, success: data.message || "News scraper triggered!" });
      setTimeout(() => setNews(idle), 6000);
    } catch (err) {
      setNews({ running: false, error: err instanceof Error ? err.message : "Error", success: null });
    }
  };

  const handleRefill = async () => {
    setRefill({ running: true, error: null, success: null });
    try {
      const res  = await fetch(`/api/admin/scraper/refill?limit=${effectiveRefillLimit}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRefill({ running: false, error: data.error || "Failed to trigger refill", success: null });
        return;
      }
      setRefill({ running: false, error: null, success: data.message || "Refill triggered!" });
      setTimeout(() => setRefill(idle), 8000);
    } catch (err) {
      setRefill({ running: false, error: err instanceof Error ? err.message : "Error", success: null });
    }
  };

  return (
    <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
      <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-2">Admin Panel</p>
      <h1 className="text-3xl font-black mb-1">Scraper Tools</h1>
      <p className="text-gray-400 text-sm mb-8">
        Fetch new notifications or enrich existing ones with missing data
      </p>

      {/* ── Full Scrape ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 mb-5 space-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Full Scrape</p>
          <p className="text-sm text-gray-400">
            Fetches all sources, deep-researches each title with AI, validates URLs, and upserts to DB.
          </p>
        </div>

        <ol className="space-y-2">
          {[
            "Scrapes 9 sources (aggregators + direct gov portals)",
            "AI deep-researches each notification",
            "Validates every URL — fixes 404s via Serper.dev",
            "Upserts to database (smart-merge, never loses data)",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <LimitPicker
          label="Notifications to research"
          value={scrapeLimit}
          onChange={setScrapeLimit}
          customValue={scrapeCustom}
          onCustomChange={setScrapeCustom}
          accentClass="bg-indigo-600 border border-indigo-500"
          includeAll
        />

        {scrape.error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {scrape.error}
          </div>
        )}
        {scrape.success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {scrape.success}
          </div>
        )}

        <button
          onClick={handleTrigger}
          disabled={anyRunning}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          {scrape.running
            ? "Triggering…"
            : effectiveScrapeLimit === 0
            ? "Run Full Scrape"
            : `Run Full Scrape (${effectiveScrapeLimit})`}
        </button>
      </div>

      {/* ── News Scraper ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 mb-5 space-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">News Scraper</p>
          <p className="text-sm text-gray-400">
            Pulls fresh finance & business articles from RSS feeds, enriches them with GPT-4o, and upserts to DB.
          </p>
        </div>

        <ol className="space-y-2">
          {[
            "Fetches articles from 15+ RSS sources (ET, Moneycontrol, Mint, BS, NDTV Profit…)",
            "Extracts full article text via trafilatura for grounded AI enrichment",
            "GPT-4o rewrites with journalism structure — lead, quotes, context, conclusion",
            "Upserts to news_articles — skips already-published slugs",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <LimitPicker
          label="Articles to enrich"
          value={newsLimit}
          onChange={setNewsLimit}
          customValue={newsCustom}
          onCustomChange={setNewsCustom}
          accentClass="bg-emerald-600 border border-emerald-500"
        />

        {news.error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {news.error}
          </div>
        )}
        {news.success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {news.success}
          </div>
        )}

        <button
          onClick={handleNewsScrape}
          disabled={anyRunning}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Newspaper className={`w-4 h-4 ${news.running ? "animate-pulse" : ""}`} />
          {news.running ? "Triggering…" : `Run News Scraper (${effectiveNewsLimit} articles)`}
        </button>
      </div>

      {/* ── Refill Mode ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 mb-5 space-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Refill Old Notifications</p>
          <p className="text-sm text-gray-400">
            Re-researches existing DB notifications that are missing key fields — exam date, vacancies,
            eligibility, etc. Does <strong className="text-white">not</strong> scrape any websites;
            only enriches what&apos;s already in your database.
          </p>
        </div>

        <ol className="space-y-2">
          {[
            "Queries DB for notifications with null exam_date, deadline, or sparse details",
            "AI re-researches each one with the improved prompt",
            "Validates and fixes broken/aggregator URLs",
            "Smart-merges — only fills gaps, never overwrites good data",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <LimitPicker
          label="Notifications to refill"
          value={refillLimit}
          onChange={setRefillLimit}
          customValue={refillCustom}
          onCustomChange={setRefillCustom}
          accentClass="bg-cyan-600 border border-cyan-500"
        />

        {refill.error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {refill.error}
          </div>
        )}
        {refill.success && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {refill.success}
          </div>
        )}

        <button
          onClick={handleRefill}
          disabled={anyRunning}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refill.running ? "animate-spin" : ""}`} />
          {refill.running ? "Triggering…" : `Refill ${effectiveRefillLimit} Notifications`}
        </button>
      </div>

      {/* ── Warning ───────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
        <p className="font-bold mb-1">Note</p>
        <p>
          All actions run asynchronously on the scraper server and may take several minutes.
          Check <Link href="/admin/scraper-logs" className="underline hover:text-amber-200">Scraper Logs</Link> for progress.
        </p>
      </div>
    </main>
  );
}
