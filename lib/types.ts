// Tipi condivisi tra provider dati, motore statistico e frontend.

export type TeamForm = {
  teamId: string;
  teamName: string;
  recentResults: number[];
  goalsFor: number;
  goalsAgainst: number;
  xg: number;
  xga: number;
  homeAway: "home" | "away";
  restDays: number;
  keyAbsences: string[];
};

export type Fixture = {
  fixtureId: string;
  league: string;
  kickoff: string;
  home: TeamForm;
  away: TeamForm;
};

export type OddsQuote = {
  fixtureId: string;
  market: string;
  label: string;
  price: number;
  bookmaker: string;
  fetchedAt: string;
};

export type ModelEstimate = {
  fixtureId: string;
  market: string;
  label: string;
  modelProbability: number;
};

export type TicketPick = {
  fixtureId: string;
  league: string;
  match: string;
  market: string;
  label: string;
  odds: number;
  bookmaker: string;
  modelProbability: number;
  impliedProbability: number;
  edgePoints: number;
  confidence: "alta" | "medio-alta" | "media" | "bassa";
  credits: number;
  why: string[];
  risks: string[];
  quoteFetchedAt: string;
};

export type DailyTicket = {
  date: string;
  generatedAt: string;
  status: "picks" | "no_bet";
  picks: TicketPick[];
  totalCreditsUsed: number;
  theoreticalCombinedOdds: number | null;
  theoreticalReturn: number | null;
  note: string;
};

export type HistoryDay = {
  date: string;
  status: "won" | "lost" | "partial" | "no_bet" | "pending";
  picks: { match: string; market: string; odds: number; result: "won" | "lost" | "pending" }[];
  creditsDelta: number;
  capitalAfter: number;
};
