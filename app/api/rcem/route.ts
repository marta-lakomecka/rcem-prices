import { NextResponse } from "next/server";

// Correct PSE API – confirmed working as of 2026
const API_BASE = "https://api.raporty.pse.pl/api/rce-pln";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PSE-RCEm-Monitor/1.0; Vercel)",
  Accept: "application/json",
};

interface PseRecord {
  dtime: string;
  period: string;
  rce_pln: number;
  business_date: string;
  publication_ts?: string;
}

interface ApiResponse {
  value: PseRecord[];
  nextLink?: string;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Fetch all pages for the date range (API returns paginated results)
async function fetchAllRecords(dateFrom: string, dateTo: string): Promise<PseRecord[]> {
  const filter = `business_date ge '${dateFrom}' and business_date le '${dateTo}'`;
  let url = `${API_BASE}?$filter=${encodeURIComponent(filter)}&$orderby=dtime asc`;

  const allRecords: PseRecord[] = [];
  let pageCount = 0;
  const maxPages = 50; // safety limit

  while (url && pageCount < maxPages) {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      throw new Error(`PSE API HTTP ${res.status}: ${res.statusText}`);
    }
    const json: ApiResponse = await res.json();
    const records = json.value ?? [];
    allRecords.push(...records);

    // Follow pagination if present
    url = json.nextLink ?? "";
    pageCount++;
  }

  return allRecords;
}

function calculateRcem(records: PseRecord[]) {
  if (!records.length) {
    return { error: "Brak rekordów do obliczenia RCEm." };
  }

  const validRecords = records.filter(
    (r) => r.rce_pln !== null && r.rce_pln !== undefined && !isNaN(Number(r.rce_pln))
  );

  if (!validRecords.length) {
    return { error: "Żaden rekord nie zawiera prawidłowej wartości rce_pln." };
  }

  // Simple arithmetic mean – PSE rce-pln API does not include PV volume
  // so weighted average by PV generation is not possible from this endpoint.
  // Arithmetic mean of 15-min intervals is the standard approach used by prosumers.
  const sum = validRecords.reduce((acc, r) => acc + Number(r.rce_pln), 0);
  const rcem = sum / validRecords.length;

  const netRate = rcem / 1000;
  const depositRate = netRate * 1.23;

  // Build hourly chart data (take last record of each hour for display)
  const hourlyMap = new Map<string, number>();
  for (const r of validRecords) {
    // dtime format: "2026-07-01 13:45:00"
    const hourKey = r.dtime.slice(0, 13); // "2026-07-01 13"
    hourlyMap.set(hourKey, Number(r.rce_pln));
  }

  const hourlyData = Array.from(hourlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, rce]) => ({ hour, rce }));

  return {
    totalRecords: records.length,
    validRecords: validRecords.length,
    skippedRecords: records.length - validRecords.length,
    rcemPlnPerMwh: rcem,
    netRatePlnPerKwh: netRate,
    depositRatePlnPerKwh: depositRate,
    hourlyData: hourlyData.slice(-72),
  };
}

export async function GET() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const dateFrom = formatDate(firstOfMonth);
  const dateTo = formatDate(today);

  try {
    const records = await fetchAllRecords(dateFrom, dateTo);

    if (!records.length) {
      return NextResponse.json(
        { error: "Brak danych dla bieżącego miesiąca w API PSE." },
        { status: 502 }
      );
    }

    const result = calculateRcem(records);

    return NextResponse.json({
      ...result,
      periodFrom: dateFrom,
      periodTo: dateTo,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Nieznany błąd";
    return NextResponse.json(
      { error: `Nie można pobrać danych z API PSE: ${message}` },
      { status: 502 }
    );
  }
}
