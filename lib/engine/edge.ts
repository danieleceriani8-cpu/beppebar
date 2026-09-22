// Confronta probabilità del modello con quote reali, seleziona le giocate con
// margine sufficiente. Se nessuna lo supera: sempre NO BET.

import { Fixture, OddsQuote, TicketPick, DailyTicket } from "@/lib/types";
import { estimateFixture } from "./model";

const MIN_EDGE = Number(process.env.MIN_EDGE_PERCENT ?? 4);
const BUDGET = Number(process.env.DAILY_CREDITS_BUDGET ?? 10);
const MAX_PICKS = Number(process.env.MAX_PICKS_PER_DAY ?? 3);

function impliedProbability(odds: number): number {
  return (1 / odds) * 100;
}

function confidenceLabel(edge: number): TicketPick["confidence"] {
  if (edge >= 9) return "alta";
  if (edge >= 6) return "medio-alta";
  if (edge >= MIN_EDGE) return "media";
  return "bassa";
}

function buildWhy(fixture: Fixture): string[] {
  const notes: string[] = [];
  const h = fixture.home, a = fixture.away;
  if (h.xg > a.xg) notes.push(`${h.teamName} produce più occasioni pericolose (xG superiore)`);
  if (h.restDays - a.restDays >= 2) notes.push(`${h.teamName} arriva con più giorni di riposo`);
  if (a.keyAbsences.length >= 2) notes.push(`${a.teamName} ha diverse assenze chiave`);
  if (notes.length === 0) notes.push("Vantaggio statistico moderato ma coerente su più indicatori");
  return notes.slice(0, 3);
}

function buildRisks(fixture: Fixture): string[] {
  const risks: string[] = [];
  const h = fixture.home, a = fixture.away;
  if (h.keyAbsences.length > 0) risks.push(`${h.teamName}: assenze da verificare in formazione ufficiale`);
  if (h.restDays <= 3) risks.push(`${h.teamName} ha avuto poco riposo`);
  if (a.xg > h.xg * 0.9) risks.push(`${a.teamName} resta pericolosa in ripartenza`);
  if (risks.length === 0) risks.push("Formazioni ufficiali non ancora confermate al momento dell'analisi");
  return risks.slice(0, 3);
}

export function buildDailyTicket(dateISO: string, fixtures: Fixture[], odds: OddsQuote[]): DailyTicket {
  const candidates: TicketPick[] = [];

  for (const fixture of fixtures) {
    const estimates = estimateFixture(fixture);
    const fixtureOdds = odds.filter((o) => o.fixtureId === fixture.fixtureId);

    for (const quote of fixtureOdds) {
      const estimate = estimates.find((e) => e.market === quote.market);
      if (!estimate) continue;

      const implied = impliedProbability(quote.price);
      const edge = estimate.modelProbability - implied;
      if (edge < MIN_EDGE) continue;

      candidates.push({
        fixtureId: fixture.fixtureId,
        league: fixture.league,
        match: `${fixture.home.teamName} — ${fixture.away.teamName}`,
        market: quote.market,
        label: quote.label,
        odds: quote.price,
        bookmaker: quote.bookmaker,
        modelProbability: estimate.modelProbability,
        impliedProbability: Math.round(implied * 10) / 10,
        edgePoints: Math.round(edge * 10) / 10,
        confidence: confidenceLabel(edge),
        credits: 0,
        why: buildWhy(fixture),
        risks: buildRisks(fixture),
        quoteFetchedAt: quote.fetchedAt,
      });
    }
  }

  candidates.sort((a, b) => b.edgePoints - a.edgePoints);
  const picks = candidates.slice(0, MAX_PICKS);

  if (picks.length === 0) {
    return {
      date: dateISO,
      generatedAt: new Date().toISOString(),
      status: "no_bet",
      picks: [],
      totalCreditsUsed: 0,
      theoreticalCombinedOdds: null,
      theoreticalReturn: null,
      note: "Nessuna partita ha superato la soglia minima di margine statistico oggi. Beppe preferisce non forzare un'idea che non c'è.",
    };
  }

  const edgeSum = picks.reduce((s, p) => s + p.edgePoints, 0);
  let allocated = 0;
  picks.forEach((p, i) => {
    const share = p.edgePoints / edgeSum;
    let credits = Math.round(BUDGET * share);
    if (i === picks.length - 1) credits = BUDGET - allocated;
    p.credits = Math.max(1, credits);
    allocated += p.credits;
  });

  const combinedOdds = picks.reduce((acc, p) => acc * p.odds, 1);
  const theoreticalReturn = Math.round(BUDGET * combinedOdds * 100) / 100;

  return {
    date: dateISO,
    generatedAt: new Date().toISOString(),
    status: "picks",
    picks,
    totalCreditsUsed: BUDGET,
    theoreticalCombinedOdds: Math.round(combinedOdds * 100) / 100,
    theoreticalReturn,
    note: "Analisi statistica ed editoriale. Crediti virtuali, nessuna giocata reale eseguita.",
  };
}
