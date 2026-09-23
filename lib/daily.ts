// Orchestratore: unico punto in cui si genera lo scontrino del giorno.
// Chiamato sia dal cron (/api/daily) sia dalla home (/api/ticket).
// Non lancia MAI eccezioni verso l'esterno: nel peggiore dei casi restituisce
// uno scontrino "no_bet" spiegato. Il sito non deve più rompersi. Mai.

import { fetchTodayFixtures } from "@/lib/providers/football";
import { fetchOdds } from "@/lib/providers/odds";
import { buildDailyTicket } from "@/lib/engine/edge";
import { getTicket, saveTicket, getCurrentCapital, dayIndexOf } from "@/lib/store";
import { DailyTicket } from "@/lib/types";

export function todayISO(): string {
  // Europe/Rome
  return new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function generateForDate(dateISO: string, force = false): Promise<DailyTicket> {
  if (!force) {
    const cached = await getTicket(dateISO);
    if (cached) return cached;
  }

  const capitalBefore = await getCurrentCapital();
  const dayIndex = dayIndexOf(dateISO);

  try {
    const { fixtures, source: dataSource, notice: n1 } = await fetchTodayFixtures(dateISO);
    const { odds, source: oddsSource, notice: n2 } = await fetchOdds(fixtures, dateISO);

    const ticket = buildDailyTicket(dateISO, fixtures, odds, {
      dataSource,
      oddsSource,
      capitalBefore,
      dayIndex,
      notices: [n1, n2].filter(Boolean) as string[],
    });

    await saveTicket(ticket);
    return ticket;
  } catch (err: any) {
    const fallback: DailyTicket = {
      date: dateISO,
      generatedAt: new Date().toISOString(),
      status: "no_bet",
      picks: [],
      totalCreditsUsed: 0,
      theoreticalCombinedOdds: null,
      theoreticalReturn: null,
      note:
        `Oggi l'analisi non è andata a buon fine (${err?.message ?? "errore sconosciuto"}). ` +
        `Nessun credito impegnato: quando i dati non sono affidabili, Beppe non gioca.`,
      scan: {
        fixturesAnalyzed: 0,
        marketsEvaluated: 0,
        candidatesAboveThreshold: 0,
        minEdgeRequired: Number(process.env.MIN_EDGE_PERCENT ?? 4),
        dataSource: "non disponibile",
        oddsSource: "non disponibile",
        discarded: [],
      },
      capitalBefore,
      dayIndex,
    };
    await saveTicket(fallback);
    return fallback;
  }
}
