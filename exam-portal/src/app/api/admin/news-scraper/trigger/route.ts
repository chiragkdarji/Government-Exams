import { requireAdmin } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

/**
 * Triggers the news scraper via GitHub Actions workflow_dispatch.
 * Accepts optional ?limit=<n> query param (default 10, max 50).
 *
 * Uses the same env vars as the jobs scraper trigger:
 *   GITHUB_OWNER, GITHUB_REPO, GITHUB_SCRAPER_TOKEN
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50).toString();

    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo  = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_SCRAPER_TOKEN;

    if (!githubOwner || !githubRepo || !githubToken) {
      return NextResponse.json(
        { error: "GitHub env vars not set (GITHUB_OWNER, GITHUB_REPO, GITHUB_SCRAPER_TOKEN)." },
        { status: 500 }
      );
    }

    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/news-scraper.yml/dispatches`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "master", inputs: { limit } }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("GitHub API error:", response.status, body);
      return NextResponse.json(
        { error: `GitHub Actions trigger failed (${response.status})` },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      status: "triggered",
      message: `News scraper dispatched (limit: ${limit} articles).`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
