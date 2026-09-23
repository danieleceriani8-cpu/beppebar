export async function GET() {
return Response.json({
FOOTBALL_VALUE: process.env.FOOTBALL_API_KEY,
ODDS_VALUE: process.env.ODDS_API_KEY,
CRON_VALUE: process.env.CRON_SECRET,
});
}