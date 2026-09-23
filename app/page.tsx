import Logo from "@/components/Logo";
import { generateForDate, todayISO } from "@/lib/daily";
import { getCurrentCapital, getHistory, getStartCapital } from "@/lib/store";
import { TicketPick } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const date = todayISO();
  const ticket = await generateForDate(date);
  const capital = await getCurrentCapital();
  const start = getStartCapital();
  const history = await getHistory(14);

  const delta = capital - start;
  const roi = (delta / start) * 100;

  return (
    <main className="wrap">
      <header className="topbar">
        <Logo />
        <div>
          <div className="brand">Beppe Bar</div>
          <div className="tagline">Una mezza idea ce l&apos;ho. Ma prima guardo i numeri.</div>
        </div>
      </header>

      {/* ---------------------------------------------------------- HERO */}
      <section className="card hero">
        <div className="mono">
          Giorno {ticket.dayIndex} di 14 · {formatDate(ticket.date)}
        </div>

        {ticket.status === "no_bet" ? (
          <h1 className="display">
            Oggi meglio <span className="accent">un caffè</span> che una schedina.
          </h1>
        ) : (
          <h1 className="display">
            Oggi <span className="accent">una mezza idea</span> ce l&apos;ho.
          </h1>
        )}

        <p className="lead">{ticket.note}</p>

        <div className="stats">
          <div className="stat">
            <div className="mono">Capitale</div>
            <div className="v">{capital.toFixed(2)} cr</div>
          </div>
          <div className="stat">
            <div className="mono">Rendimento</div>
            <div className={`v ${delta >= 0 ? "pos" : "neg"}`}>
              {delta >= 0 ? "+" : ""}
              {roi.toFixed(1)}%
            </div>
          </div>
          <div className="stat">
            <div className="mono">In gioco oggi</div>
            <div className="v">{ticket.totalCreditsUsed.toFixed(2)} cr</div>
          </div>
          <div className="stat">
            <div className="mono">Ritorno potenziale</div>
            <div className="v">
              {ticket.theoreticalReturn ? `${ticket.theoreticalReturn.toFixed(2)} cr` : "—"}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- SCHEDINA */}
      {ticket.status === "picks" && (
        <section>
          <div className="mono" style={{ marginBottom: 10 }}>La schedina di oggi</div>
          {ticket.picks.map((p) => (
            <PickCard key={p.fixtureId + p.market} pick={p} />
          ))}
        </section>
      )}

      {/* ---------------------------------------------------- TRASPARENZA */}
      <section className="card">
        <div className="mono">Come ci sono arrivato</div>
        <h2 className="display" style={{ fontSize: 26, margin: "8px 0 16px" }}>
          Beppe non nasconde niente.
        </h2>
        <ul className="scan">
          <li>
            Partite analizzate oggi: <b>{ticket.scan.fixturesAnalyzed}</b>
          </li>
          <li>
            Mercati valutati uno per uno: <b>{ticket.scan.marketsEvaluated}</b>
          </li>
          <li>
            Mercati sopra la soglia di valore: <b>{ticket.scan.candidatesAboveThreshold}</b>
          </li>
          <li>
            Margine minimo richiesto per giocare: <b>{ticket.scan.minEdgeRequired} punti</b>
          </li>
          <li>
            Fonte statistiche: <b>{ticket.scan.dataSource}</b>
          </li>
          <li>
            Fonte quote: <b>{ticket.scan.oddsSource}</b>
          </li>
          <li>
            Analisi generata alle <b>{formatTime(ticket.generatedAt)}</b>
          </li>
        </ul>

        {ticket.scan.discarded.length > 0 && (
          <div className="disc">
            <div className="mono" style={{ marginBottom: 8 }}>Scartate, e perché</div>
            {ticket.scan.discarded.map((d, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <b>{d.match}</b> — {d.market} (margine {d.edge} pt): {d.reason}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- STORICO */}
      <section className="card">
        <div className="mono">Quello che è successo prima</div>
        <h2 className="display" style={{ fontSize: 26, margin: "8px 0 16px" }}>
          Lo storico, senza trucchi.
        </h2>
        {history.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Lo storico si popola alla chiusura della prima giornata di analisi. Capitale di partenza:{" "}
            {start.toFixed(2)} crediti.
          </p>
        ) : (
          <table className="dp">
            <tbody>
              {history.map((d) => (
                <tr key={d.date}>
                  <td className="k">{formatDate(d.date)}</td>
                  <td className="v">{d.status === "no_bet" ? "Nessuna giocata" : d.status}</td>
                  <td className="r">
                    {d.creditsDelta >= 0 ? "+" : ""}
                    {d.creditsDelta.toFixed(2)} cr → {d.capitalAfter.toFixed(2)} cr
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="footer">
        Crediti virtuali. Nessuna scommessa reale, nessun denaro movimentato.
        <br />
        Beppe è una simulazione statistica: le probabilità non sono garanzie.
        <br />
        Il gioco può causare dipendenza patologica. 18+.
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ PICK */

function PickCard({ pick }: { pick: TicketPick }) {
  const a = pick.analysis;
  return (
    <article className="pick">
      <div className="pick-head">
        <div className="pick-league">
          <span className="mono">
            {pick.leagueLabel} · {formatTime(pick.kickoff)}
          </span>
          <span className={`badge ${pick.confidence === "bassa" ? "terra" : "green"}`}>
            confidenza {pick.confidence}
          </span>
        </div>
        <div className="pick-match display">{pick.match}</div>
        <div className="pick-sel">
          {pick.label} · quota {pick.odds.toFixed(2)} ({pick.bookmaker})
        </div>
      </div>

      <div className="numbers">
        <div>
          <div className="mono">Prob. modello</div>
          <div className="n">{pick.modelProbability.toFixed(1)}%</div>
        </div>
        <div>
          <div className="mono">Prob. quota</div>
          <div className="n">{pick.impliedProbability.toFixed(1)}%</div>
        </div>
        <div>
          <div className="mono">Margine</div>
          <div className="n">+{pick.edgePoints.toFixed(1)} pt</div>
        </div>
        <div>
          <div className="mono">Quota equa</div>
          <div className="n">{pick.fairOdds.toFixed(2)}</div>
        </div>
        <div>
          <div className="mono">Crediti</div>
          <div className="n">{pick.credits}</div>
        </div>
      </div>

      <div className="analysis">
        <h4>{a.headline}</h4>

        {a.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}

        <div className="mono" style={{ margin: "18px 0 6px" }}>Gli indicatori che ho guardato</div>
        <table className="dp">
          <tbody>
            {a.dataPoints.map((d, i) => (
              <tr key={i}>
                <td className="k">{d.label}</td>
                <td className="v">{d.value}</td>
                <td className="r">{d.read}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mono" style={{ margin: "4px 0 8px" }}>Risultati più probabili</div>
        <div className="scen">
          {a.scenario.map((s, i) => (
            <div className="s" key={i}>
              <b>{s.label}</b> · {s.probability}%
            </div>
          ))}
        </div>

        <div className="cols">
          <div>
            <div className="mono">Perché la gioco</div>
            <ul>
              {a.why.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mono">Cosa può andare storto</div>
            <ul>
              {a.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="verdict">{a.verdict}</div>
      </div>
    </article>
  );
}

/* ----------------------------------------------------------- UTILITIES */

function formatDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
  } catch {
    return "—";
  }
}
