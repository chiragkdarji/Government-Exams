import type { Metadata } from "next";
import IplNewsGrid, { type NewsItem } from "@/components/ipl/IplNewsGrid";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Cricket News – Latest Updates | Rizz Jobs",
  description:
    "Latest cricket news, match reports, player updates and series previews from around the world.",
};

async function getNews(): Promise<NewsItem[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
    const res = await fetch(`${base}/api/cricket/news`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const data = await res.json() as { storyList?: { story?: NewsItem }[] };
    return (data.storyList ?? [])
      .filter((n) => n.story)
      .map((n) => n.story as NewsItem);
  } catch {
    return [];
  }
}

export default async function CricketNewsPage() {
  const stories = await getNews();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold mb-1 uppercase tracking-wider"
        style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        Cricket News
      </h1>
      <p className="text-sm mb-6" style={{ color: "#5A566A" }}>
        Latest updates · Match reports · Series news
      </p>

      {stories.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: "#5A566A" }}>
          No news available
        </p>
      ) : (
        <IplNewsGrid items={stories} />
      )}
    </div>
  );
}
