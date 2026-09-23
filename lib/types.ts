// Tipi condivisi tra provider dati, motore statistico e frontend.

export type TeamForm = {
  teamId: string;
  teamName: string;
  recentResults: number[]; // 3 = vittoria, 1 = pari, 0 = sconfitta (dal più recente)
  goalsFor: number;        // media gol fatti
  goalsAgainst: number;    // media gol subiti
  xg: number;
  xga: number;
  homeAway: "home" | "away";
  restDays: number;
  keyAbsences: string[];
  // Contesto extra usato dall'analisi approfondita
  matchesPlayed: number;
  cleanSheetRate: number;  // 0-1
  scoringRate: number;     // 0-1, quota partite in cui segna
  bttsRate: number;        // 0-1
  over25Rate: number;      // 0-1
};

export type Fixture = {
  fixtureId: string;
  league: string;
  leagueLabel: string;
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

export type AnalysisBlock = {
  headline: string;
  paragraphs: string[];
  dataPoints: { label: string; value: string; read: string }[];
  scenario: { label: string; probability: number }[];
  why: string[];
  risks: string[];
  verdict: string;
};

export type TicketPick = {
  fixtureId: string;
  league: string;
  leagueLabel: string;
  match: string;
  kickoff: string;
  market: string;
  label: string;
  odds: number;
  bookmaker: string;
  modelProbability: number;
  impliedProbability: number;
  edgePoints: number;
  fairOdds: number;
  confidence: "alta" | "medio-alta" | "media" | "bassa";
  credits: number;
  analysis: AnalysisBlock;
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
  // Trasparenza: cosa ha guardato Beppe prima di decidere
  scan: {
    fixturesAnalyzed: number;
    marketsEvaluated: number;
    candidatesAboveThreshold: number;
    minEdgeRequired: number;
    dataSource: string;
    oddsSource: string;
    discarded: { match: string; market: string; edge: number; reason: string }[];
  };
  capitalBefore: number;
  dayIndex: number;
};

export type HistoryDay = {
  date: string;
  status: "won" | "lost" | "partial" | "no_bet" | "pending";
  picks: { match: string; market: string; odds: number; result: "won" | "lost" | "pending" }[];
  creditsDelta: number;
  capitalAfter: number;
};
