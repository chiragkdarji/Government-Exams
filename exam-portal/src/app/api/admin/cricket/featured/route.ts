import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") ?? "";

  let query = supabase
    .from("cricket_featured")
    .select("*")
    .order("sort_order", { ascending: true });

  if (section) query = query.eq("section", section);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const body = await request.json().catch(() => ({}));

  const { section, match_id, custom_headline, custom_image_url, sort_order } = body;
  if (!section) return NextResponse.json({ error: "section is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("cricket_featured")
    .insert({
      section,
      match_id: match_id ?? null,
      custom_headline: custom_headline ?? null,
      custom_image_url: custom_image_url ?? null,
      sort_order: sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
