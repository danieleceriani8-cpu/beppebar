// Selezione delle giocate: confronto probabilità modello vs quota reale.
// Regole: max 3 selezioni, max 10 crediti al giorno, niente rincorsa alle
// perdite, nessuna correlazione forte fra le selezioni, NO BET sempre possibile.

import { DailyTicket, Fixture, OddsQuote, TicketPick } from "@/lib/types";
import { estimateFixture } from "./model";
import { buildAnalysis, buildNoBetNote } from "./narrative";

const MIN_EDGE = Number(process.env.MIN_EDGE_PERCENT ?? 4);
const BUDGET = Number(process.env.DAILY_CREDITS_BUDGET ?? 10);
const MAX_PICKS = Number(process.env.MAX_PICKS_PER_DAY ?? 3);

// Quote troppo basse o troppo alte: il valore teorico è illusorio.
const MIN_ODDS = 1.25;
const MAX_ODDS = 4.5;

function confidenceLabel(edge: number): TicketPick["confidence"] {
  if (edge >= 9) return "alta";
  if (edge >= 6) return "medio-alta";
  if (edge >= MIN_EDGE) return "media";
  return "bassa";
}

export function buildDailyTicket(
  dateISO: string,
  fixtures: Fixture[],
  odds: OddsQuote[],
  meta: {
    dataSource: string;
    oddsSource: string;
    capitalBefore: number;
    dayIndex: number;
    notices?: string[];
  }
): DailyTicket {
  const candidates: TicketPick[] = [];
  const discarded: DailyTicket["scan"]["discarded"] = [];
  let marketsEvaluated = 0;
  let best: { match: string; market: string; edge: number } | null = null;

  for (const fixture of fixtures) {
    const estimates = estimateFixture(fixture);
    const fixtureOdds = odds.filter((o) => o.fixtureId === fixture.fixtureId);
    const matchName = `${fixture.home.teamName} — ${fixture.away.teamName}`;

    for (const quote of fixtureOdds) {
      const estimate = estimates.find((e) => e.market === quote.market);
      if (!estimate) continue;
      marketsEvaluated++;

      const implied = (1 / quote.price) * 100;
      const edge = estimate.modelProbability - implied;

      if (!best || edge > best.edge) {
        best = { match: matchName, market: estimate.label, edge };
      }

      if (quote.price < MIN_ODDS || quote.price > MAX_ODDS) {
        if (edge >= MIN_EDGE) {
          discarded.push({
            match: matchName,
            market: estimate.label,
            edge: r1(edge),
            reason:
              quote.price < MIN_ODDS
                ? `quota ${quote.price.toFixed(2)} troppo bassa: il rischio non è remunerato`
                : `quota ${quote.price.toFixed(2)} troppo alta: varianza eccessiva per un budget da 10 crediti`,
          });
        }
        continue;
      }

      if (edge < MIN_EDGE) continue;

      candidates.push({
        fixtureId: fixture.fixtureId,
        league: fixture.league,
        leagueLabel: fixture.leagueLabel,
        match: matchName,
        kickoff: fixture.kickoff,
        market: quote.market,
        label: estimate.label,
        odds: quote.price,
        bookmaker: quote.bookmaker,
        modelProbability: estimate.modelProbability,
        impliedProbability: r1(implied),
        edgePoints: r1(edge),
        fairOdds: Math.round((100 / estimate.modelProbability) * 100) / 100,
        confidence: confidenceLabel(edge),
        credits: 0,
        analysis: buildAnalysis(fixture, quote, estimate.modelProbability, edge),
        quoteFetchedAt: quote.fetchedAt,
      });
    }
  }

  candidates.sort((a, b) => b.edgePoints - a.edgePoints);

  // Una sola selezione per partita: evita giocate correlate sullo stesso match.
  const picks: TicketPick[] = [];
  const usedFixtures = new Set<string>();
  for (const c of candidates) {
    if (picks.length >= MAX_PICKS) break;
    if (usedFixtures.has(c.fixtureId)) {
      discarded.push({
        match: c.match,
        market: c.label,
        edge: c.edgePoints,
        reason: "scartata per correlazione: c'è già una selezione su questa partita",
      });
      continue;
    }
    usedFixtures.add(c.fixtureId);
    picks.push(c);
  }

  const scan = {
    fixturesAnalyzed: fixtures.length,
    marketsEvaluated,
    candidatesAboveThreshold: candidates.length,
    minEdgeRequired: MIN_EDGE,
    dataSource: meta.dataSource,
    oddsSource: meta.oddsSource,
    discarded: discarded.slice(0, 6),
  };

  if (picks.length === 0) {
    return {
      date: dateISO,
      generatedAt: new Date().toISOString(),
      status: "no_bet",
      picks: [],
      totalCreditsUsed: 0,
      theoreticalCombinedOdds: null,
      theoreticalReturn: null,
      note: buildNoBetNote(fixtures.length, marketsEvaluated, best, MIN_EDGE),
      scan,
      capitalBefore: meta.capitalBefore,
      dayIndex: meta.dayIndex,
    };
  }

  // Allocazione crediti proporzionale al margine, mai oltre il budget del giorno.
  const edgeSum = picks.reduce((s, p) => s + p.edgePoints, 0);
  let allocated = 0;
  picks.forEach((p, i) => {
    let credits =
      i === picks.length - 1
        ? BUDGET - allocated
        : Math.max(1, Math.round((BUDGET * p.edgePoints) / edgeSum));
    credits = Math.max(1, credits);
    p.credits = credits;
    allocated += credits;
  });

  const combinedOdds = picks.reduce((acc, p) => acc * p.odds, 1);
  const singlesReturn = picks.reduce((s, p) => s + p.credits * p.odds, 0);

  return {
    date: dateISO,
    generatedAt: new Date().toISOString(),
    status: "picks",
    picks,
    totalCreditsUsed: picks.reduce((s, p) => s + p.credits, 0),
    theoreticalCombinedOdds: Math.round(combinedOdds * 100) / 100,
    theoreticalReturn: Math.round(singlesReturn * 100) / 100,
    note:
      `Selezionate ${picks.length} giocate su ${marketsEvaluated} mercati analizzati in ${fixtures.length} partite. ` +
      `Crediti virtuali, nessuna scommessa reale eseguita.`,
    scan,
    capitalBefore: meta.capitalBefore,
    dayIndex: meta.dayIndex,
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;
