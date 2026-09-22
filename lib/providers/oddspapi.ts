// Adapter per OddsPapi (piano gratuito: 250 richieste/mese, 350+ bookmaker).
// Fonte: https://oddspapi.io

import { OddsQuote } from "@/lib/types";

const BASE = "https://api.oddspapi.io/v4";
const KEY = process.env.ODDS_API_KEY;

function requireKey() {
  if (!KEY) throw new Error("ODDS_API_KEY non configurata: nessuna quota reale può essere recuperata.");
}

export async function fetchOddsForFixtures(fixtureIds: string[]): Promise<OddsQuote[]> {
  requireKey();
  if (fixtureIds.length === 0) return [];

  const url = `${BASE}/odds?apiKey=${KEY}&sport=football&fixtures=${fixtureIds.join(",")}&markets=h2h,totals,btts`;
  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) throw new Error(`OddsPapi → ${res.status}`);
  const json = await res.json();

  const now = new Date().toISOString();
  const quotes: OddsQuote[] = [];

  for (const event of json ?? []) {
    for (const bookmaker of event.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {
        for (const outcome of market.outcomes ?? []) {
          quotes.push({
            fixtureId: String(event.id),
            market: mapMarketKey(market.key, outcome.name, event),
            label: outcome.name,
            price: Number(outcome.price),
            bookmaker: bookmaker.title,
            fetchedAt: bookmaker.last_update ?? now,
          });
        }
      }
    }
  }

  return dedupeBestPrice(quotes);
}

function mapMarketKey(rawKey: string, outcomeName: string, event: any): string {
  if (rawKey === "h2h") {
    if (outcomeName === event.home_team) return "1X2_HOME";
    if (outcomeName === event.away_team) return "1X2_AWAY";
    return "1X2_DRAW";
  }
  if (rawKey === "totals" && outcomeName.toLowerCase().includes("over")) {
    return outcomeName.includes("1.5") ? "OVER_1_5" : "OVER_2_5";
  }
  if (rawKey === "btts") return "BTTS";
  return rawKey.toUpperCase();
}

function dedupeBestPrice(quotes: OddsQuote[]): OddsQuote[] {
  const map = new Map<string, OddsQuote>();
  for (const q of quotes) {
    const k = `${q.fixtureId}:${q.market}`;
    const existing = map.get(k);
    if (!existing || q.price > existing.price) map.set(k, q);
  }
  return Array.from(map.values());
}
