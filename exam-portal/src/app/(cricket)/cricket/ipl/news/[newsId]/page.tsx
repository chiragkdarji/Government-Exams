import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import IplNewsCard from "@/components/ipl/IplNewsCard";

export const revalidate = 3600;

interface Props {
  params: Promise<{ newsId: string }>;
}

interface StoryItem {
  id: number | string;
  hline?: string;   // Cricbuzz API field
  headline?: string;
  intro?: string;
  imageId?: number;
  pubTime?: number | string;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { newsId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/news/${newsId}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const title = data?.headline ?? "IPL News";
      return { title: `${title} | Rizz Jobs` };
    }
  } catch {/* silently handle */}
  return { title: "IPL News | Rizz Jobs" };
}

function stripMarkers(text: string): string {
  return text.replace(/@[A-Z]\d+\$/g, "").trim();
}

async function fetchRelatedNews(excludeId: string, base: string): Promise<StoryItem[]> {
  try {
    const res = await fetch(`${base}/api/ipl/news`, { next: { revalidate: 900 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.storyList ?? [])
      .filter((n: { story?: unknown }) => n.story)
      .map((n: { story: StoryItem }) => n.story)
      .filter((s: StoryItem) => String(s.id) !== excludeId);
  } catch {
    return [];
  }
}

function SidebarItem({ id, headline, hline, imageId, pubTime }: StoryItem) {
  const title = hline ?? headline ?? "";
  const date = pubTime
    ? new Date(Number(pubTime)).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", timeZone: "Asia/Kolkata",
      })
    : "";
  return (
    <Link href={`/ipl/news/${id}`} className="flex gap-3 group">
      {imageId ? (
        <div className="relative w-20 h-14 flex-shrink-0 rounded overflow-hidden bg-[#2A2A3A]">
          <Image
            src={`/api/ipl/image?id=${imageId}&type=news`}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-20 h-14 flex-shrink-0 rounded bg-[#2A2A3A]" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-3 leading-snug group-hover:text-[#FFB800] transition-colors" style={{ color: "#F0EDE8" }}>
          {title}
        </p>
        {date && <p className="text-xs mt-1" style={{ color: "#5A566A" }}>{date}</p>}
      </div>
    </Link>
  );
}

export default async function NewsDetailPage({ params }: Props) {
  const { newsId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let article: {
    headline?: string;
    intro?: string;
    coverImage?: { id?: number | string };
    publishTime?: number | string;
    content?: Array<{
      content?: { contentType?: string; contentValue?: string; imageId?: number | string; caption?: string };
      ad?: unknown;
    }>;
  } | null = null;

  const [articleRes, relatedNews] = await Promise.all([
    fetch(`${base}/api/ipl/news/${newsId}`, { next: { revalidate: 3600 } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetchRelatedNews(newsId, base),
  ]);

  article = articleRes;

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "#5A566A" }}>Article not found.</p>
      </div>
    );
  }

  const publishDate = article.publishTime
    ? new Date(Number(article.publishTime)).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
      })
    : null;

  const contentBlocks = (article.content ?? [])
    .map((item) => item.content)
    .filter((c): c is NonNullable<typeof c> => !!c);

  const leftItems = relatedNews.slice(0, 10);
  const rightItems = relatedNews.slice(10, 20);
  const bottomItems = relatedNews.slice(20, 24);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-6 items-start">

        {/* Left Sidebar */}
        <aside className="hidden lg:block">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 pb-2" style={{ color: "#FFB800", borderBottom: "1px solid #2A2A3A" }}>
            Related News
          </h2>
          <div className="space-y-4">
            {leftItems.map((n) => (
              <SidebarItem key={n.id} {...n} />
            ))}
          </div>
        </aside>

        {/* Main Article */}
        <article>
          {article.coverImage?.id && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 bg-[#2A2A3A]">
              <Image
                src={`/api/ipl/image?id=${article.coverImage.id}&p=thumb`}
                alt={article.headline ?? ""}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <h1
            className="text-2xl md:text-3xl font-bold mb-3 leading-tight"
            style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
          >
            {article.headline}
          </h1>

          {publishDate && (
            <p className="text-xs mb-5" style={{ color: "#5A566A" }}>{publishDate}</p>
          )}

          {article.intro && (
            <p
              className="text-base mb-6 leading-relaxed font-semibold"
              style={{ color: "#9A96A0", borderLeft: "3px solid #FFB800", paddingLeft: "1rem" }}
            >
              {article.intro}
            </p>
          )}

          <div className="space-y-4">
            {contentBlocks.map((block, i) => {
              const type = (block.contentType ?? "").toLowerCase();
              const value = block.contentValue ?? "";

              if (type === "text" || type === "para" || type === "paragraph" || type === "p") {
                const text = stripMarkers(value);
                if (!text) return null;
                return (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: "#F0EDE8" }}>
                    {text}
                  </p>
                );
              }

              if (type === "h2" || type === "heading" || type === "subheading") {
                return (
                  <h2
                    key={i}
                    className="text-lg font-bold mt-6"
                    style={{ color: "#FFB800", fontFamily: "var(--font-ipl-display, sans-serif)" }}
                  >
                    {stripMarkers(value)}
                  </h2>
                );
              }

              if (type === "img" || type === "image") {
                const imgId = block.imageId ?? value;
                if (imgId && /^\d+$/.test(String(imgId))) {
                  return (
                    <div key={i} className="relative w-full aspect-video rounded-lg overflow-hidden bg-[#2A2A3A]">
                      <Image
                        src={`/api/ipl/image?id=${imgId}&p=thumb`}
                        alt={block.caption ?? ""}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {block.caption && (
                        <p className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-xs" style={{ background: "#00000088", color: "#F0EDE8" }}>
                          {block.caption}
                        </p>
                      )}
                    </div>
                  );
                }
              }

              if (value && isNaN(Number(value)) && !type.includes("img") && !type.includes("image")) {
                const text = stripMarkers(value);
                if (text) return (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: "#F0EDE8" }}>{text}</p>
                );
              }

              return null;
            })}

            {contentBlocks.length === 0 && (
              <p className="text-sm" style={{ color: "#5A566A" }}>Full content not available.</p>
            )}
          </div>

          {/* Mobile: show related news inline after article */}
          {relatedNews.length > 0 && (
            <div className="lg:hidden mt-10">
              <h2 className="text-xs font-bold uppercase tracking-widest mb-4 pb-2" style={{ color: "#FFB800", borderBottom: "1px solid #2A2A3A" }}>
                More IPL News
              </h2>
              <div className="space-y-4">
                {relatedNews.slice(0, 10).map((n) => (
                  <SidebarItem key={n.id} {...n} />
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Right Sidebar */}
        <aside className="hidden lg:block">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 pb-2" style={{ color: "#FFB800", borderBottom: "1px solid #2A2A3A" }}>
            More News
          </h2>
          <div className="space-y-4">
            {rightItems.map((n) => (
              <SidebarItem key={n.id} {...n} />
            ))}
          </div>
        </aside>
      </div>

      {/* Bottom: More IPL News cards */}
      {bottomItems.length > 0 && (
        <div className="mt-10 hidden lg:block">
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-4 pb-2"
            style={{ color: "#FFB800", borderBottom: "1px solid #2A2A3A" }}
          >
            More IPL News
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bottomItems.map((n) => (
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
        </div>
      )}
    </div>
  );
}
