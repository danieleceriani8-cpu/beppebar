# Beppe Bar

Analisi statistiche sul calcio. 100 crediti virtuali, massimo 10 al giorno,
massimo 3 selezioni. Se il valore non c'è, Beppe non gioca.

---

## La regola numero uno di questa versione

**Il sito funziona anche senza nessuna chiave API e senza nessun database.**

È la lezione della prima versione: KV non veniva iniettato nel runtime,
API-Football bloccava la stagione corrente e tutto il sito andava giù.
Qui nessun provider può far esplodere la pagina:

| Componente | Se configurato | Se NON configurato |
|---|---|---|
| Statistiche | football-data.org | dataset interno deterministico |
| Quote | the-odds-api.com | mercato simulato con margine bookmaker realistico |
| Database | — | cache in memoria + rigenerazione deterministica per data |
| Chat AI | rimossa in questa versione | — |

La home dichiara sempre, in chiaro, quale fonte ha usato.

---

## Deploy (5 minuti, zero configurazione)

1. Copia tutti questi file nel repository `beppebar` (sostituendo i vecchi).
2. `git add . && git commit -m "beppe bar v1" && git push`
3. Vercel fa il deploy da solo.
4. Apri il sito. Deve già funzionare.

**Non serve aggiungere nessuna variabile d'ambiente.**
Quelle vecchie (`KV_*`, `REDIS_URL`, `FOOTBALL_API_KEY`, `OPENAI_API_KEY`)
puoi cancellarle: non vengono più lette da nessun file.

---

## Attivare i dati reali (quando vuoi, non ora)

1. Chiave gratuita su football-data.org → variabile `FOOTBALL_DATA_API_KEY`
2. Chiave gratuita su the-odds-api.com → variabile `ODDS_API_KEY`
3. Redeploy.

Il sito passa ai dati reali da solo e lo scrive nella sezione "Come ci sono arrivato".
Se la chiave scade o finisce la quota giornaliera, torna in automatico al fallback
invece di andare in errore.

---

## Endpoint

| URL | Cosa fa |
|---|---|
| `/` | la home: schedina del giorno, analisi, trasparenza, storico |
| `/api/daily` | genera lo scontrino (lo chiama il cron alle 12:00 italiane) |
| `/api/daily?force=1` | rigenera forzando il ricalcolo |
| `/api/ticket` | lo scontrino in JSON |
| `/api/debug` | dice quali variabili vede il runtime |

Se imposti `CRON_SECRET`, l'endpoint `/api/daily` accetta
`Authorization: Bearer <secret>` oppure `?key=<secret>`.
Se non lo imposti, resta aperto e funziona dal browser.

---

## Come ragiona il motore

1. **Reti attese**: attacco × difesa avversaria, riportato alla media del torneo,
   poi corretto per fattore campo, forma recente (pesata), giorni di riposo, assenze.
2. **Matrice di Poisson 8×8**: da lì escono tutte le probabilità di mercato
   (1X2, doppia chance, DNB, Over/Under, Goal, clean sheet, risultati esatti).
3. **Confronto con la quota**: margine = probabilità modello − probabilità implicita.
4. **Filtri di disciplina**:
   - margine minimo `MIN_EDGE_PERCENT` (default 5 punti)
   - quote fuori dal range 1,25 – 4,50 scartate
   - una sola selezione per partita (niente giocate correlate)
   - massimo 3 selezioni, massimo 10 crediti al giorno
   - budget allocato in proporzione al margine, mai rincorsa alle perdite
5. **NO BET**: se nessun mercato supera la soglia, Beppe spiega quale era
   la selezione più vicina e di quanto ha mancato la soglia.

## Le analisi

Ogni giocata produce:

- un titolo che sintetizza la tesi
- quattro paragrafi discorsivi, ognuno ancorato a numeri calcolati davvero
- una tabella di sei indicatori, ognuno con la sua **lettura** (non solo il dato)
- i quattro risultati esatti più probabili con relativa percentuale
- perché si gioca / cosa può andare storto
- il verdetto con quota equa, quota di mercato e margine in punti

Nessun numero è decorativo: arrivano tutti dalla matrice del modello.

---

## Parametri

| Variabile | Default | Cosa fa |
|---|---|---|
| `DAILY_CREDITS_BUDGET` | 10 | crediti massimi al giorno |
| `MIN_EDGE_PERCENT` | 5 | margine minimo per giocare |
| `MAX_PICKS_PER_DAY` | 3 | selezioni massime |

---

## Avvertenze

Crediti virtuali. Nessuna scommessa reale, nessun denaro movimentato,
nessun collegamento a conti di gioco. Beppe è una simulazione statistica:
le probabilità non sono garanzie. Il gioco può causare dipendenza patologica. 18+.
