// Motore statistico: trasforma dati grezzi in probabilità per mercato.
// Scheletro trasparente, non un modello validato: da calibrare con dati storici reali.

import { Fixture, ModelEstimate, TeamForm } from "@/lib/types";

function weightedFormScore(team: TeamForm): number {
  const results = team.recentResults.slice(0, 6);
  if (results.length === 0) return 1;
  const weights = [1.0, 0.85, 0.7, 0.55, 0.4, 0.3];
  let sum = 0;
  let weightSum = 0;
  results.forEach((r, i) => {
    sum += r * (weights[i] ?? 0.2);
    weightSum += weights[i] ?? 0.2;
  });
  return sum / weightSum;
}

function attackDefenseIndex(team: TeamForm): number {
  const xgWeight = 0.7;
  const goalsWeight = 0.3;
  const attack = team.xg * xgWeight + team.goalsFor * goalsWeight;
  const defenseWeak = team.xga * xgWeight + team.goalsAgainst * goalsWeight;
  return attack - defenseWeak;
}

function restPenalty(team: TeamForm): number {
  if (team.restDays >= 5) return 0.05;
  if (team.restDays <= 2) return -0.08;
  return 0;
}

function absencesPenalty(team: TeamForm): number {
  return -0.03 * Math.min(team.keyAbsences.length, 4);
}

export function estimateFixture(fixture: Fixture): ModelEstimate[] {
  const homeForm = weightedFormScore(fixture.home);
  const awayForm = weightedFormScore(fixture.away);
  const homeAdIndex = attackDefenseIndex(fixture.home);
  const awayAdIndex = attackDefenseIndex(fixture.away);
  const homeAdvantage = 0.25;

  let strengthDiff =
    (homeForm - awayForm) * 0.6 +
    (homeAdIndex - awayAdIndex) * 0.5 +
    homeAdvantage +
    restPenalty(fixture.home) -
    restPenalty(fixture.away) +
    absencesPenalty(fixture.home) -
    absencesPenalty(fixture.away);

  const homeWinProb = 1 / (1 + Math.exp(-strengthDiff * 1.3));
  const drawProb = Math.max(0.18, 0.32 - Math.abs(strengthDiff) * 0.12);
  const awayWinProb = Math.max(0.01, 1 - homeWinProb - drawProb);
  const homeDnb = homeWinProb / (homeWinProb + awayWinProb);
  const combinedXg = fixture.home.xg + fixture.away.xg + fixture.home.xga + fixture.away.xga;
  const over15 = Math.min(0.93, 0.5 + combinedXg * 0.03);
  const over25 = Math.min(0.85, 0.32 + combinedXg * 0.03);
  const btts = Math.min(0.88, 0.4 + Math.min(fixture.home.xg, fixture.away.xg) * 0.12);

  return [
    { fixtureId: fixture.fixtureId, market: "1X2_HOME", label: `${fixture.home.teamName} vincente`, modelProbability: round1(homeWinProb * 100) },
    { fixtureId: fixture.fixtureId, market: "1X2_AWAY", label: `${fixture.away.teamName} vincente`, modelProbability: round1(awayWinProb * 100) },
    { fixtureId: fixture.fixtureId, market: "DNB_HOME", label: "Casa rimborso pareggio", modelProbability: round1(homeDnb * 100) },
    { fixtureId: fixture.fixtureId, market: "OVER_1_5", label: "Over 1,5 gol", modelProbability: round1(over15 * 100) },
    { fixtureId: fixture.fixtureId, market: "OVER_2_5", label: "Over 2,5 gol", modelProbability: round1(over25 * 100) },
    { fixtureId: fixture.fixtureId, market: "BTTS", label: "Entrambe segnano", modelProbability: round1(btts * 100) },
  ];
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
