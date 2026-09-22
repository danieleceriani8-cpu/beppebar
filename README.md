# Beppe Bar — versione con provider gratuiti

Provider dati **gratuiti**, scelti per restare dentro i limiti con 4 campionati
e massimo 2-3 giocate al giorno.

**Il logo è un placeholder** da rifare (in `components/Logo.tsx`).

## Tornei monitorati (4)
Serie A, Premier League, La Liga, Champions League.
Esclusi: Serie B (xG spesso assente nei piani free), Championship (troppe
partite/settimana), Europa League (si sovrappone alla Champions).

## Provider
- **Statistiche/calendario**: [API-Football](https://www.api-football.com) — 100 richieste/giorno gratis, nessuna carta richiesta
- **Quote reali**: [OddsPapi](https://oddspapi.io) — 250 richieste/mese gratis, 350+ bookmaker

## Come attivarlo

### 1. Chiavi API
- `FOOTBALL_API_KEY` da api-football.com
- `ODDS_API_KEY` da oddspapi.io

### 2. Storage (Vercel KV)
Dashboard Vercel → **Storage → Create Database → KV** → collega al progetto.
Vercel imposta da solo `KV_REST_API_URL` e `KV_REST_API_TOKEN`.

### 3. Chat (opzionale)
`OPENAI_API_KEY` da platform.openai.com

### 4. Variabili d'ambiente su Vercel
Settings → Environment Variables → aggiungi tutte quelle sopra + `CRON_SECRET` (una password a tua scelta).

### 5. Deploy
1. Carica la cartella su GitHub (repository nuovo)
2. Vercel → Add New → Project → importa il repository
3. Verifica che le Environment Variables siano impostate
4. Deploy

### 6. Test manuale
```
curl -H "Authorization: Bearer TUO_CRON_SECRET" https://tuo-dominio.vercel.app/api/daily
```

Il cron in `vercel.json` gira automaticamente ogni giorno alle 10:00 UTC (~12:00 italiane).

## Importante
- Non esegue giocate reali, non gestisce denaro reale
- Se il margine statistico non c'è: risponde NO BET
- Il mapping in `lib/providers/api-football.ts` è basato sulla struttura tipica
  della risposta ufficiale, ma va verificato con una chiamata reale prima di
  fidarsene al 100%: alcuni campi potrebbero avere nomi leggermente diversi
