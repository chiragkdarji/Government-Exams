import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const revalidate = 3600;

const BASE_URL = "https://rizzjobs.in";

const IPL_TEAM_SLUGS = [
  "mumbai-indians",
  "chennai-super-kings",
  "royal-challengers-bengaluru",
  "kolkata-knight-riders",
  "sunrisers-hyderabad",
  "delhi-capitals",
  "punjab-kings",
  "rajasthan-royals",
  "lucknow-super-giants",
  "gujarat-titans",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ─── Job / Exam section ───────────────────────────────────────────────────
  let notificationUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("notifications")
      .select("id, slug, created_at, updated_at")
      .eq("is_active", true);
    if (data) {
      notificationUrls = data.map((n) => ({
        url: `${BASE_URL}/exam/${n.slug || n.id}`,
        lastModified: new Date(n.updated_at || n.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error("Sitemap: failed to fetch notifications", error);
  }

  let categoryUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("sort_order");
    if (data) {
      categoryUrls = data.map((c) => ({
        url: `${BASE_URL}/jobs/${c.slug}`,
        lastModified: new Date(c.updated_at || Date.now()),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error("Sitemap: failed to fetch categories", error);
  }

  // ─── Cricket / IPL section ────────────────────────────────────────────────
  const cricketStaticUrls: MetadataRoute.Sitemap = [
    // Live pages: highest priority + always changing
    { url: `${BASE_URL}/cricket/live`,               lastModified: new Date(), changeFrequency: "always",  priority: 1.0 },
    { url: `${BASE_URL}/cricket/ipl`,                lastModified: new Date(), changeFrequency: "hourly",  priority: 1.0 },
    { url: `${BASE_URL}/cricket/ipl/points-table`,   lastModified: new Date(), changeFrequency: "hourly",  priority: 0.95 },
    { url: `${BASE_URL}/cricket/ipl/orange-cap`,     lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/cricket/ipl/purple-cap`,     lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/cricket/ipl/schedule`,       lastModified: new Date(), changeFrequency: "daily",   priority: 0.85 },
    { url: `${BASE_URL}/cricket/ipl/news`,           lastModified: new Date(), changeFrequency: "hourly",  priority: 0.85 },
    { url: `${BASE_URL}/cricket/ipl/teams`,          lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/cricket/ipl/stats`,          lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/cricket/ipl/fantasy`,        lastModified: new Date(), changeFrequency: "daily",   priority: 0.75 },
    { url: `${BASE_URL}/cricket`,                    lastModified: new Date(), changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE_URL}/cricket/upcoming`,           lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE_URL}/cricket/rankings`,           lastModified: new Date(), changeFrequency: "weekly",  priority: 0.75 },
    { url: `${BASE_URL}/cricket/records`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/cricket/news`,               lastModified: new Date(), changeFrequency: "hourly",  priority: 0.85 },
    ...IPL_TEAM_SLUGS.map((slug) => ({
      url: `${BASE_URL}/cricket/ipl/teams/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
  ];

  // ─── News section ─────────────────────────────────────────────────────────
  const newsStaticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/news`,            lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/news/finance`,    lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/news/business`,   lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/news/markets`,    lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE_URL}/news/economy`,    lastModified: new Date(), changeFrequency: "daily",  priority: 0.8 },
    { url: `${BASE_URL}/news/startups`,   lastModified: new Date(), changeFrequency: "daily",  priority: 0.8 },
  ];

  // Paginate news articles — no 500-item cap, fetch all in batches
  const newsArticleUrls: MetadataRoute.Sitemap = [];
  try {
    let offset = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from("news_articles")
        .select("slug, published_at, updated_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (!data || data.length === 0) break;

      for (const a of data) {
        const age = Date.now() - new Date(a.published_at).getTime();
        const oneDayMs = 86_400_000;
        newsArticleUrls.push({
          url: `${BASE_URL}/news/${a.slug}`,
          lastModified: new Date(a.updated_at || a.published_at),
          // Recent articles change more often (corrections, updates)
          changeFrequency: age < oneDayMs ? ("hourly" as const) : ("weekly" as const),
          priority: age < oneDayMs ? 0.9 : 0.7,
        });
      }

      if (data.length < batchSize) break;
      offset += batchSize;
    }
  } catch (error) {
    console.error("Sitemap: failed to fetch news articles", error);
  }

  // ─── Hub / jobs listing ───────────────────────────────────────────────────
  const hubUrls: MetadataRoute.Sitemap = [
    { url: BASE_URL,           lastModified: new Date(), changeFrequency: "daily",  priority: 1.0 },
    { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: "daily",  priority: 0.9 },
  ];

  // ─── Legal / static pages ────────────────────────────────────────────────
  const legalUrls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/about`,      lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/contact`,    lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/privacy`,    lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE_URL}/terms`,      lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE_URL}/disclaimer`, lastModified: new Date("2026-01-01"), changeFrequency: "yearly",  priority: 0.2 },
  ];

  return [
    ...hubUrls,
    ...cricketStaticUrls,
    ...newsStaticUrls,
    ...legalUrls,
    ...categoryUrls,
    ...newsArticleUrls,
    ...notificationUrls,
  ];
}
