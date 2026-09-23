// Generatore di ANALISI APPROFONDITE.
//
// Obiettivo: chi legge deve capire che dietro c'è un lavoro vero, non una frase
// di circostanza. Ogni analisi contiene:
//   1. un titolo che sintetizza la tesi
//   2. 4 paragrafi discorsivi, ognuno ancorato a numeri calcolati davvero
//   3. una tabella di indicatori con la LETTURA di ogni indicatore
//   4. gli scenari probabilistici (risultati più probabili dal modello)
//   5. perché si gioca / cosa può andare storto
//   6. il verdetto con quota equa, quota di mercato e margine
//
// Nessun numero è inventato: arrivano tutti da buildMatchModel().

import { AnalysisBlock, Fixture, OddsQuote } from "@/lib/types";
import { buildMatchModel, MatchModel } from "@/lib/engine/model";

const pct = (n: number) => `${(Math.round(n * 1000) / 10).toFixed(1)}%`;
const p1 = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

function formLabel(results: number[]): string {
  return results.slice(0, 5).map((r) => (r === 3 ? "V" : r === 1 ? "N" : "P")).join("-");
}
function points(results: number[]): number {
  return results.slice(0, 5).reduce((s, r) => s + r, 0);
}

function marketHuman(market: string): string {
  const map: Record<string, string> = {
    "1X2_HOME": "segno 1",
    "1X2_DRAW": "segno X",
    "1X2_AWAY": "segno 2",
    DC_1X: "doppia chance 1X",
    DC_X2: "doppia chance X2",
    DNB_HOME: "casa con rimborso in caso di pareggio",
    OVER_1_5: "Over 1,5",
    OVER_2_5: "Over 2,5",
    UNDER_3_5: "Under 3,5",
    BTTS: "Goal (entrambe segnano)",
  };
  return map[market] ?? market;
}

