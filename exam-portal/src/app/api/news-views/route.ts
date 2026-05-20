import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (!slug || typeof slug !== "string" || slug.length > 200) {
      return NextResponse.json({ error: "invalid slug" }, { status: 400 });
    }

    // Bot detection — skip headless requests
    const ua = req.headers.get("user-agent") ?? "";
    if (/bot|crawl|spider|headless|prerender/i.test(ua)) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceRoleClient();
    await supabase.rpc("increment_news_view", { article_slug: slug }).maybeSingle();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // non-critical, always 200
  }
}
