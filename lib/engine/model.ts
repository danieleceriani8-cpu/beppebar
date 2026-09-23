// Motore probabilistico: Poisson bivariata semplificata + correzione forma.
//
// Passaggi:
//  1. lambda attese per casa/trasferta (attacco x difesa avversaria + fattore campo)
//  2. correzione con forma recente, riposo e assenze
//  3. matrice dei risultati 0-6 x 0-6
//  4. da lì si ricavano TUTTE le probabilità di mercato
//
// Il vantaggio di avere la matrice è che l'analisi può citare numeri veri
// (risultato più probabile, probabilità di clean sheet, ecc.) e non frasi vaghe.

import { Fixture, ModelEstimate } from "@/lib/types";

const HOME_ADVANTAGE = 1.16;
const AWAY_PENALTY = 0.94;
const LEAGUE_AVG_GOALS = 1.38;

export type MatchModel = {
  lambdaHome: number;
  lambdaAway: number;
  matrix: number[][];
  probs: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over15: number;
    over25: number;
    under35: number;
    btts: number;
    homeCleanSheet: number;
    awayCleanSheet: number;
    homeDnb: number;
    awayDnb: number;
    homeOrDraw: number;
    awayOrDraw: number;
  };
  topScores: { score: string; probability: number }[];
  expectedGoals: number;
};

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poisson(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function formScore(results: number[]): number {
  if (!results.length) return 0.5;
  // pesi decrescenti: la partita più recente conta di più
  const weights = [1, 0.85, 0.72, 0.6, 0.5, 0.42];
  let num = 0;
  let den = 0;
  results.slice(0, 6).forEach((r, i) => {
    const w = weights[i] ?? 0.35;
    num += (r / 3) * w;
    den += w;
  });
  return num / den; // 0 -> 1
}

export function buildMatchModel(fixture: Fixture): MatchModel {
  const h = fixture.home;
  const a = fixture.away;

  const homeAttack = (h.xg || h.goalsFor || LEAGUE_AVG_GOALS) / LEAGUE_AVG_GOALS;
  const awayDefense = (a.xga || a.goalsAgainst || LEAGUE_AVG_GOALS) / LEAGUE_AVG_GOALS;
  const awayAttack = (a.xg || a.goalsFor || LEAGUE_AVG_GOALS) / LEAGUE_AVG_GOALS;
  const homeDefense = (h.xga || h.goalsAgainst || LEAGUE_AVG_GOALS) / LEAGUE_AVG_GOALS;

  const formH = formScore(h.recentResults);
  const formA = formScore(a.recentResults);

  // correzione forma: max +/-10%
  const formAdjH = 0.9 + formH * 0.2;
  const formAdjA = 0.9 + formA * 0.2;

  // riposo: chi ha meno di 4 giorni paga un piccolo pegno
  const restAdjH = h.restDays < 4 ? 0.95 : 1;
  const restAdjA = a.restDays < 4 ? 0.95 : 1;

  // assenze pesanti
  const absAdjH = 1 - Math.min(0.08, h.keyAbsences.length * 0.04);
  const absAdjA = 1 - Math.min(0.08, a.keyAbsences.length * 0.04);

  let lambdaHome =
    homeAttack * awayDefense * LEAGUE_AVG_GOALS * HOME_ADVANTAGE * formAdjH * restAdjH * absAdjH;
  let lambdaAway =
    awayAttack * homeDefense * LEAGUE_AVG_GOALS * AWAY_PENALTY * formAdjA * restAdjA * absAdjA;

  lambdaHome = Math.max(0.25, Math.min(4, lambdaHome));
  lambdaAway = Math.max(0.2, Math.min(4, lambdaAway));

  const MAX = 7;
  const matrix: number[][] = [];
  for (let i = 0; i <= MAX; i++) {
    matrix[i] = [];
    for (let j = 0; j <= MAX; j++) {
      matrix[i][j] = poisson(i, lambdaHome) * poisson(j, lambdaAway);
    }
  }

  let homeWin = 0, draw = 0, awayWin = 0;
  let over15 = 0, over25 = 0, under35 = 0, btts = 0;
  let homeCleanSheet = 0, awayCleanSheet = 0;
  const scores: { score: string; probability: number }[] = [];

  for (let i = 0; i <= MAX; i++) {
    for (let j = 0; j <= MAX; j++) {
      const p = matrix[i][j];
      if (i > j) homeWin += p;
      else if (i === j) draw += p;
      else awayWin += p;

      if (i + j > 1.5) over15 += p;
      if (i + j > 2.5) over25 += p;
      if (i + j < 3.5) under35 += p;
      if (i > 0 && j > 0) btts += p;
      if (j === 0) homeCleanSheet += p;
      if (i === 0) awayCleanSheet += p;

      scores.push({ score: `${i}-${j}`, probability: p });
    }
  }

  scores.sort((x, y) => y.probability - x.probability);

  return {
    lambdaHome: r2(lambdaHome),
    lambdaAway: r2(lambdaAway),
    matrix,
    probs: {
      homeWin, draw, awayWin,
      over15, over25, under35, btts,
      homeCleanSheet, awayCleanSheet,
      homeDnb: homeWin / (homeWin + awayWin),
      awayDnb: awayWin / (homeWin + awayWin),
      homeOrDraw: homeWin + draw,
      awayOrDraw: awayWin + draw,
    },
    topScores: scores.slice(0, 4).map((s) => ({
      score: s.score,
      probability: r1(s.probability * 100),
    })),
    expectedGoals: r2(lambdaHome + lambdaAway),
  };
}

export function estimateFixture(fixture: Fixture): ModelEstimate[] {
  const m = buildMatchModel(fixture);
  const H = fixture.home.teamName;
  const A = fixture.away.teamName;
  const id = fixture.fixtureId;

  const mk = (market: string, label: string, p: number): ModelEstimate => ({
    fixtureId: id,
    market,
    label,
    modelProbability: r1(p * 100),
  });

  return [
    mk("1X2_HOME", `${H} vincente`, m.probs.homeWin),
    mk("1X2_DRAW", "Pareggio", m.probs.draw),
    mk("1X2_AWAY", `${A} vincente`, m.probs.awayWin),
    mk("DC_1X", `${H} o pareggio`, m.probs.homeOrDraw),
    mk("DC_X2", `${A} o pareggio`, m.probs.awayOrDraw),
    mk("DNB_HOME", `${H} rimborso pareggio`, m.probs.homeDnb),
    mk("OVER_1_5", "Over 1,5 gol", m.probs.over15),
    mk("OVER_2_5", "Over 2,5 gol", m.probs.over25),
    mk("UNDER_3_5", "Under 3,5 gol", m.probs.under35),
    mk("BTTS", "Entrambe segnano", m.probs.btts),
  ];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
