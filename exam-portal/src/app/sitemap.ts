import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const revalidate = 3600;

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
  const baseUrl = "https://rizzjobs.in";

  // --- Exam / Jobs section ---
  let notificationUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("notifications")
      .select("id, slug, created_at, updated_at");
    if (data) {
      notificationUrls = data.map((n) => ({
        url: `${baseUrl}/exam/${n.slug || n.id}`,
        lastModified: new Date(n.updated_at || n.created_at),
      }));
    }
  } catch (error) {
    console.error("Error fetching notifications for sitemap:", error);
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
        url: `${baseUrl}/jobs/${c.slug}`,
        lastModified: new Date(c.updated_at || Date.now()),
      }));
    }
  } catch (error) {
    console.error("Error fetching categories for sitemap:", error);
  }

  // --- Cricket / IPL section ---
  const cricketStaticUrls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/cricket`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/live`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/upcoming`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/rankings`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/records`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/news`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl/schedule`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl/points-table`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl/orange-cap`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl/purple-cap`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl/teams`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl/news`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl/stats`, lastModified: new Date() },
    { url: `${baseUrl}/cricket/ipl/fantasy`, lastModified: new Date() },
    ...IPL_TEAM_SLUGS.map((slug) => ({
      url: `${baseUrl}/cricket/ipl/teams/${slug}`,
      lastModified: new Date(),
    })),
  ];

  // --- News section ---
  const newsStaticUrls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/news`, lastModified: new Date() },
    { url: `${baseUrl}/news/finance`, lastModified: new Date() },
    { url: `${baseUrl}/news/business`, lastModified: new Date() },
    { url: `${baseUrl}/news/markets`, lastModified: new Date() },
    { url: `${baseUrl}/news/economy`, lastModified: new Date() },
    { url: `${baseUrl}/news/startups`, lastModified: new Date() },
  ];

  let newsArticleUrls: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase
      .from("news_articles")
      .select("slug, published_at, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(500);
    if (data) {
      newsArticleUrls = data.map((a) => ({
        url: `${baseUrl}/news/${a.slug}`,
        lastModified: new Date(a.updated_at || a.published_at),
      }));
    }
  } catch (error) {
    console.error("Error fetching news articles for sitemap:", error);
  }

  // --- Legal / static pages ---
  const legalUrls: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/about`, lastModified: new Date("2026-01-01") },
    { url: `${baseUrl}/contact`, lastModified: new Date("2026-01-01") },
    { url: `${baseUrl}/privacy`, lastModified: new Date("2026-01-01") },
    { url: `${baseUrl}/terms`, lastModified: new Date("2026-01-01") },
    { url: `${baseUrl}/disclaimer`, lastModified: new Date("2026-01-01") },
  ];

  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/jobs`, lastModified: new Date() },
    ...cricketStaticUrls,
    ...newsStaticUrls,
    ...legalUrls,
    ...categoryUrls,
    ...newsArticleUrls,
    ...notificationUrls,
  ];
}
