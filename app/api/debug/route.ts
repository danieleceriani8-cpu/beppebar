export async function GET() {
return Response.json({
FOOTBALL_LENGTH: process.env.FOOTBALL_API_KEY?.length,
ODDS_LENGTH: process.env.ODDS_API_KEY?.length,
CRON_LENGTH: process.env.CRON_SECRET?.length,
});
}