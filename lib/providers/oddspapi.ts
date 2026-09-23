import { OddsQuote } from "@/lib/types";
 
export async function fetchOddsForFixtures(
fixtureIds: string[]
): Promise<OddsQuote[]> {
return [
{
fixtureId: "MILAN-JUVENTUS",
market: "1X2_HOME",
label: "Milan vincente",
price: 1.90,
bookmaker: "Beppe Test",
fetchedAt: new Date().toISOString(),
},
 
{
fixtureId: "INTER-ROMA",
market: "1X2_HOME",
label: "Inter vincente",
price: 1.75,
bookmaker: "Beppe Test",
fetchedAt: new Date().toISOString(),
},
 
{
fixtureId: "MILAN-JUVENTUS",
market: "OVER_1_5",
label: "Over 1.5",
price: 1.25,
bookmaker: "Beppe Test",
fetchedAt: new Date().toISOString(),
},
];
}