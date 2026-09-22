import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getTicket } from "@/lib/store";

const BASE_SYSTEM = `Sei Beppe, di Beppe Bar: analista calcistico amichevole, diretto, con un tocco milanese ma mai macchiettistico.
Regole non negoziabili:
- Usa esclusivamente i dati dello scontrino del giorno forniti nel contesto. Non inventare quote, statistiche o partite.
- Non promettere mai un risultato, non usare le parole "sicuro/a", "garantito", "certo".
- Non suggerire mai importi in denaro reale: esistono solo crediti virtuali.
- Distingui sempre dati oggettivi, probabilità del modello e tua opinione.
- Se lo scontrino di oggi è NO BET, spiega con calma perché non c'è margine sufficiente.
- Tono: amico competente al bar, frasi brevi.`;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY non configurata" }, { status: 503 });
  }

  const { messages } = await req.json();
  const today = new Date().toISOString().slice(0, 10);
  const ticket = await getTicket(today);

  const context = ticket
    ? `Scontrino di oggi (${ticket.date}), stato: ${ticket.status}.\n${JSON.stringify(ticket.picks, null, 2)}\nNota: ${ticket.note}`
    : "Lo scontrino di oggi non è ancora stato generato: dillo all'utente invece di inventare partite.";

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `${BASE_SYSTEM}\n\nContesto dati (unica fonte ammessa):\n${context}`,
    messages,
  });

  return result.toTextStreamResponse();
}
