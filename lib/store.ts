import { DailyTicket, HistoryDay } from "@/lib/types";

let currentTicket: DailyTicket | null = null;
let capital = 100;
let history: HistoryDay[] = [];

export async function saveTicket(ticket: DailyTicket) {
  currentTicket = ticket;
}

export async function getTicket(date: string) {
  return currentTicket;
}

export async function getCurrentCapital() {
  return capital;
}

export async function setCurrentCapital(v: number) {
  capital = v;
}

export async function appendHistory(day: HistoryDay) {
  history.unshift(day);
}

export async function getHistory(limit = 14) {
  return history.slice(0, limit);
}