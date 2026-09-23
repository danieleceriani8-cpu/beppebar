export async function GET() {
return Response.json({
FOOTBALL: !!process.env.FOOTBALL_API_KEY,
ODDS: !!process.env.ODDS_API_KEY,
CRON: !!process.env.CRON_SECRET,
 
ALL_KEYS: Object.keys(process.env)
.filter(k =>
k.includes("FOOTBALL") ||
k.includes("ODDS") ||
k.includes("CRON") ||
k.includes("KV") ||
k.includes("REDIS")
)
.sort()
});
}