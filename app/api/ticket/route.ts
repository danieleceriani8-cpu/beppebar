// Lo scontrino letto dalla home. Se non esiste, viene generato al volo:
// così la pagina non è mai vuota, anche senza cron e senza database.

import { generateForDate, todayISO } from "@/lib/daily";
import { getHistory, getCurrentCapital, getStartCapital } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? todayISO();

  const ticket = await generateForDate(date);
  const history = await getHistory(14);
  const capital = await getCurrentCapital();

  return Response.json({
    ticket,
    history,
    capital,
    startCapital: getStartCapital(),
  });
}
