// Adapter per API-Football (piano gratuito: 100 richieste/giorno).
// Fonte: https://www.api-football.com
// Free tier: nessun xG affidabile, nessun dato infortuni. Verifica sempre
// la risposta reale della tua chiave prima di fidarti del mapping sotto.

import { Fixture, TeamForm } from "@/lib/types";

const BASE = "https://v3.football.api-sports.io";
const KEY = process.env.FOOTBALL_API_KEY;

// Ridotti a 4 per restare dentro il limite di 100 richieste/giorno del piano free.
export const MONITORED_LEAGUES: Record<string, number> = {
  "serie-a": 135,
  "premier-league": 39,
  "la-liga": 140,
  "champions-league": 2,
};

function headers() {
  if (!KEY) {
    throw new Error("FOOTBALL_API_KEY non configurata: nessun dato reale può essere recuperato.");
  }
  return { "x-apisports-key": KEY };
}

async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers(), next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API-Football ${path} → ${res.status}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football errore: ${JSON.stringify(json.errors)}`);
  }
  return json;
}

export async function fetchTodayFixtures(dateISO: string): Promise<Fixture[]> {
  const season = new Date(dateISO).getMonth() >= 6 ? new Date(dateISO).getFullYear() : new Date(dateISO).getFullYear() - 1;
  const fixtures: Fixture[] = [];

  for (const [slug, leagueId] of Object.entries(MONITORED_LEAGUES)) {
    const data = await apiGet(`/fixtures?league=${leagueId}&season=${season}&date=${dateISO}`);
    for (const raw of data.response ?? []) {
      fixtures.push({
        fixtureId: String(raw.fixture.id),
        league: slug,
        kickoff: raw.fixture.date,
        home: await buildTeamForm(raw.teams.home.id, "home", leagueId, season),
        away: await buildTeamForm(raw.teams.away.id, "away", leagueId, season),
      });
    }
  }

  return fixtures;
}

async function buildTeamForm(teamId: number, side: "home" | "away", leagueId: number, season: number): Promise<TeamForm> {
  const data = await apiGet(`/teams/statistics?team=${teamId}&season=${season}&league=${leagueId}`);
  const stats = data.response;

  const form: string = stats?.form ?? "";
  const recentResults = form
    .split("")
    .slice(-6)
    .reverse()
    .map((c: string) => (c === "W" ? 3 : c === "D" ? 1 : 0));

  return {
    teamId: String(teamId),
    teamName: stats?.team?.name ?? "Squadra",
    recentResults,
    goalsFor: Number(stats?.goals?.for?.average?.total ?? 0),
    goalsAgainst: Number(stats?.goals?.against?.average?.total ?? 0),
    xg: Number(stats?.goals?.for?.average?.total ?? 0),
    xga: Number(stats?.goals?.against?.average?.total ?? 0),
    homeAway: side,
    restDays: 4,
    keyAbsences: [],
  };
}
