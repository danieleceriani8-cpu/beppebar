// Persistenza su Vercel KV: necessaria perché le funzioni serverless di Vercel
// non hanno filesystem persistente tra una richiesta e l'altra.

import { kv } from "@vercel/kv";
import { DailyTicket, HistoryDay } from "@/lib/types";

const TICKET_KEY = (date: string) => `beppe:ticket:${date}`;
const HISTORY_KEY = "beppe:history";
const CAPITAL_KEY = "beppe:capital";

export async function saveTicket(ticket: DailyTicket) {
  await kv.set(TICKET_KEY(ticket.date), ticket);
}

export async function getTicket(date: string): Promise<DailyTicket | null> {
  return (await kv.get<DailyTicket>(TICKET_KEY(date))) ?? null;
}

export async function getCurrentCapital(): Promise<number> {
  const v = await kv.get<number>(CAPITAL_KEY);
  return v ?? 100;
}

export async function setCurrentCapital(v: number) {
  await kv.set(CAPITAL_KEY, v);
}

export async function appendHistory(day: HistoryDay) {
  const history = (await kv.get<HistoryDay[]>(HISTORY_KEY)) ?? [];
  history.unshift(day);
  await kv.set(HISTORY_KEY, history.slice(0, 90));
}

export async function getHistory(limit = 14): Promise<HistoryDay[]> {
  const history = (await kv.get<HistoryDay[]>(HISTORY_KEY)) ?? [];
  return history.slice(0, limit);
}
