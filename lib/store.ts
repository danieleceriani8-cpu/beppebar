// Store senza database esterno.
//
// Lezione imparata a caro prezzo: Vercel KV / Upstash non veniva iniettato nel
// runtime e bloccava TUTTO il sito. Qui la persistenza è ottenuta in due modi:
//
// 1) cache in memoria (globalThis) -> istantanea, sopravvive tra richieste sulla
//    stessa lambda calda;
// 2) rigenerazione DETERMINISTICA per data -> se la lambda si riavvia, lo
//    scontrino del giorno X viene ricalcolato identico, perché il motore usa un
//    seed derivato dalla data. Niente dati persi, niente database.
//
// Quando vorrai un DB vero (Supabase/Postgres) basta sostituire le 6 funzioni
// qui sotto: nessun altro file va toccato.

import { DailyTicket, HistoryDay } from "@/lib/types";

const START_CAPITAL = 100;
export const CHALLENGE_START = "2026-09-23"; // giorno 1 della sfida

type Cache = {
  tickets: Map<string, DailyTicket>;
  history: HistoryDay[];
  capital: number;
};

const g = globalThis as unknown as { __beppe?: Cache };

function cache(): Cache {
  if (!g.__beppe) {
    g.__beppe = { tickets: new Map(), history: [], capital: START_CAPITAL };
  }
  return g.__beppe;
}

export function getStartCapital() {
  return START_CAPITAL;
}

export async function saveTicket(ticket: DailyTicket) {
  cache().tickets.set(ticket.date, ticket);
}

export async function getTicket(date: string): Promise<DailyTicket | null> {
  return cache().tickets.get(date) ?? null;
}

export async function getCurrentCapital(): Promise<number> {
  return cache().capital;
}

export async function setCurrentCapital(v: number) {
  cache().capital = Math.round(v * 100) / 100;
}

export async function appendHistory(day: HistoryDay) {
  const c = cache();
  c.history = [day, ...c.history.filter((d) => d.date !== day.date)].slice(0, 90);
}

export async function getHistory(limit = 14): Promise<HistoryDay[]> {
  return cache().history.slice(0, limit);
}

export function dayIndexOf(dateISO: string): number {
  const start = Date.parse(`${CHALLENGE_START}T00:00:00Z`);
  const now = Date.parse(`${dateISO}T00:00:00Z`);
  return Math.max(1, Math.round((now - start) / 86400000) + 1);
}
