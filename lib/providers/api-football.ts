import { Fixture, TeamForm } from "@/lib/types";

function makeTeam(
  id: string,
  name: string,
  xg: number,
  xga: number,
  side: "home" | "away"
): TeamForm {
  return {
    teamId: id,
    teamName: name,
    recentResults: [3, 3, 1, 3, 3, 0],
    goalsFor: xg,
    goalsAgainst: xga,
    xg,
    xga,
    homeAway: side,
    restDays: 5,
    keyAbsences: [],
  };
}

export async function fetchTodayFixtures(
  dateISO: string
): Promise<Fixture[]> {
  return [
    {
      fixtureId: "MILAN-JUVENTUS",
      league: "serie-a",
      kickoff: `${dateISO}T20:45:00Z`,
      home: makeTeam(
        "MIL",
        "Milan",
        2.05,
        0.95,
        "home"
      ),
      away: makeTeam(
        "JUV",
        "Juventus",
        1.45,
        1.25,
        "away"
      ),
    },

    {
      fixtureId: "INTER-ROMA",
      league: "serie-a",
      kickoff: `${dateISO}T18:00:00Z`,
      home: makeTeam(
        "INT",
        "Inter",
        2.20,
        0.85,
        "home"
      ),
      away: makeTeam(
        "ROM",
        "Roma",
        1.30,
        1.40,
        "away"
      ),
    },
  ];
}