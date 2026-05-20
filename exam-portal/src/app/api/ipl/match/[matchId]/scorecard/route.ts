import { NextResponse } from "next/server";
import { CB_BASE, cbFetchWithRetry } from "@/lib/cricbuzz";

/**
 * Full match scorecard via Cricbuzz /mcenter/v1/{matchId}/scard
 *
 * Returns both innings scorecards with:
 * - Batting: batsman name, runs, balls, 4s, 6s, strike rate, dismissal info
 * - Bowling: bowler name, overs, maidens, runs, wickets, economy, extras
 * - Extras breakdown (wides, no-balls, byes, leg byes)
 * - Fall of wickets
 * - Yet to bat list
 * - Match result string
 *
 * Cached for 60s on live matches; served stale for completed matches.
 */
export const revalidate = 60;
const CACHE_LIVE = 60;
const CACHE_COMPLETE = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  try {
    const res = await cbFetchWithRetry(
      `${CB_BASE}/mcenter/v1/${matchId}/scard`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Cricbuzz returned ${res.status}` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const raw = await res.json();
    const normalized = normalizeScard(raw);

    const isLive = normalized.matchHeader?.state === "In Progress";
    const cacheTtl = isLive ? CACHE_LIVE : CACHE_COMPLETE;

    return NextResponse.json(normalized, {
      headers: {
        "Cache-Control": `public, s-maxage=${cacheTtl}, stale-while-revalidate=${cacheTtl}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── Normalization ────────────────────────────────────────────────────────────

type RawBatsman = Record<string, unknown>;
type RawBowler  = Record<string, unknown>;
type RawInnings = Record<string, unknown>;

interface NormalizedBatsman {
  id: number;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissalInfo: string;
  isOut: boolean;
}

interface NormalizedBowler {
  id: number;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

interface NormalizedInnings {
  inningsId: number;
  teamName: string;
  teamShortName: string;
  totalRuns: number;
  totalWickets: number;
  totalOvers: string;
  extras: { total: number; wides: number; noBalls: number; byes: number; legByes: number; penalty: number };
  batting: NormalizedBatsman[];
  bowling: NormalizedBowler[];
  yetToBat: string[];
  fallOfWickets: Array<{ wicket: number; runs: number; playerName: string; overs: string }>;
  totalString: string;
}

interface NormalizedScard {
  matchId: string;
  matchHeader: {
    state: string;
    status: string;
    result: string;
    seriesName: string;
    matchDescription: string;
    venue: string;
    startDate: string;
  };
  innings: NormalizedInnings[];
}

function normalizeScard(raw: Record<string, unknown>): NormalizedScard {
  const header    = (raw.matchHeader ?? {}) as Record<string, unknown>;
  const scardData = (raw.scoreCard ?? []) as RawInnings[];

  const innings: NormalizedInnings[] = scardData.map((inn) => {
    const batTeam  = (inn.batTeamDetails ?? {}) as Record<string, unknown>;
    const bowlCard = (inn.bowlTeamDetails ?? {}) as Record<string, unknown>;
    const score    = (inn.scoreDetails ?? {})   as Record<string, unknown>;

    // Batting
    const batsmenMap = (batTeam.batsmenData ?? {}) as Record<string, RawBatsman>;
    const batting: NormalizedBatsman[] = Object.values(batsmenMap)
      .filter((b) => !b.isHeader)
      .map((b) => ({
        id:            Number(b.batId ?? 0),
        name:          String(b.batName ?? ""),
        runs:          Number(b.runs ?? 0),
        balls:         Number(b.balls ?? 0),
        fours:         Number(b.fours ?? 0),
        sixes:         Number(b.sixes ?? 0),
        strikeRate:    Number(b.strikeRate ?? 0),
        dismissalInfo: String(b.outDesc ?? (b.isOverseas ? "" : "")),
        isOut:         Boolean(b.isOverseas ?? false) || String(b.outDesc ?? "").length > 0,
      }));

    // Bowling
    const bowlersMap = (bowlCard.bowlersData ?? {}) as Record<string, RawBowler>;
    const bowling: NormalizedBowler[] = Object.values(bowlersMap)
      .filter((b) => !b.isHeader)
      .map((b) => ({
        id:       Number(b.bowlId ?? 0),
        name:     String(b.bowlName ?? ""),
        overs:    String(b.overs ?? "0"),
        maidens:  Number(b.maidens ?? 0),
        runs:     Number(b.runs ?? 0),
        wickets:  Number(b.wickets ?? 0),
        economy:  Number(b.economy ?? 0),
        wides:    Number(b.wides ?? 0),
        noBalls:  Number(b.noBalls ?? 0),
      }));

    // Extras
    const extrasData = (inn.extrasData ?? {}) as Record<string, unknown>;
    const extras = {
      total:   Number(extrasData.total   ?? 0),
      wides:   Number(extrasData.wides   ?? 0),
      noBalls: Number(extrasData.noBalls ?? 0),
      byes:    Number(extrasData.byes    ?? 0),
      legByes: Number(extrasData.legByes ?? 0),
      penalty: Number(extrasData.penalty ?? 0),
    };

    // Yet to bat
    const yetToBat: string[] = ((batTeam.batsmenData ?? {}) as Record<string, RawBatsman>)
      ? Object.values((batTeam.batsmenData ?? {}) as Record<string, RawBatsman>)
          .filter((b) => b.isOverseas === undefined && !b.runs && !b.balls && !b.outDesc)
          .map((b) => String(b.batName ?? ""))
          .filter(Boolean)
      : [];

    // Fall of wickets
    const fowData = (inn.wicketsData ?? {}) as Record<string, Record<string, unknown>>;
    const fallOfWickets = Object.values(fowData).map((fow) => ({
      wicket:     Number(fow.wktNbr ?? 0),
      runs:       Number(fow.wktRuns ?? 0),
      playerName: String(fow.batName ?? ""),
      overs:      String(fow.wktOver ?? ""),
    }));

    const scoreStr = `${score.runs ?? 0}/${score.wickets ?? 0}${score.overs ? ` (${score.overs} Ov)` : ""}`;

    return {
      inningsId:      Number(inn.inningsId ?? 0),
      teamName:       String(batTeam.batTeamName ?? ""),
      teamShortName:  String(batTeam.batTeamShortName ?? ""),
      totalRuns:      Number(score.runs ?? 0),
      totalWickets:   Number(score.wickets ?? 0),
      totalOvers:     String(score.overs ?? ""),
      extras,
      batting,
      bowling,
      yetToBat,
      fallOfWickets,
      totalString:    scoreStr,
    };
  });

  const matchDesc = String(
    (header.matchDescription ?? "") ||
    ((header.team1 as Record<string, unknown>)?.name ?? "") + " vs " +
    ((header.team2 as Record<string, unknown>)?.name ?? "")
  );

  return {
    matchId,
    matchHeader: {
      state:            String(header.state         ?? ""),
      status:           String(header.status        ?? ""),
      result:           String(header.result        ?? ""),
      seriesName:       String(header.seriesName    ?? "IPL 2026"),
      matchDescription: matchDesc,
      venue:            String((header.venue as Record<string, unknown>)?.name ?? ""),
      startDate:        String(header.startDate     ?? ""),
    },
    innings,
  };
}
