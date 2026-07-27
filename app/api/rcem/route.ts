import { NextResponse } from "next/server";

const API_BASE = "https://api.pse.pl/ogloszenia/pl/rce-p";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; PSE-RCEm-Monitor/1.0; Vercel)",
  Accept: "application/json",
};

interface PseRecord {
  rce?: number;
  RCE?: number;
  Rce?: number;
  rce_p?: number;
  q_gen_oze_pv?: number;
  qGenOzePv?: number;
  Q_GEN_OZE_PV?: number;
  gen_oze_pv?: number;
  doba?: string;
  [key: string]: unknown;
}

function getToday(): Date {
  return new Date();
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function extractValues(
  record: PseRecord
): { rce: number; pv: number } | null {
  const rceKeys = ["rce", "RCE", "Rce", "rce_p", "RCE_P"];
  const pvKeys = [
    "q_gen_oze_pv",
    "qGenOzePv",
    "Q_GEN_OZE_PV",
    "gen_oze_pv",
    "GenOzePv",
  ];

  let rce: number | null = null;
  for (const k of rceKeys) {
    if (record[k] !== undefined && record[k] !== null) {
      rce = Number(record[k]);
      break;
    }
  }

  let pv: number | null = null;
  for (const k of pvKeys) {
    if (record[k] !== undefined && record[k] !== null) {
      pv = Number(record[k]);
      break;
    }
  }

  if (rce === null || pv === null || isNaN(rce) || isNaN(pv)) return null;
  return { rce, pv };
}

function calculateRcem(records: PseRecord[]) {
  let sumWeighted = 0;
  let sumPv = 0;
  let validCount = 0;
  let zeroPvCount = 0;
  let skippedCount = 0;

  // Collect hourly data points for the chart
  const hourlyData: { hour: string; rce: number; pv: number }[] = [];

  for (const record of records) {
    const vals = extractValues(record);
    if (!vals) {
      skippedCount++;
      continue;
    }
    const { rce, pv } = vals;

    if (pv <= 0) {
      zeroPvCount++;
      continue;
    }

    sumWeighted += rce * pv;
    sumPv += pv;
    validCount++;

    hourlyData.push({
      hour: record.doba ? String(record.doba) : "",
      rce,
      pv,
    });
  }

  if (sumPv === 0) {
    return { error: "Suma wolumenów PV wynosi zero." };
  }

  const rcem = sumWeighted / sumPv;
  const netRate = rcem / 1000;
  const depositRate = netRate * 1.23;

  return {
    totalRecords: records.length,
    validRecords: validCount,
    skippedRecords: skippedCount,
    zeroPvRecords: zeroPvCount,
    sumPvVolume: sumPv,
    rcemPlnPerMwh: rcem,
    netRatePlnPerKwh: netRate,
    depositRatePlnPerKwh: depositRate,
    hourlyData: hourlyData.slice(-72), // last 72 hours for chart
  };
}

export async function GET() {
  const today = getToday();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const dateFrom = formatDate(firstOfMonth) + "T00:00:00";
  const dateTo = formatDate(today) + "T23:59:59";

  const url =
    `${API_BASE}` +
    `?$filter=doba ge '${dateFrom}' and doba le '${dateTo}'` +
    `&$orderby=doba asc` +
    `&$top=10000`;

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 3600 }, // cache 1h on Vercel
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `PSE API zwróciło błąd HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const records: PseRecord[] = Array.isArray(json)
      ? json
      : json.value ?? json.data ?? [];

    if (!records.length) {
      return NextResponse.json(
        { error: "Brak rekordów w odpowiedzi PSE." },
        { status: 502 }
      );
    }

    const result = calculateRcem(records);

    return NextResponse.json({
      ...result,
      periodFrom: formatDate(firstOfMonth),
      periodTo: formatDate(today),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Nieznany błąd połączenia";
    return NextResponse.json(
      { error: `Nie można połączyć się z API PSE: ${message}` },
      { status: 502 }
    );
  }
}
