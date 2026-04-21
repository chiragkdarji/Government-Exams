import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const section = searchParams.get("section") ?? "";
  const search = searchParams.get("search") ?? "";
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("cricket_articles")
    .select("id, slug, title, section, author, is_published, featured, published_at, created_at", { count: "exact" });

  if (section) query = query.eq("section", section);
  if (search) query = query.ilike("title", `%${search}%`);

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    articles: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}

export async function POST(request: NextRequest) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const body = await request.json().catch(() => ({}));

  const { title, body: articleBody, section, cover_image_url, author, tags, is_published, featured } = body;
  if (!title || !section) {
    return NextResponse.json({ error: "title and section are required" }, { status: 400 });
  }
  if (!["cricket", "ipl"].includes(section)) {
    return NextResponse.json({ error: "section must be 'cricket' or 'ipl'" }, { status: 400 });
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100) + "-" + Date.now();

  const { data, error } = await supabase
    .from("cricket_articles")
    .insert({
      title,
      slug,
      body: articleBody ?? "",
      section,
      cover_image_url: cover_image_url ?? null,
      author: author ?? "Rizz Jobs Team",
      tags: tags ?? [],
      is_published: is_published ?? false,
      featured: featured ?? false,
      published_at: is_published ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
