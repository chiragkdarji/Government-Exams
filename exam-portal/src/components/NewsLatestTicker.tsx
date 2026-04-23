"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Headline {
  slug: string;
  headline: string;
  category: string;
}

const CATEGORY_ACCENT: Record<string, string> = {
  finance:  "#3b82f6",
  business: "#a855f7",
  markets:  "#22c55e",
  economy:  "#f59e0b",
  startups: "#f43f5e",
};

export default function NewsLatestTicker() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch("/api/news-latest")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d) && d.length > 0) setHeadlines(d); })
      .catch(() => {});
  }, []);

  const goTo = useCallback((next: number) => {
    setVisible(false);
    setTimeout(() => { setIndex(next); setVisible(true); }, 200);
  }, []);

  const prevFn = () => goTo((index - 1 + headlines.length) % headlines.length);
  const nextFn = useCallback(() => goTo((index + 1) % headlines.length), [goTo, index, headlines.length]);

  useEffect(() => {
    if (headlines.length === 0) return;
    const id = setInterval(nextFn, 5000);
    return () => clearInterval(id);
  }, [nextFn, headlines.length]);

  if (headlines.length === 0) return null;

  const current = headlines[index];
  const accent = CATEGORY_ACCENT[current.category] ?? "#f0a500";

  return (
    <div
      className="hidden sm:flex items-center gap-0 ml-auto shrink-0 pl-3"
      style={{ borderLeft: "1px solid #374151" }}
    >
      {/* LATEST label */}
      <span
        className="shrink-0 text-[9px] font-black uppercase tracking-[0.22em] pr-3 mr-3"
        style={{ color: "#f0a500", borderRight: "1px solid #374151" }}
      >
        Latest
      </span>

      {/* Category badge */}
      <span
        className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] mr-2"
        style={{ color: accent }}
      >
        {current.category}
      </span>

      {/* Rotating headline */}
      <Link
        href={`/news/${current.slug}`}
        className="text-[11px] max-w-[220px] xl:max-w-[300px] truncate transition-opacity"
        style={{
          color: "#c8c4bc",
          opacity: visible ? 1 : 0,
          fontFamily: "'DM Serif Display', 'Georgia', serif",
        }}
        title={current.headline}
      >
        {current.headline}
      </Link>

      {/* Counter + nav arrows */}
      <div className="flex items-center gap-1 ml-2 pl-2" style={{ borderLeft: "1px solid #374151" }}>
        <span className="text-[9px] tabular-nums" style={{ color: "#4b5563" }}>
          {index + 1}/{headlines.length}
        </span>
        <button
          onClick={prevFn}
          aria-label="Previous"
          className="flex items-center justify-center w-5 h-5"
          style={{ color: "#7c7888", background: "none", border: "none", cursor: "pointer" }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          onClick={nextFn}
          aria-label="Next"
          className="flex items-center justify-center w-5 h-5"
          style={{ color: "#7c7888", background: "none", border: "none", cursor: "pointer" }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