export function buildAnalysis(
  fixture: Fixture,
  quote: OddsQuote,
  modelProbability: number,
  edge: number
): AnalysisBlock {
  const m: MatchModel = buildMatchModel(fixture);
  const h = fixture.home;
  const a = fixture.away;
  const fair = 1 / (modelProbability / 100);
  const implied = (1 / quote.price) * 100;

  const ptsH = points(h.recentResults);
  const ptsA = points(a.recentResults);
  const xgDiff = Math.round((h.xg - a.xg) * 100) / 100;
  const defDiff = Math.round((a.xga - h.xga) * 100) / 100;

  /* ------------------------------------------------------ 1. TITOLO */
  const headline = buildHeadline(fixture, quote.market, m, edge);

  /* -------------------------------------------------- 2. PARAGRAFI */
  const paragraphs: string[] = [];

  // (a) il quadro atteso
  paragraphs.push(
    `Il modello assegna a ${h.teamName} un'aspettativa di ${m.lambdaHome} gol e a ${a.teamName} ` +
      `di ${m.lambdaAway}, per un totale atteso di ${m.expectedGoals} reti. ` +
      `Il dato nasce dal prodotto fra rendimento offensivo e tenuta difensiva avversaria, ` +
      `riportato alla media del torneo e poi corretto per fattore campo, forma recente, ` +
      `giorni di recupero e assenze dichiarate. Tradotto: la partita non viene letta come ` +
      `"chi è più forte", ma come quanti gol è ragionevole aspettarsi da ciascuna delle due parti.`
  );

  // (b) la forma, con numeri
  paragraphs.push(
    `Sulle ultime cinque uscite ${h.teamName} ha raccolto ${ptsH} punti su 15 (${formLabel(h.recentResults)}), ` +
      `${a.teamName} ${ptsA} su 15 (${formLabel(a.recentResults)}). ` +
      (Math.abs(ptsH - ptsA) >= 4
        ? `Il divario è ampio e il modello lo pesa, ma con moderazione: la forma incide al massimo per un decimo sulle reti attese, ` +
          `perché cinque partite restano un campione piccolo e facilmente ingannevole.`
        : `Le due curve di rendimento sono vicine, quindi il peso della forma nel calcolo è marginale: ` +
          `a decidere sono i numeri strutturali di attacco e difesa, non l'umore dell'ultimo weekend.`) +
      ` ${h.teamName} produce ${h.xg} gol attesi a partita e ne concede ${h.xga}; ${a.teamName} sta a ${a.xg} e ${a.xga}. ` +
      (xgDiff > 0.35
        ? `Il differenziale offensivo di ${xgDiff} a favore della squadra di casa è la vera base di questa giocata.`
        : xgDiff < -0.35
        ? `L'attacco ospite è il reparto statisticamente più efficiente del confronto (${Math.abs(xgDiff)} di differenziale).`
        : `Nessuno dei due attacchi domina il confronto: il vantaggio, se c'è, va cercato altrove.`)
  );

  // (c) il mercato specifico
  paragraphs.push(buildMarketParagraph(fixture, quote.market, m));

  // (d) il confronto con il mercato e la disciplina
  paragraphs.push(
    `La quota di ${quote.price.toFixed(2)} offerta da ${quote.bookmaker} incorpora una probabilità del ${p1(implied)}. ` +
      `Il modello si ferma al ${p1(modelProbability)}, quindi la quota equa sarebbe ${fair.toFixed(2)}: ` +
      `il margine è di ${edge.toFixed(1)} punti percentuali. ` +
      (edge >= 8
        ? `È uno scostamento importante e per questo la puntata pesa di più sul budget del giorno, restando comunque dentro il limite dei 10 crediti.`
        : edge >= 5
        ? `È uno scostamento solido ma non clamoroso: la quota viene giocata con un'esposizione contenuta.`
        : `È uno scostamento sottile. Si gioca perché supera la soglia minima, non perché sia una certezza: la puntata resta volutamente leggera.`) +
      ` Se domani il mercato si riallineasse e la quota scendesse sotto ${fair.toFixed(2)}, questa stessa selezione non verrebbe più proposta.`
  );

  /* ----------------------------------------------- 3. INDICATORI */
  const dataPoints = [
    {
      label: "Gol attesi (xG modello)",
      value: `${m.lambdaHome} – ${m.lambdaAway}`,
      read:
        m.expectedGoals >= 2.9
          ? "Contesto da partita aperta: i mercati sui gol sono più affidabili di quelli sull'esito."
          : m.expectedGoals <= 2.1
          ? "Contesto bloccato: attenzione ai mercati Over, il campione dice il contrario."
          : "Contesto nella norma del torneo, nessuna distorsione da segnalare.",
    },
    {
      label: "Forma ultime 5",
      value: `${ptsH} pt vs ${ptsA} pt`,
      read:
        ptsH - ptsA >= 4
          ? "La squadra di casa arriva nettamente meglio."
          : ptsA - ptsH >= 4
          ? "L'ospite arriva con il rendimento migliore."
          : "Rendimenti recenti sostanzialmente equivalenti.",
    },
    {
      label: "Tenuta difensiva",
      value: `${h.xga} vs ${a.xga} gol subiti/gara`,
      read:
        defDiff > 0.3
          ? `La difesa di ${h.teamName} è la più solida delle due: ${defDiff} gol di differenza a partita.`
          : defDiff < -0.3
          ? `La difesa di ${a.teamName} concede meno e può reggere l'urto.`
          : "Nessuna delle due difese offre garanzie superiori all'altra.",
    },
    {
      label: "Porta inviolata",
      value: `${pct(m.probs.homeCleanSheet)} / ${pct(m.probs.awayCleanSheet)}`,
      read:
        m.probs.homeCleanSheet > 0.38
          ? "Probabilità alta che l'ospite resti a secco: sostiene i mercati difensivi sulla casa."
          : "Entrambe hanno buone probabilità di segnare almeno una rete.",
    },
    {
      label: "Riposo",
      value: `${h.restDays}g vs ${a.restDays}g`,
      read:
        Math.abs(h.restDays - a.restDays) >= 2
          ? "Differenza di recupero significativa, già scontata nel calcolo delle reti attese."
          : "Condizioni di recupero equivalenti, nessuna correzione applicata.",
    },
    {
      label: "Quota equa vs mercato",
      value: `${fair.toFixed(2)} vs ${quote.price.toFixed(2)}`,
      read: `Il mercato paga ${((quote.price / fair - 1) * 100).toFixed(1)}% in più di quanto il modello ritenga corretto.`,
    },
  ];

  /* ------------------------------------------------- 4. SCENARI */
  const scenario = m.topScores.map((s) => ({ label: s.score, probability: s.probability }));

  /* ------------------------------------------ 5. PERCHÉ / RISCHI */
  const why: string[] = [];
  if (xgDiff > 0.3) why.push(`${h.teamName} genera ${xgDiff} gol attesi in più a partita`);
  if (defDiff > 0.25) why.push(`${a.teamName} concede ${a.xga} gol a gara, sopra la media del confronto`);
  if (ptsH - ptsA >= 3) why.push(`vantaggio di ${ptsH - ptsA} punti nelle ultime cinque`);
  if (h.restDays - a.restDays >= 2) why.push(`${h.teamName} ha ${h.restDays - a.restDays} giorni di recupero in più`);
  if (m.expectedGoals >= 2.8 && quote.market.startsWith("OVER")) why.push(`${m.expectedGoals} gol attesi complessivi`);
  if (m.expectedGoals <= 2.2 && quote.market.startsWith("UNDER")) why.push(`solo ${m.expectedGoals} gol attesi complessivi`);
  why.push(`margine di ${edge.toFixed(1)} punti sulla probabilità implicita nella quota`);

  const risks: string[] = [];
  if (a.keyAbsences.length === 0 && h.keyAbsences.length === 0)
    risks.push("Formazioni ufficiali non ancora disponibili: il modello lavora sulle rose complete");
  if (h.keyAbsences.length) risks.push(`${h.teamName}: ${h.keyAbsences.join(", ")}`);
  if (a.keyAbsences.length) risks.push(`${a.teamName}: ${a.keyAbsences.join(", ")}`);
  if (m.probs.draw > 0.27) risks.push(`Il pareggio resta l'esito singolo più insidioso (${pct(m.probs.draw)})`);
  if (h.matchesPlayed < 6 || a.matchesPlayed < 6)
    risks.push("Campione stagionale ancora corto: le medie sono più volatili del solito");
  if (quote.market.startsWith("OVER") && m.probs.btts < 0.5)
    risks.push("Il mercato Goal viaggia sotto il 50%: l'Over dipende molto da una sola squadra");
  if (risks.length === 0) risks.push("Rischio principale: un episodio isolato (rigore, rosso) che ribalta il copione");

  /* ------------------------------------------------ 6. VERDETTO */
  const verdict =
    `Si gioca ${marketHuman(quote.market)} a ${quote.price.toFixed(2)}. ` +
    `Probabilità modello ${p1(modelProbability)}, probabilità del mercato ${p1(implied)}, ` +
    `margine ${edge.toFixed(1)} punti. ` +
    (edge >= 8
      ? "Selezione principale della giornata."
      : edge >= 5
      ? "Selezione di supporto, esposizione media."
      : "Selezione marginale: dentro per poco, quindi si punta poco.");

  return { headline, paragraphs, dataPoints, scenario, why, risks, verdict };
}

