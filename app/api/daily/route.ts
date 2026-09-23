// Cron giornaliero (vedi vercel.json, 10:00 UTC ~ 12:00 italiane).
// Richiamabile anche a mano dal browser: se CRON_SECRET non è configurato
// l'endpoint resta aperto, così il sito funziona comunque.

import { generateForDate, todayISO } from "@/lib/daily";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const auth = req.headers.get("authorization");
    const viaQuery = url.searchParams.get("key");
    const isCron = req.headers.get("user-agent")?.includes("vercel-cron");
    if (auth !== `Bearer ${secret}` && viaQuery !== secret && !isCron) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? todayISO();
  const force = url.searchParams.get("force") === "1";

  const ticket = await generateForDate(date, force);

  return Response.json({
    ok: true,
    date: ticket.date,
    status: ticket.status,
    picks: ticket.picks.length,
    creditsUsed: ticket.totalCreditsUsed,
    dataSource: ticket.scan.dataSource,
    oddsSource: ticket.scan.oddsSource,
  });
}
