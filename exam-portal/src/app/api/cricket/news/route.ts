import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";
import { createServiceRoleClient } from "@/lib/supabase-server";

export const revalidate = 900;

// Fire-and-forget: upsert incoming stories into cricket_news table
async function syncNewsToDB(storyList: unknown[]) {
  try {
    const supabase = createServiceRoleClient();
    const rows = (
      storyList as Array<{
        story?: {
          id?: number;
          hline?: string;
          intro?: string;
          pubTime?: number | string;
          imageId?: number | string;
        };
      }>
    )
      .filter((item) => item?.story?.id)
      .map((item) => ({
        id: item.story!.id!,
        headline: item.story!.hline ?? "",
        intro: item.story!.intro ?? null,
        publish_time: item.story!.pubTime ? Number(item.story!.pubTime) : null,
        cover_image_id: item.story!.imageId != null ? Number(item.story!.imageId) : null,
      }));

    if (rows.length === 0) return;
    await supabase.from("cricket_news").upsert(rows, {
      onConflict: "id",
      ignoreDuplicates: true,
    });
  } catch (err) {
    console.error("[cricket/news] syncNewsToDB error:", err);
  }
}

export async function GET() {
  try {
    // 1. Fetch latest from Cricbuzz and sync to DB (fire-and-forget)
    fetch(`${CB_BASE}/news/v1/index`, {
      headers: cbHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.storyList ? syncNewsToDB(data.storyList) : null)
      .catch(() => {});

    // 2. Return accumulated stories from DB (grows over time)
    const supabase = createServiceRoleClient();
    const { data: dbNews } = await supabase
      .from("cricket_news")
      .select("id, headline, intro, cover_image_id, publish_time")
      .order("publish_time", { ascending: false })
      .limit(60);

    // Shape into { storyList: [{ story: {...} }] } — same format pages expect
    const storyList = (dbNews ?? []).map((row) => ({
      story: {
        id: row.id,
        hline: row.headline,
        intro: row.intro,
        imageId: row.cover_image_id,
        pubTime: row.publish_time,
      },
    }));

    return NextResponse.json(
      { storyList },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
