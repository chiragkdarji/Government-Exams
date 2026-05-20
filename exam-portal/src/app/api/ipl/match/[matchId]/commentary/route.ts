import { NextResponse } from "next/server";
import { CB_BASE, cbFetchWithRetry } from "@/lib/cricbuzz";

export const revalidate = 30;
const CACHE_TTL = 30;

type CommItem = {
  overnum?: number;
  timestamp?: number;
  commtxt?: string;
  inningsid?: number;
  eventtype?: string;
  ballnbr?: number;
};

type GroupedOver = {
  overNum: number;
  overSummary: string;
  inningsId: number;
  balls: CommItem[];
  runs?: number;
  wickets?: number;
};

/**
 * Match commentary endpoint.
 *
 * Returns two data shapes:
 *  - `comwrapper`: flat list (backward-compatible with existing UI)
 *  - `groupedByOver`: balls grouped into overs with over header + summary
 *    Use this for the "Over X: X/Y — commentary" style display.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    const [commRes, oversRes] = await Promise.all([
      cbFetchWithRetry(`${CB_BASE}/mcenter/v1/${matchId}/comm`, { cache: "no-store" }),
      cbFetchWithRetry(`${CB_BASE}/mcenter/v1/${matchId}/overs`, { cache: "no-store" }),
    ]);

    const [commData, oversData] = await Promise.all([
      commRes.ok ? commRes.json() : null,
      oversRes.ok ? oversRes.json() : null,
    ]);

    // ── Flat ball-by-ball list (newest first) ─────────────────────────────
    const comwrapper: { commentary?: CommItem }[] = commData?.comwrapper ?? [];
    const recentBalls: CommItem[] = comwrapper
      .map((w) => w.commentary)
      .filter((c): c is CommItem => !!c && (c.overnum ?? 0) > 0);

    const recentOvers = new Set(recentBalls.map((b) => Math.floor(b.overnum ?? 0)));

    const oversepList: {
      overnum?: number;
      inningsid?: number;
      score?: number;
      wickets?: number;
      runs?: number;
      oversummary?: string;
      battingteamname?: string;
      timestamp?: number;
    }[] = oversData?.overseplist?.oversep ?? [];

    // Build over-summary lookup for quick access when grouping
    const overSummaryMap = new Map<string, { summary: string; runs: number; wickets: number }>();
    for (const ov of oversepList) {
      const key = `${ov.inningsid}-${Math.floor(ov.overnum ?? 0)}`;
      overSummaryMap.set(key, {
        summary: ov.oversummary?.trim() ?? "",
        runs:    ov.runs ?? 0,
        wickets: ov.wickets ?? 0,
      });
    }

    const overSummaryItems: CommItem[] = oversepList
      .filter((ov) => {
        const ovInt = Math.floor(ov.overnum ?? 0);
        return ovInt > 0 && !recentOvers.has(ovInt);
      })
      .map((ov) => ({
        overnum:   ov.overnum,
        inningsid: ov.inningsid,
        timestamp: ov.timestamp,
        commtxt:   `Over ${Math.floor(ov.overnum ?? 0)} — ${ov.battingteamname ?? ""}: ${ov.runs ?? 0} runs${ov.oversummary ? ` (${ov.oversummary.trim()})` : ""}`,
        eventtype: "over-summary",
      }));

    const allItems = [...recentBalls, ...overSummaryItems];
    const mergedComwrapper = allItems.map((c) => ({ commentary: c }));

    // ── Grouped-by-over structure ─────────────────────────────────────────
    // Group only real ball-by-ball items (not the over-summary placeholders)
    const groupedMap = new Map<string, GroupedOver>();

    for (const ball of recentBalls) {
      const overNum   = Math.floor(ball.overnum ?? 0);
      const inningsId = ball.inningsid ?? 1;
      const key       = `${inningsId}-${overNum}`;

      if (!groupedMap.has(key)) {
        const ovData = overSummaryMap.get(key);
        groupedMap.set(key, {
          overNum,
          inningsId,
          overSummary: ovData?.summary ?? "",
          runs:        ovData?.runs,
          wickets:     ovData?.wickets,
          balls:       [],
        });
      }
      groupedMap.get(key)!.balls.push(ball);
    }

    // Sort overs: highest first (most recent first)
    const groupedByOver = Array.from(groupedMap.values()).sort(
      (a, b) => b.overNum - a.overNum || b.inningsId - a.inningsId
    );

    return NextResponse.json(
      {
        comwrapper: mergedComwrapper,
        groupedByOver,
        miniscore: commData?.miniscore ?? null,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL / 2}`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
