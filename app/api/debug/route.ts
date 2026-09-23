export async function GET() {
return Response.json({
FOOTBALL_LENGTH: process.env.FOOTBALL_API_KEY?.length ?? null,
ODDS_LENGTH: process.env.ODDS_API_KEY?.length ?? null,
CRON_LENGTH: process.env.CRON_SECRET?.length ?? null,
 
KV_URL_EXISTS: !!process.env.KV_REST_API_URL,
KV_TOKEN_EXISTS: !!process.env.KV_REST_API_TOKEN,
 
KV_URL_LENGTH: process.env.KV_REST_API_URL?.length ?? 0,
KV_TOKEN_LENGTH: process.env.KV_REST_API_TOKEN?.length ?? 0,
});
}