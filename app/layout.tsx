import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PSE RCEm Monitor – Prosument Net-billing",
  description:
    "Bieżący monitoring szacowanej średniej miesięcznej ceny energii (RCEm) oraz stawki depozytu prosumenckiego na podstawie danych PSE.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>⚡</text></svg>" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
