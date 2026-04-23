import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export const revalidate = 600;

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("news_articles")
      .select("slug, headline, category")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(12);

    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
