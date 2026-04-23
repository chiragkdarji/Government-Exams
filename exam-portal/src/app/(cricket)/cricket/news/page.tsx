import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Cricket News – Latest Updates | Rizz Jobs",
  description:
    "Latest cricket news, match reports, player updates and series previews from around the world.",
};

interface NewsStory {
  id: number;
  hline?: string;
  headline?: string;
  intro?: string;
  imageId?: number;
  pubTime?: string | number;
  seo?: string;
}

async function getNews(): Promise<NewsStory[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
    const res = await fetch(`${base}/api/cricket/news`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const data = await res.json() as { storyList?: { story?: NewsStory }[] };
    return (data.storyList ?? [])
      .filter((n) => n.story)
      .map((n) => n.story as NewsStory);
  } catch {
    return [];
  }
}

function timeAgo(pubTime: string | number | undefined): string {
  if (!pubTime) return "";
  const ms = Date.now() - Number(pubTime);
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function CricketNewsPage() {
  const stories = await getNews();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold mb-1"
        style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}
      >
        Cricket News
      </h1>
      <p className="text-sm mb-8" style={{ color: "#5A566A" }}>
        Latest updates · Match reports · Series news
      </p>

      {stories.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: "#5A566A" }}>
          No news available
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
          {stories.map((n) => {
            const headline = (n.hline ?? n.headline ?? "") as string;
            const ago = timeAgo(n.pubTime);

            return (
              <Link
                key={n.id}
                href={`/ipl/news/${n.id}`}
                className="flex gap-3 group py-3"
                style={{ borderBottom: "1px solid #1a1a22" }}
              >
                {/* Thumbnail */}
                {n.imageId ? (
                  <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[#12121A]">
                    <Image
                      src={`/api/ipl/image?id=${n.imageId}&type=news`}
                      alt={headline}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div
                    className="w-24 h-16 flex-shrink-0 rounded-lg flex items-center justify-center text-xl"
                    style={{ background: "#12121A" }}
                  >
                    🏏
                  </div>
                )}

                {/* Text */}
                <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
                  <p
                    className="text-sm font-semibold leading-snug line-clamp-3 group-hover:text-[#FFB800] transition-colors"
                    style={{ color: "#F0EDE8" }}
                  >
                    {headline}
                  </p>
                  {ago && (
                    <p className="text-[10px] mt-1" style={{ color: "#5A566A" }}>{ago}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
