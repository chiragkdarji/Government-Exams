import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const BASE = "https://rizzjobs.in";

const SECTION_COLORS: Record<string, { bg: string; accent: string; label: string }> = {
  cricket: { bg: "#0A0A0F", accent: "#FFB800", label: "Cricket" },
  ipl: { bg: "#0A0A0F", accent: "#FFB800", label: "IPL 2026" },
  news: { bg: "#070708", accent: "#f0a500", label: "News" },
  govjobs: { bg: "#030712", accent: "#6366f1", label: "Gov Jobs" },
};

async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "section";

  // Load Inter font (used across all cards)
  const interFontUrl = "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2";
  const fontData = await fetchFont(interFontUrl);

  const fonts = fontData
    ? [{ name: "Inter", data: fontData, style: "normal" as const, weight: 700 as const }]
    : [];

  // ── Section hub card ──────────────────────────────────────────────────────
  if (type === "section") {
    const section = searchParams.get("section") ?? "govjobs";
    const cfg = SECTION_COLORS[section] ?? SECTION_COLORS.govjobs;

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            background: cfg.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            position: "relative",
          }}
        >
          {/* Glow blob */}
          <div
            style={{
              position: "absolute",
              top: -100,
              left: -100,
              width: 500,
              height: 500,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${cfg.accent}33, transparent 70%)`,
            }}
          />
          {/* Site name */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: cfg.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                color: "#000",
                fontWeight: 700,
              }}
            >
              R
            </div>
            <span style={{ fontSize: 20, color: "#aaa", fontWeight: 700, letterSpacing: 4 }}>
              RIZZ JOBS
            </span>
          </div>
          {/* Section label */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: cfg.accent,
              letterSpacing: -2,
              marginBottom: 16,
            }}
          >
            {cfg.label}
          </div>
          <div style={{ fontSize: 22, color: "#666", letterSpacing: 2 }}>rizzjobs.in</div>
        </div>
      ),
      { width: 1200, height: 630, fonts }
    );
  }

  // ── Exam / Government Job card ────────────────────────────────────────────
  if (type === "exam") {
    const title = searchParams.get("title") ?? "Government Job Notification";
    const deadline = searchParams.get("deadline") ?? "";
    const category = searchParams.get("category") ?? "Gov Jobs";
    const truncTitle = title.length > 80 ? title.slice(0, 80) + "…" : title;

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            background: "#030712",
            display: "flex",
            flexDirection: "column",
            padding: "60px 80px",
            fontFamily: "Inter, sans-serif",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 600,
              height: 400,
              background: "radial-gradient(circle at 100% 100%, #6366f133, transparent 70%)",
            }}
          />
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#6366f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                R
              </div>
              <span style={{ fontSize: 16, color: "#6366f1", fontWeight: 700, letterSpacing: 3 }}>RIZZ JOBS</span>
            </div>
            <span
              style={{
                fontSize: 13,
                color: "#6366f1",
                background: "#6366f120",
                border: "1px solid #6366f140",
                borderRadius: 6,
                padding: "4px 12px",
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              {category.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.25,
              marginBottom: 32,
              flex: 1,
            }}
          >
            {truncTitle}
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {deadline && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#ef4444",
                  }}
                />
                <span style={{ fontSize: 16, color: "#ef4444", fontWeight: 700 }}>
                  Last Date: {deadline}
                </span>
              </div>
            )}
            <span style={{ fontSize: 16, color: "#444", marginLeft: "auto" }}>rizzjobs.in</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts }
    );
  }

  // ── IPL Match card ─────────────────────────────────────────────────────────
  if (type === "ipl-match") {
    const team1 = searchParams.get("team1") ?? "Team 1";
    const team2 = searchParams.get("team2") ?? "Team 2";
    const status = searchParams.get("status") ?? "";
    const isLive = searchParams.get("live") === "1";

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            background: "#0A0A0F",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            position: "relative",
          }}
        >
          {/* Glow */}
          <div
            style={{
              position: "absolute",
              top: -150,
              left: "50%",
              transform: "translateX(-50%)",
              width: 700,
              height: 400,
              background: "radial-gradient(circle, #FFB80022, transparent 70%)",
            }}
          />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            {isLive && (
              <div
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 6,
                  letterSpacing: 2,
                }}
              >
                LIVE
              </div>
            )}
            <span style={{ color: "#FFB800", fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>
              IPL 2026
            </span>
          </div>

          {/* Teams */}
          <div style={{ display: "flex", alignItems: "center", gap: 48, marginBottom: 32 }}>
            <span style={{ fontSize: 52, fontWeight: 700, color: "#fff" }}>{team1}</span>
            <span style={{ fontSize: 36, color: "#FFB800", fontWeight: 700 }}>VS</span>
            <span style={{ fontSize: 52, fontWeight: 700, color: "#fff" }}>{team2}</span>
          </div>

          {/* Status */}
          {status && (
            <div
              style={{
                fontSize: 18,
                color: "#aaa",
                textAlign: "center",
                maxWidth: 800,
                marginBottom: 48,
              }}
            >
              {status}
            </div>
          )}

          {/* Footer */}
          <div style={{ position: "absolute", bottom: 40, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, color: "#555", letterSpacing: 2 }}>RIZZ JOBS</span>
            <span style={{ color: "#333" }}>•</span>
            <span style={{ fontSize: 14, color: "#555" }}>rizzjobs.in/cricket/ipl</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts }
    );
  }

  // ── IPL Player card ────────────────────────────────────────────────────────
  if (type === "ipl-player") {
    const name = searchParams.get("name") ?? "Player Name";
    const team = searchParams.get("team") ?? "";
    const role = searchParams.get("role") ?? "Cricketer";

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            background: "#0A0A0F",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <span style={{ color: "#FFB800", fontSize: 16, fontWeight: 700, letterSpacing: 4 }}>
              IPL 2026
            </span>
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: -1 }}>
            {name}
          </div>
          {team && (
            <div style={{ fontSize: 24, color: "#FFB800", marginBottom: 8 }}>{team}</div>
          )}
          <div style={{ fontSize: 18, color: "#666" }}>{role}</div>
          <div style={{ position: "absolute", bottom: 40, fontSize: 14, color: "#444", letterSpacing: 2 }}>
            RIZZJOBS.IN
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts }
    );
  }

  // ── News section card ──────────────────────────────────────────────────────
  if (type === "news-section") {
    const category = searchParams.get("category") ?? "finance";
    const labels: Record<string, string> = {
      finance: "Finance News",
      business: "Business News",
      markets: "Markets",
      economy: "Economy",
      startups: "Startups",
    };
    const label = labels[category] ?? "News";

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            background: "#070708",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 500,
              height: 500,
              background: "radial-gradient(circle, #f0a50022, transparent 70%)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <span style={{ color: "#f0a500", fontSize: 16, fontWeight: 700, letterSpacing: 4 }}>
              RIZZ JOBS
            </span>
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#fff", marginBottom: 16 }}>{label}</div>
          <div style={{ fontSize: 20, color: "#666" }}>India&apos;s fastest financial news</div>
          <div style={{ position: "absolute", bottom: 40, fontSize: 14, color: "#444", letterSpacing: 2 }}>
            RIZZJOBS.IN/NEWS/{category.toUpperCase()}
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts }
    );
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#030712",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700, color: "#6366f1" }}>Rizz Jobs</div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
