// Provider partite/statistiche.
//
// Regola d'oro imparata oggi: il provider NON deve MAI far esplodere il sito.
// Se football-data.org risponde, usiamo i dati reali. Se non c'è la chiave, se
// la quota giornaliera è finita o se l'API va in errore, si passa in automatico
// al dataset interno deterministico e il sito continua a funzionare.
//
// football-data.org v4 — piano gratuito:
//   header: X-Auth-Token: <FOOTBALL_DATA_API_KEY>
//   endpoint: /v4/competitions/{CODE}/matches?dateFrom=&dateTo=
//   endpoint: /v4/competitions/{CODE}/standings

import { Fixture, TeamForm } from "@/lib/types";
import { seededRandom } from "@/lib/engine/seed";

const BASE = "https://api.football-data.org/v4";
const KEY = process.env.FOOTBALL_DATA_API_KEY ?? process.env.FOOTBALL_API_KEY ?? "";

export const COMPETITIONS: { code: string; slug: string; label: string }[] = [
  { code: "SA", slug: "serie-a", label: "Serie A" },
  { code: "PL", slug: "premier-league", label: "Premier League" },
  { code: "PD", slug: "la-liga", label: "LaLiga" },
  { code: "CL", slug: "champions-league", label: "Champions League" },
];

export type FixtureSource = "football-data.org" | "dataset interno (fallback)";

export async function fetchTodayFixtures(
  dateISO: string
): Promise<{ fixtures: Fixture[]; source: FixtureSource; notice?: string }> {
  if (KEY) {
    try {
      const fixtures = await fetchReal(dateISO);
      if (fixtures.length > 0) {
        return { fixtures, source: "football-data.org" };
      }
      return {
        fixtures: buildFallback(dateISO),
        source: "dataset interno (fallback)",
        notice: "football-data.org non ha restituito partite per oggi nei 4 tornei monitorati.",
      };
    } catch (err: any) {
      return {
        fixtures: buildFallback(dateISO),
        source: "dataset interno (fallback)",
        notice: `football-data.org non raggiungibile (${err?.message ?? "errore"}). Uso il dataset interno.`,
      };
    }
  }

  return {
    fixtures: buildFallback(dateISO),
    source: "dataset interno (fallback)",
    notice: "FOOTBALL_DATA_API_KEY non configurata: Beppe lavora sul dataset interno.",
  };
}

/* ------------------------------------------------------------------ REALE */

async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": KEY },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`football-data ${res.status}`);
  return res.json();
}

async function fetchReal(dateISO: string): Promise<Fixture[]> {
  const out: Fixture[] = [];

  for (const comp of COMPETITIONS) {
    let data: any;
    try {
      data = await apiGet(
        `/competitions/${comp.code}/matches?dateFrom=${dateISO}&dateTo=${dateISO}`
      );
    } catch {
      continue; // un torneo che fallisce non deve fermare gli altri
    }

    const table = await safeStandings(comp.code);

    for (const m of data?.matches ?? []) {
      if (m.status !== "TIMED" && m.status !== "SCHEDULED") continue;
      out.push({
        fixtureId: String(m.id),
        league: comp.slug,
        leagueLabel: comp.label,
        kickoff: m.utcDate,
        home: teamFromTable(table, m.homeTeam, "home"),
        away: teamFromTable(table, m.awayTeam, "away"),
      });
    }
  }

  return out;
}

async function safeStandings(code: string): Promise<any[]> {
  try {
    const data = await apiGet(`/competitions/${code}/standings`);
    const total = (data?.standings ?? []).find((s: any) => s.type === "TOTAL");
    return total?.table ?? [];
  } catch {
    return [];
  }
}

