import { getTicket, getCurrentCapital, getHistory } from "@/lib/store";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const [ticket, capital, history] = await Promise.all([
    getTicket(today),
    getCurrentCapital(),
    getHistory(10),
  ]);

  return Response.json({ date: today, ticket, capital, history });
}
