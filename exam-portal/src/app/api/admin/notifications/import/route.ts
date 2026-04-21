import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabase-server";

// Expected CSV columns (header row required):
// title, link, source, deadline, exam_date, ai_summary
// All columns except title are optional.
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").replace(/^"|"$/g, "");
    });
    return row;
  });
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100) + "-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  const contentType = request.headers.get("content-type") ?? "";
  let rows: Record<string, string>[] = [];

  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    const text = await request.text();
    rows = parseCSV(text);
  } else {
    // Assume JSON body with { csv: "..." }
    const body = await request.json().catch(() => ({}));
    if (typeof body.csv === "string") {
      rows = parseCSV(body.csv);
    } else {
      return NextResponse.json({ error: "Send CSV text in body with Content-Type: text/csv or JSON {csv: string}" }, { status: 400 });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
  }

  const MAX_ROWS = 200;
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const toInsert = rows
    .filter((r) => r.title?.trim())
    .map((r) => ({
      title: r.title.trim(),
      slug: slugify(r.title),
      link: r.link?.trim() || "",
      source: r.source?.trim() || "Manual Import",
      deadline: r.deadline?.trim() || null,
      exam_date: r.exam_date?.trim() || null,
      ai_summary: r.ai_summary?.trim() || r.summary?.trim() || "",
      is_active: true,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ error: "All rows missing required 'title' column" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert(toInsert)
    .select("id, title");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    imported: data?.length ?? 0,
    skipped: rows.length - toInsert.length,
  }, { status: 201 });
}
