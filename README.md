# PSE RCEm Monitor

Aplikacja Next.js do monitorowania bieżącej szacowanej średniej miesięcznej ceny energii (RCEm) oraz stawki depozytu prosumenckiego dla prosumentów w systemie net-billing.

## Dane

- **Źródło:** Polskie Sieci Elektroenergetyczne – `api.pse.pl`
- **Zakres:** Od 1. dnia bieżącego miesiąca do dziś
- **Wzór RCEm:** `Σ(rce × q_gen_oze_pv) / Σ(q_gen_oze_pv)`
- **Depozyt:** `(RCEm / 1000) × 1,23`

## Deploy na Vercel

1. Wgraj projekt na GitHub
2. Połącz repozytorium z Vercel (vercel.com → New Project)
3. Framework preset: **Next.js** (wykryje automatycznie)
4. Kliknij **Deploy** – żadnych zmiennych środowiskowych nie trzeba

## Lokalnie

```bash
npm install
npm run dev
# Otwórz http://localhost:3000
```

## Struktura

```
app/
  api/rcem/route.ts   # Pobiera i oblicza RCEm z PSE API
  page.tsx            # Dashboard UI
  globals.css         # Style i animacje
  layout.tsx          # HTML shell
```
