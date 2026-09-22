mkdir -p app/api/debug && cat > app/api/debug/route.ts << 'EOF'
export async function GET() {
  return Response.json({
    FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY ? `presente (${process.env.FOOTBALL_API_KEY.length} caratteri)` : "ASSENTE",
    ODDS_API_KEY: process.env.ODDS_API_KEY ? `presente (${process.env.ODDS_API_KEY.length} caratteri)` : "ASSENTE",
    CRON_SECRET: process.env.CRON_SECRET ? "presente" : "ASSENTE",
    KV_REST_API_URL: process.env.KV_REST_API_URL ? "presente" : "ASSENTE",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
EOF
