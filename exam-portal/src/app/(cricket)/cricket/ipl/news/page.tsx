import type { Metadata } from "next";
import IplNewsGrid, { type NewsItem } from "@/components/ipl/IplNewsGrid";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "IPL 2026 News | Rizz Jobs",
  description: "Latest IPL 2026 news, match updates, and player stories from Cricbuzz.",
};

export default async function IplNewsPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let newsItems: NewsItem[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/news`, { next: { revalidate: 900 } });
    if (res.ok) {
      const data = await res.json();
      newsItems = (data?.storyList ?? [])
        .filter((n: { story?: unknown }) => n.story)
        .map((n: { story: NewsItem }) => n.story);
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold mb-6 uppercase tracking-wider"
        style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        IPL 2026 News
      </h1>
      {newsItems.length === 0 ? (
        <p className="text-sm" style={{ color: "#5A566A" }}>No news available yet.</p>
      ) : (
        <IplNewsGrid items={newsItems} />
      )}
    </div>
  );
}
