import "./globals.css";

export const metadata = {
  title: "Beppe Bar — una mezza idea ce l'ho",
  description: "Analisi calcistiche statistiche, quote reali e 10 crediti virtuali al giorno.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