function teamFromTable(table: any[], team: any, side: "home" | "away"): TeamForm {
  const row = table.find((r: any) => r?.team?.id === team?.id);
  const played = Number(row?.playedGames ?? 0) || 1;
  const gf = Number(row?.goalsFor ?? 0) / played;
  const ga = Number(row?.goalsAgainst ?? 0) / played;

  const form: string = row?.form ?? "";
  const recentResults = form
    .split(",")
    .map((c: string) => c.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((c: string) => (c === "W" ? 3 : c === "D" ? 1 : 0));

  return {
    teamId: String(team?.id ?? team?.name ?? "n/d"),
    teamName: team?.shortName ?? team?.name ?? "Squadra",
    recentResults: recentResults.length ? recentResults : [1, 1, 1],
    goalsFor: round2(gf),
    goalsAgainst: round2(ga),
    xg: round2(gf),   // il piano free non espone xG: usiamo i gol come proxy dichiarato
    xga: round2(ga),
    homeAway: side,
    restDays: 4,
    keyAbsences: [],
    matchesPlayed: played,
    cleanSheetRate: clamp01(1 - ga / 2.2),
    scoringRate: clamp01(gf / 2.2),
    bttsRate: clamp01((gf + ga) / 4.2),
    over25Rate: clamp01((gf + ga) / 3.6),
  };
}

/* -------------------------------------------------------------- FALLBACK */

const POOL: { league: string; label: string; home: string; away: string }[] = [
  { league: "serie-a", label: "Serie A", home: "Inter", away: "Cagliari" },
  { league: "serie-a", label: "Serie A", home: "Napoli", away: "Lecce" },
  { league: "serie-a", label: "Serie A", home: "Atalanta", away: "Verona" },
  { league: "serie-a", label: "Serie A", home: "Milan", away: "Udinese" },
  { league: "serie-a", label: "Serie A", home: "Juventus", away: "Empoli" },
  { league: "premier-league", label: "Premier League", home: "Manchester City", away: "Brentford" },
  { league: "premier-league", label: "Premier League", home: "Arsenal", away: "Wolves" },
  { league: "premier-league", label: "Premier League", home: "Liverpool", away: "Everton" },
  { league: "la-liga", label: "LaLiga", home: "Real Madrid", away: "Getafe" },
  { league: "la-liga", label: "LaLiga", home: "Barcelona", away: "Osasuna" },
  { league: "champions-league", label: "Champions League", home: "Bayern", away: "Celtic" },
  { league: "champions-league", label: "Champions League", home: "PSG", away: "Salisburgo" },
];

export function buildFallback(dateISO: string): Fixture[] {
  const rnd = seededRandom(`${dateISO}:fixtures`);
  const shuffled = [...POOL].sort(() => rnd() - 0.5);
  const count = 4 + Math.floor(rnd() * 3); // 4-6 partite al giorno

  return shuffled.slice(0, count).map((p, i) => {
    const r = seededRandom(`${dateISO}:${p.home}:${p.away}`);
    const homeStrength = 1.25 + r() * 1.25;   // 1.25 - 2.50 gol attesi
    const awayStrength = 0.70 + r() * 1.05;   // 0.70 - 1.75
    const hour = 15 + Math.floor(r() * 6);

    return {
      fixtureId: `${dateISO}-${p.home}-${p.away}`.replace(/\s+/g, "_"),
      league: p.league,
      leagueLabel: p.label,
      kickoff: `${dateISO}T${String(hour).padStart(2, "0")}:00:00Z`,
      home: synthTeam(p.home, homeStrength, awayStrength * 0.75, "home", r),
      away: synthTeam(p.away, awayStrength, homeStrength * 0.85, "away", r),
    };
  });
}

function synthTeam(
  name: string,
  gf: number,
  ga: number,
  side: "home" | "away",
  r: () => number
): TeamForm {
  const played = 5 + Math.floor(r() * 4);
  const recentResults = Array.from({ length: 6 }, () => {
    const x = r();
    const bias = gf - ga;
    if (x < 0.32 + bias * 0.18) return 3;
    if (x < 0.62 + bias * 0.1) return 1;
    return 0;
  });

  return {
    teamId: name.toUpperCase().slice(0, 3),
    teamName: name,
    recentResults,
    goalsFor: round2(gf),
    goalsAgainst: round2(ga),
    xg: round2(gf * (0.9 + r() * 0.25)),
    xga: round2(ga * (0.9 + r() * 0.25)),
    homeAway: side,
    restDays: 3 + Math.floor(r() * 5),
    keyAbsences: r() > 0.7 ? ["un titolare in dubbio"] : [],
    matchesPlayed: played,
    cleanSheetRate: clamp01(1 - ga / 2.2),
    scoringRate: clamp01(gf / 2.2),
    bttsRate: clamp01((gf + ga) / 4.2),
    over25Rate: clamp01((gf + ga) / 3.6),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function clamp01(n: number) {
  return Math.max(0.05, Math.min(0.95, Math.round(n * 100) / 100));
}
