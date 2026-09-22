// Job giornaliero (Vercel Cron, vedi vercel.json): recupera partite/quote reali,
// calcola il modello, costruisce lo scontrino e lo salva.

import { fetchTodayFixtures } from "@/lib/providers/api-football";
import { fetchOddsForFixtures } from "@/lib/providers/oddspapi";
import { buildDailyTicket } from "@/lib/engine/edge";
import { saveTicket } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const fixtures = await fetchTodayFixtures(today);
    const odds = await fetchOddsForFixtures(fixtures.map((f) => f.fixtureId));
    const ticket = buildDailyTicket(today, fixtures, odds);
    await saveTicket(ticket);
    return Response.json({ ok: true, date: today, status: ticket.status, picks: ticket.picks.length });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err.message ?? "Errore sconosciuto nella generazione dello scontrino" },
      { status: 503 }
    );
  }
}