function buildHeadline(fixture: Fixture, market: string, m: MatchModel, edge: number): string {
  const h = fixture.home.teamName;
  const a = fixture.away.teamName;
  if (market.startsWith("OVER"))
    return `${h}-${a}: ${m.expectedGoals} gol attesi, il mercato ne prezza meno`;
  if (market.startsWith("UNDER"))
    return `${h}-${a}: partita più chiusa di quanto dica la lavagna`;
  if (market === "BTTS") return `${h}-${a}: due attacchi che difficilmente restano a secco`;
  if (market === "1X2_AWAY") return `${h}-${a}: l'ospite è sottovalutato di ${edge.toFixed(1)} punti`;
  if (market.startsWith("DC") || market.startsWith("DNB"))
    return `${h}-${a}: stessa idea del segno secco, ma con la rete di protezione`;
  return `${h}-${a}: il fattore campo vale più di quanto lo paghino`;
}

function buildMarketParagraph(fixture: Fixture, market: string, m: MatchModel): string {
  const h = fixture.home.teamName;
  const a = fixture.away.teamName;
  const top = m.topScores[0];

  if (market.startsWith("OVER")) {
    const soglia = market === "OVER_1_5" ? "1,5" : "2,5";
    const prob = market === "OVER_1_5" ? m.probs.over15 : m.probs.over25;
    return (
      `Sul mercato gol la matrice dei risultati assegna all'Over ${soglia} una probabilità del ${pct(prob)}. ` +
      `Il risultato singolo più probabile è ${top.score} (${top.probability}%), ` +
      `e la probabilità che entrambe le squadre vadano a segno è del ${pct(m.probs.btts)}. ` +
      `Il punto non è che ci si aspetti una partita spettacolare: è che ${a} concede con una certa ` +
      `regolarità e che ${h} ha un volume offensivo sufficiente a superare la soglia da solo, ` +
      `il che riduce la dipendenza da un unico marcatore.`
    );
  }

  if (market.startsWith("UNDER")) {
    return (
      `La lettura qui è difensiva: la matrice dà l'Under 3,5 al ${pct(m.probs.under35)} e colloca ` +
      `${top.score} come risultato più probabile (${top.probability}%). ` +
      `Con ${m.expectedGoals} reti attese complessive servirebbe una partita sopra media per far saltare il banco. ` +
      `È un mercato che si comporta bene proprio nelle gare in cui il favorito controlla senza strafare.`
    );
  }

  if (market === "BTTS") {
    return (
      `Il mercato Goal viaggia al ${pct(m.probs.btts)} secondo il modello. ` +
      `Le probabilità di porta inviolata sono ${pct(m.probs.homeCleanSheet)} per ${h} e ${pct(m.probs.awayCleanSheet)} per ${a}: ` +
      `nessuna delle due garantisce la clean sheet, e con ${m.lambdaHome} e ${m.lambdaAway} gol attesi ` +
      `lo scenario "entrambe a segno" è il più coerente con i numeri, non il più spettacolare.`
    );
  }

  if (market === "1X2_AWAY") {
    return (
      `Il modello dà la vittoria esterna al ${pct(m.probs.awayWin)}, contro il ${pct(m.probs.homeWin)} della casa ` +
      `e il ${pct(m.probs.draw)} del pareggio. ` +
      `È un valore alto per una trasferta e nasce dal fatto che ${a} regge meglio la fase difensiva ` +
      `di quanto il fattore campo riesca a compensare. Il risultato più probabile resta ${top.score} (${top.probability}%), ` +
      `segno che si tratta comunque di una partita in equilibrio: il valore è nella quota, non nella certezza.`
    );
  }

  if (market.startsWith("DC") || market.startsWith("DNB")) {
    return (
      `Con il pareggio al ${pct(m.probs.draw)} e la vittoria interna al ${pct(m.probs.homeWin)}, ` +
      `coprire la X cambia sensibilmente il profilo di rischio: si rinuncia a una parte della quota ` +
      `per eliminare lo scenario statisticamente più fastidioso. ` +
      `Il risultato più probabile è ${top.score} (${top.probability}%), ` +
      `ma la distribuzione è abbastanza piatta da giustificare la protezione.`
    );
  }

  return (
    `Sull'esito, il modello assegna ${pct(m.probs.homeWin)} alla vittoria di ${h}, ` +
    `${pct(m.probs.draw)} al pareggio e ${pct(m.probs.awayWin)} al successo di ${a}. ` +
    `Il risultato singolo più probabile è ${top.score} (${top.probability}%), ` +
    `con ${pct(m.probs.homeCleanSheet)} di probabilità che ${a} non segni. ` +
    `Il fattore campo pesa, ma il margine vero arriva dal confronto fra il volume offensivo di ${h} ` +
    `e quanto ${a} concede lontano dal proprio pubblico.`
  );
}

