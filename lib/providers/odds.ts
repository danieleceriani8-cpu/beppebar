// Provider quote.
//
// Come per le partite: mai un throw che uccide la pagina.
// Se ODDS_API_KEY c'è, si prova The Odds API / OddsPapi. Altrimenti si genera un
// mercato simulato realistico: quota equa del modello + margine bookmaker
// (5-7%) + rumore di mercato. Così il confronto probabilità/quota resta un
// esercizio onesto e qualche volta produce davvero valore, altre volte no.

import { Fixture, OddsQuote } from "@/lib/types";
import { buildMatchModel } from "@/lib/engine/model";
import { seededRandom } from "@/lib/engine/seed";

const KEY = process.env.ODDS_API_KEY ?? "";
const BASE = "https://api.the-odds-api.com/v4";

export type OddsSource = "the-odds-api" | "mercato simulato (fallback)";

const BOOKS = ["Bet365", "Snai", "Sisal", "Pinnacle", "Eurobet", "Goldbet"];

export async function fetchOdds(
  fixtures: Fixture[],
  dateISO: string
): Promise<{ odds: OddsQuote[]; source: OddsSource; notice?: string }> {
  if (KEY && fixtures.length) {
    try {
      const odds = await fetchReal(fixtures);
      if (odds.length > 0) return { odds, source: "the-odds-api" };
    } catch {
      /* si scende al fallback */
    }
  }

  return {
    odds: simulate(fixtures, dateISO),
    source: "mercato simulato (fallback)",
    notice: KEY
      ? "Il provider quote non ha restituito mercati utili: Beppe usa il mercato simulato."
      : "ODDS_API_KEY non configurata: Beppe usa il mercato simulato.",
  };
}

/* ------------------------------------------------------------------ REALE */

async function fetchReal(fixtures: Fixture[]): Promise<OddsQuote[]> {
  const sports = ["soccer_italy_serie_a", "soccer_epl", "soccer_spain_la_liga", "soccer_uefa_champs_league"];
  const out: OddsQuote[] = [];

  for (const sport of sports) {
    let json: any;
    try {
      const url = `${BASE}/sports/${sport}/odds?apiKey=${KEY}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
      const res = await fetch(url, { next: { revalidate: 600 } });
      if (!res.ok) continue;
      json = await res.json();
    } catch {
      continue;
    }

    for (const event of json ?? []) {
      const fixture = matchFixture(fixtures, event);
      if (!fixture) continue;

      for (const bk of event.bookmakers ?? []) {
        for (const market of bk.markets ?? []) {
          for (const o of market.outcomes ?? []) {
            const key = mapMarket(market.key, o, event);
            if (!key) continue;
            out.push({
              fixtureId: fixture.fixtureId,
              market: key,
              label: o.name,
              price: Number(o.price),
              bookmaker: bk.title,
              fetchedAt: bk.last_update ?? new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  return bestPrice(out);
}

function norm(s: string) {
  return (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

function matchFixture(fixtures: Fixture[], event: any): Fixture | undefined {
  const h = norm(event.home_team);
  const a = norm(event.away_team);
  return fixtures.find(
    (f) =>
      (norm(f.home.teamName).includes(h.slice(0, 5)) || h.includes(norm(f.home.teamName).slice(0, 5))) &&
      (norm(f.away.teamName).includes(a.slice(0, 5)) || a.includes(norm(f.away.teamName).slice(0, 5)))
  );
}

function mapMarket(key: string, outcome: any, event: any): string | null {
  if (key === "h2h") {
    if (outcome.name === event.home_team) return "1X2_HOME";
    if (outcome.name === event.away_team) return "1X2_AWAY";
    return "1X2_DRAW";
  }
  if (key === "totals") {
    const point = Number(outcome.point);
    const isOver = String(outcome.name).toLowerCase() === "over";
    if (isOver && point === 1.5) return "OVER_1_5";
    if (isOver && point === 2.5) return "OVER_2_5";
    if (!isOver && point === 3.5) return "UNDER_3_5";
  }
  return null;
}

function bestPrice(quotes: OddsQuote[]): OddsQuote[] {
  const map = new Map<string, OddsQuote>();
  for (const q of quotes) {
    if (!Number.isFinite(q.price) || q.price <= 1) continue;
    const k = `${q.fixtureId}:${q.market}`;
    const cur = map.get(k);
    if (!cur || q.price > cur.price) map.set(k, q);
  }
  return Array.from(map.values());
}

/* -------------------------------------------------------------- FALLBACK */

function simulate(fixtures: Fixture[], dateISO: string): OddsQuote[] {
  const now = new Date().toISOString();
  const out: OddsQuote[] = [];

  for (const f of fixtures) {
    const m = buildMatchModel(f);
    const rnd = seededRandom(`${dateISO}:odds:${f.fixtureId}`);

    const entries: { market: string; label: string; p: number }[] = [
      { market: "1X2_HOME", label: `${f.home.teamName} vincente`, p: m.probs.homeWin },
      { market: "1X2_DRAW", label: "Pareggio", p: m.probs.draw },
      { market: "1X2_AWAY", label: `${f.away.teamName} vincente`, p: m.probs.awayWin },
      { market: "DC_1X", label: `${f.home.teamName} o pareggio`, p: m.probs.homeOrDraw },
      { market: "DNB_HOME", label: `${f.home.teamName} rimborso pareggio`, p: m.probs.homeDnb },
      { market: "OVER_1_5", label: "Over 1,5 gol", p: m.probs.over15 },
      { market: "OVER_2_5", label: "Over 2,5 gol", p: m.probs.over25 },
      { market: "UNDER_3_5", label: "Under 3,5 gol", p: m.probs.under35 },
      { market: "BTTS", label: "Entrambe segnano", p: m.probs.btts },
    ];

    for (const e of entries) {
      if (e.p <= 0.03) continue;
      const fair = 1 / e.p;
      const margin = 1.04 + rnd() * 0.03;        // 4% - 7% di margine bookmaker
      const noise = 0.94 + rnd() * 0.24;          // disallineamento reale del mercato
      const price = Math.max(1.02, fair / margin * noise);

      out.push({
        fixtureId: f.fixtureId,
        market: e.market,
        label: e.label,
        price: Math.round(price * 100) / 100,
        bookmaker: BOOKS[Math.floor(rnd() * BOOKS.length)],
        fetchedAt: now,
      });
    }
  }

  return out;
}
