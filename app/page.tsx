"use client";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import type { DailyTicket, HistoryDay } from "@/lib/types";

type Msg = { role: "user" | "beppe"; text: string };

export default function Home() {
  const [ticket, setTicket] = useState<DailyTicket | null>(null);
  const [capital, setCapital] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const chatBody = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ticket")
      .then((r) => r.json())
      .then((data) => {
        setTicket(data.ticket);
        setCapital(data.capital);
        setHistory(data.history ?? []);
        setMessages([
          {
            role: "beppe",
            text: data.ticket
              ? data.ticket.status === "no_bet"
                ? "Ciao Dani. Oggi ho guardato tutto e non ho trovato un margine che valesse la pena. Chiedimi pure perché."
                : "Ciao Dani, ho preparato lo scontrino di oggi qui a fianco. Chiedimi pure il perché di ogni idea."
              : "Lo scontrino di oggi non è ancora stato generato: probabilmente il provider dati o lo storage non sono ancora collegati.",
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function send() {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: q }] }),
    });
    if (!res.ok || !res.body) {
      setMessages((m) => [...m, { role: "beppe", text: "Non riesco a risponderti ora: manca la configurazione della chat (OPENAI_API_KEY)." }]);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    setMessages((m) => [...m, { role: "beppe", text: "" }]);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "beppe", text: acc };
        return copy;
      });
      chatBody.current?.scrollTo(0, chatBody.current.scrollHeight);
    }
  }

  return (
    <main>
      <nav>
        <div className="wrap nav-in">
          <a className="brand" href="#">
            <Logo size={42} />
            <span className="brand-t"><b>Beppe Bar</b><span>UNA MEZZA IDEA CE L'HO</span></span>
          </a>
          <div className="status-pill"><span className="dot" /> {loading ? "aggiornamento…" : ticket ? "dati live" : "in attesa di dati"}</div>
        </div>
      </nav>

      <section className="hero">
        <div className="wrap">
          <div className="hero-card">
            <div className="hero-top">
              <Logo size={56} />
              <div className="hero-who"><b>Beppe</b><span>ti scrive ora</span></div>
              <div className="hero-time">{ticket ? `oggi, ${new Date(ticket.generatedAt).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}` : "in attesa"}</div>
            </div>
            {ticket ? (
              ticket.status === "no_bet" ? (
                <>
                  <h1 className="msg">Oggi meglio<br /><em>un caffè</em><br />che una schedina.</h1>
                  <p className="hero-body">{ticket.note}</p>
                </>
              ) : (
                <>
                  <h1 className="msg">Oggi una<br /><em>mezza idea</em><br />ce l'ho.</h1>
                  <p className="hero-body">Ho trovato <b>{ticket.picks.length} {ticket.picks.length === 1 ? "partita" : "partite"}</b> con un margine statistico reale. Le trovi qui sotto, con quote rilevate dal mercato in tempo reale.</p>
                </>
              )
            ) : (
              <>
                <h1 className="msg">Sto ancora<br /><em>preparando</em><br />il bar.</h1>
                <p className="hero-body">Non ho ancora uno scontrino da mostrarti: probabilmente il provider dati o lo storage (Vercel KV) non sono stati configurati. Vedi il README per collegarli.</p>
              </>
            )}
            <div className="strip">
              <div><div className="mono">Capitale virtuale</div><b>{capital?.toFixed(2) ?? "—"} cr</b></div>
              <div><div className="mono">In gioco oggi</div><b>{ticket?.totalCreditsUsed?.toFixed(2) ?? "0,00"} cr</b></div>
              <div><div className="mono">Scontrini in storico</div><b>{history.length}</b></div>
            </div>
          </div>
        </div>
      </section>

      <section id="chat">
        <div className="wrap">
          <div className="sec-head"><p className="mono">Due chiacchiere</p><h2>Chiedigli quello che vuoi.</h2></div>
          <div className="split">
            <div className="chat">
              <div className="chat-top"><Logo size={34} /><b style={{marginLeft:8}}>Beppe</b></div>
              <div className="chat-body" ref={chatBody}>
                {messages.map((m, i) => (
                  <div key={i} className={`bubble ${m.role === "beppe" ? "b-him" : "b-me"}`}>{m.text}</div>
                ))}
              </div>
              <div className="chat-in">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Scrivi a Beppe..." />
                <button className="send" onClick={send}>➤</button>
              </div>
            </div>

            <div className="receipt-wrap">
              <div className="receipt">
                <div className="r-head"><Logo size={44} /><b>Beppe Bar</b><span>{ticket?.date ?? "—"}</span></div>
                <div className="r-div" />
                {!ticket && <div className="empty">Nessuno scontrino disponibile. Collega il provider dati e Vercel KV, poi esegui /api/daily.</div>}
                {ticket?.status === "no_bet" && <div className="empty">{ticket.note}</div>}
                {ticket?.status === "picks" && ticket.picks.map((p) => (
                  <div key={p.fixtureId + p.market}>
                    <div className="r-match">
                      <span className="r-league">{p.league}</span>
                      <p className="r-teams">{p.match}</p>
                      <div className="r-line"><span>Idea</span><b>{p.label}</b></div>
                      <div className="r-line"><span>Quota</span><b>{p.odds.toFixed(2)}</b></div>
                      <div className="r-conf-bar">
                        <div className="lab"><span>Modello vs mercato</span><span>{p.modelProbability}% / {p.impliedProbability}%</span></div>
                        <div className="track"><div className="fill" style={{ width: `${p.modelProbability}%` }} /></div>
                      </div>
                      <p className="r-note">Margine +{p.edgePoints} pt · confidenza {p.confidence} · {p.credits} crediti</p>
                    </div>
                    <div className="r-div" />
                  </div>
                ))}
                {ticket?.status === "picks" && (
                  <>
                    <div className="r-total"><span className="mono">Ritorno teorico</span><b>{ticket.theoreticalReturn} cr</b></div>
                    <div className="r-foot"><span>Quote rilevate alle {new Date(ticket.generatedAt).toLocaleTimeString("it-IT")} · nessuna giocata eseguita</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="storico">
        <div className="wrap">
          <div className="sec-head"><p className="mono">Beppe non nasconde niente</p><h2>Quello che è successo prima.</h2></div>
          <div className="hist-row">
            {history.length === 0 && <div className="empty">Nessuno storico ancora: si popola automaticamente dopo il primo giorno di analisi.</div>}
            {history.map((h) => (
              <div className="h-item" key={h.date}>
                <div className="h-mid"><b>{h.date}</b><span>{h.picks.map((p) => p.match).join(" · ") || "Nessuna giocata"}</span></div>
                <div className={`h-right ${h.creditsDelta > 0 ? "pos" : h.creditsDelta < 0 ? "neg" : "neu"}`}>{h.creditsDelta > 0 ? "+" : ""}{h.creditsDelta.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