/* --------------------------------- ANALISI DELLE GIORNATE SENZA GIOCATA */

export function buildNoBetNote(
  fixturesAnalyzed: number,
  marketsEvaluated: number,
  best: { match: string; market: string; edge: number } | null,
  minEdge: number
): string {
  if (!fixturesAnalyzed) {
    return (
      `Oggi non ci sono partite nei quattro tornei monitorati (Serie A, Premier League, LaLiga, Champions). ` +
      `Nessuna analisi, nessun credito impegnato: il capitale resta intatto.`
    );
  }

  const base =
    `Ho passato al setaccio ${fixturesAnalyzed} partite e ${marketsEvaluated} mercati, ` +
    `confrontando per ognuno la probabilità del modello con quella implicita nella quota migliore disponibile. `;

  if (best) {
    return (
      base +
      `La selezione più interessante era ${best.market} su ${best.match}, ` +
      `ma con un margine di appena ${best.edge.toFixed(1)} punti contro i ${minEdge} richiesti. ` +
      `Sotto quella soglia il vantaggio teorico viene mangiato dalla varianza: giocare significherebbe ` +
      `pagare il bookmaker per il gusto di avere una schedina. Oggi passo, e il capitale resta dov'è.`
    );
  }

  return (
    base +
    `Nessun mercato ha superato la soglia minima di ${minEdge} punti di margine. ` +
    `Non è pigrizia: è la parte del lavoro che tiene in piedi il capitale nelle giornate storte.`
  );
}
