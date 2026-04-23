"use client";

import { useState } from "react";
import IplNewsCard from "@/components/ipl/IplNewsCard";

export interface NewsItem {
  id: number | string;
  hline?: string;
  headline?: string;
  intro?: string;
  imageId?: number;
  pubTime?: number | string;
}

const PAGE_SIZE = 12;

export default function IplNewsGrid({ items }: { items: NewsItem[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goTo(p: number) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {pageItems.map((n) => (
          <IplNewsCard
            key={n.id as number}
            id={n.id as number}
            headline={(n.hline ?? n.headline ?? "") as string}
            intro={n.intro}
            imageId={n.imageId}
            publishTime={n.pubTime ? Number(n.pubTime) : undefined}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-30"
            style={{
              background: page === 1 ? "#2A2A3A" : "#FFB800",
              color: page === 1 ? "#5A566A" : "#12121A",
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goTo(p)}
              className="w-9 h-9 rounded text-sm font-bold transition-colors"
              style={{
                background: p === page ? "#FFB800" : "#2A2A3A",
                color: p === page ? "#12121A" : "#9A96A0",
              }}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => goTo(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-30"
            style={{
              background: page === totalPages ? "#2A2A3A" : "#FFB800",
              color: page === totalPages ? "#5A566A" : "#12121A",
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      )}

      {items.length > 0 && (
        <p className="text-center text-xs mt-3" style={{ color: "#5A566A" }}>
          Page {page} of {totalPages} · {items.length} articles
        </p>
      )}
    </>
  );
}
