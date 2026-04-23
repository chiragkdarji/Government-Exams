import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID, IPL_TEAM_TO_SQUAD_ID, IPL_TEAMS } from "@/lib/cricbuzz";

const REVALIDATE = 1800;
export const revalidate = 1800;

const VALID_STATS_TYPES = [
  "mostRuns", "mostWickets", "mostFours", "mostSixes",
  "mostFifties", "mostHundreds", "bestBattingAverage", "bestBattingStrikeRate",
  "bestBowlingAverage", "bestBowlingEconomy", "bestBowlingStrikeRate", "mostFiveWickets",
];

type SquadPlayer = { id?: string; name?: string; imageId?: number; role?: string; battingStyle?: string; bowlingStyle?: string; isHeader?: boolean };
type PlayerMeta = { imageId: number; teamSName: string };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawType = url.searchParams.get("type") ?? "mostRuns";
    const statsType = VALID_STATS_TYPES.includes(rawType) ? rawType : "mostRuns";

    const squadEntries = Object.entries(IPL_TEAM_TO_SQUAD_ID) as [string, number][];
    const teamIdToAbbr: Record<number, string> = {};
    for (const [abbr, team] of Object.entries(IPL_TEAMS)) teamIdToAbbr[team.id] = abbr;

    // Fetch stats + squads in parallel
    const [statsRes, ...squadSettled] = await Promise.all([
      fetch(`${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}?statsType=${statsType}`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      ...squadEntries.map(([, squadId]) =>
        fetch(`${CB_BASE}/series/v1/${IPL_SERIES_ID}/squads/${squadId}`, {
          headers: cbHeaders(),
          next: { revalidate: 21600 },
        }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      ),
    ]);

    const statsData = statsRes.ok ? await statsRes.json() : null;

    // Build playerMeta from squad data for imageId enrichment
    const playerMeta: Record<string, PlayerMeta> = {};
    const dbRows: { id: number; data: Record<string, unknown>; teamSName: string }[] = [];

    for (let i = 0; i < squadEntries.length; i++) {
      const [teamIdStr] = squadEntries[i];
      const abbr = teamIdToAbbr[Number(teamIdStr)] ?? "";
      const squad = squadSettled[i];
      if (!Array.isArray(squad?.player)) continue;
      for (const p of squad.player as SquadPlayer[]) {
        if (!p.id || p.isHeader) continue;
        if (p.imageId) playerMeta[p.id] = { imageId: p.imageId, teamSName: abbr };
        dbRows.push({
          id: Number(p.id),
          data: { info: { id: p.id, name: p.name, role: p.role, imageId: p.imageId, battingStyle: p.battingStyle, bowlingStyle: p.bowlingStyle }, name: p.name ?? "" },
          teamSName: abbr,
        });
      }
    }

    persistSquadPlayers(dbRows).catch(() => {});

    // Enrich each player value with imageId + teamSName from squad data if not already present
    if (statsData?.t20StatsList?.[0]?.values) {
      statsData.t20StatsList[0].values = (statsData.t20StatsList[0].values as Record<string, unknown>[]).map((p) => ({
        ...p,
        imageId: p.imageId ?? playerMeta[String(p.id)]?.imageId,
        teamSName: p.teamSName ?? playerMeta[String(p.id)]?.teamSName,
      }));
    }

    return NextResponse.json(
      { [statsType]: statsData, playerMeta },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=900`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function persistSquadPlayers(rows: { id: number; data: Record<string, unknown>; teamSName: string }[]) {
  if (rows.length === 0) return;
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    await supabase.from("ipl_players").upsert(
      rows.map((r) => ({ id: r.id, data: r.data, fetched_at: now, updated_at: now })),
      { onConflict: "id", ignoreDuplicates: true }
    );
  } catch {/* non-critical */}
}
