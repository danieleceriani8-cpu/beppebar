// Diagnostica: dice a colpo d'occhio cosa vede davvero il runtime di Vercel.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    FOOTBALL_DATA_API_KEY: len(process.env.FOOTBALL_DATA_API_KEY),
    ODDS_API_KEY: len(process.env.ODDS_API_KEY),
    OPENAI_API_KEY: len(process.env.OPENAI_API_KEY),
    CRON_SECRET: len(process.env.CRON_SECRET),
    MIN_EDGE_PERCENT: process.env.MIN_EDGE_PERCENT ?? "(default 4)",
    DAILY_CREDITS_BUDGET: process.env.DAILY_CREDITS_BUDGET ?? "(default 10)",
    MAX_PICKS_PER_DAY: process.env.MAX_PICKS_PER_DAY ?? "(default 3)",
    nota: "Nessuna variabile è obbligatoria: senza chiavi il sito gira comunque in modalità fallback.",
  });
}

function len(v?: string) {
  return v ? `ok (${v.length} caratteri)` : "assente";
}
