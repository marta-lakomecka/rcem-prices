"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HourlyPoint {
  hour: string;
  rce: number;
}

interface RcemData {
  periodFrom: string;
  periodTo: string;
  fetchedAt: string;
  totalRecords: number;
  validRecords: number;
  skippedRecords: number;
  rcemPlnPerMwh: number;
  netRatePlnPerKwh: number;
  depositRatePlnPerKwh: number;
  hourlyData: HourlyPoint[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number, dec: number) {
  return n.toLocaleString("pl-PL", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Mini bar chart component
// ---------------------------------------------------------------------------

function RceBarChart({ data }: { data: HourlyPoint[] }) {
  if (!data.length) return null;

  const maxRce = Math.max(...data.map((d) => d.rce));
  const minRce = Math.min(...data.map((d) => d.rce));
  const range = maxRce - minRce || 1;

  // Show last 48 points max
  const visible = data.slice(-48);

  return (
    <div className="w-full">
      <div className="flex items-end gap-px h-20" style={{ minHeight: 80 }}>
        {visible.map((pt, i) => {
          const heightPct = ((pt.rce - minRce) / range) * 80 + 20;
          const isHigh = pt.rce > (maxRce + minRce) / 2;
          return (
            <div
              key={i}
              className="flex-1 relative group"
              style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
            >
              <div
                className="bar-grow w-full rounded-sm"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isHigh
                    ? "rgba(245,230,66,0.75)"
                    : "rgba(245,230,66,0.3)",
                  animationDelay: `${i * 8}ms`,
                }}
              />
              {/* Tooltip */}
              <div
                className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10
                            opacity-0 group-hover:opacity-100 transition-opacity duration-150
                            pointer-events-none whitespace-nowrap"
                style={{
                  background: "#252A38",
                  border: "1px solid #353A4A",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "#F0F0F0",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {fmt(pt.rce, 1)} zł/MWh
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1" style={{ color: "var(--text-muted)", fontSize: 11 }}>
        <span>{visible.length > 0 ? visible[0].hour.slice(5, 16).replace("T", " ") : ""}</span>
        <span>{visible.length > 0 ? visible[visible.length - 1].hour.slice(5, 16).replace("T", " ") : ""}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  unit,
  sublabel,
  accent,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  unit: string;
  sublabel?: string;
  accent?: boolean;
  icon: React.ElementType;
  delay?: number;
}) {
  return (
    <div
      className={`${accent ? "card-accent" : "card"} p-5 fade-in`}
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-display text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--text-secondary)", letterSpacing: "0.1em" }}
        >
          {label}
        </span>
        <Icon
          size={15}
          style={{ color: accent ? "var(--accent)" : "var(--text-muted)" }}
        />
      </div>
      <div
        className={`font-display font-bold animate-count ${accent ? "accent-glow" : ""}`}
        style={{
          fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
          color: accent ? "var(--accent)" : "var(--text-primary)",
          lineHeight: 1.1,
          animationDelay: `${delay + 100}ms`,
        }}
      >
        {value}
        <span
          className="font-display font-normal ml-1"
          style={{ fontSize: "0.45em", color: "var(--text-secondary)", verticalAlign: "baseline" }}
        >
          {unit}
        </span>
      </div>
      {sublabel && (
        <p className="mt-1" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Home() {
  const [data, setData] = useState<RcemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rcem", { cache: "no-store" });
      const json: RcemData = await res.json();
      if (json.error) {
        setError(json.error);
        setData(null);
      } else {
        setData(json);
        setLastRefresh(new Date());
      }
    } catch (e) {
      setError("Nie można pobrać danych. Sprawdź połączenie z internetem.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <main
      className="bg-grid min-h-screen"
      style={{ background: "var(--bg)" }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: "rgba(15,17,23,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Zap size={18} style={{ color: "var(--accent)" }} />
            <span
              className="font-display font-semibold"
              style={{ fontSize: 15, color: "var(--text-primary)" }}
            >
              PSE RCEm Monitor
            </span>
            <span
              className="hidden sm:inline font-display"
              style={{ fontSize: 13, color: "var(--text-muted)" }}
            >
              / net-billing
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!loading && data && (
              <div className="flex items-center gap-1.5">
                <div
                  className="pulse-dot rounded-full"
                  style={{ width: 7, height: 7, background: "var(--green)" }}
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {lastRefresh ? fmtTime(lastRefresh.toISOString()) : ""}
                </span>
              </div>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: loading ? "var(--text-muted)" : "var(--text-primary)",
                fontSize: 13,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw
                size={13}
                className={loading ? "spinner" : ""}
              />
              <span className="hidden sm:inline">Odśwież</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Period label */}
        {data && (
          <div className="fade-in" style={{ opacity: 0, animationDelay: "0ms" }}>
            <p
              className="font-display text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Okres:{" "}
              <span style={{ color: "var(--text-primary)" }}>
                {fmtDate(data.periodFrom)} – {fmtDate(data.periodTo)}
              </span>
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="spinner rounded-full"
              style={{
                width: 40,
                height: 40,
                border: "3px solid var(--border)",
                borderTopColor: "var(--accent)",
              }}
            />
            <p
              className="font-display"
              style={{ color: "var(--text-secondary)", fontSize: 14 }}
            >
              Pobieranie danych z PSE…
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            className="card p-6 fade-in"
            style={{
              opacity: 0,
              borderColor: "rgba(255,92,92,0.3)",
              background: "rgba(255,92,92,0.06)",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }}
              />
              <div>
                <p
                  className="font-display font-medium mb-1"
                  style={{ color: "var(--red)" }}
                >
                  Błąd połączenia z API PSE
                </p>
                <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                  {error}
                </p>
                <p
                  className="mt-3"
                  style={{ fontSize: 13, color: "var(--text-muted)" }}
                >
                  API PSE może być niedostępne z sieci firmowych. Spróbuj z innej
                  sieci lub zaczekaj chwilę i odśwież.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main data */}
        {!loading && data && (
          <>
            {/* Primary metrics — 3 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Szacowana RCEm"
                value={fmt(data.rcemPlnPerMwh, 2)}
                unit="zł/MWh"
                sublabel="Średnia ważona wolumenem PV"
                accent
                icon={TrendingUp}
                delay={100}
              />
              <StatCard
                label="Stawka netto"
                value={fmt(data.netRatePlnPerKwh, 4)}
                unit="zł/kWh"
                sublabel="RCEm ÷ 1000"
                icon={Zap}
                delay={200}
              />
              <StatCard
                label="Depozyt prosumencki"
                value={fmt(data.depositRatePlnPerKwh, 4)}
                unit="zł/kWh"
                sublabel="Stawka netto × 1,23"
                icon={CheckCircle2}
                delay={300}
              />
            </div>

            {/* Chart */}
            {data.hourlyData && data.hourlyData.length > 0 && (
              <div
                className="card p-5 fade-in"
                style={{ opacity: 0, animationDelay: "400ms" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={14} style={{ color: "var(--accent)" }} />
                  <span
                    className="font-display text-xs font-medium uppercase tracking-widest"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cena RCE na tle generacji PV – ostatnie godziny
                  </span>
                </div>
                <RceBarChart data={data.hourlyData} />
              </div>
            )}

            {/* Stats row */}
            <div
              className="card p-5 fade-in"
              style={{ opacity: 0, animationDelay: "500ms" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} style={{ color: "var(--accent)" }} />
                <span
                  className="font-display text-xs font-medium uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Statystyki bieżącego miesiąca
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: "Przedziałów 15-min",
                    value: data.totalRecords.toLocaleString("pl-PL"),
                  },
                  {
                    label: "Prawidłowych rekordów",
                    value: data.validRecords.toLocaleString("pl-PL"),
                  },
                  {
                    label: "Pominięte (brak danych)",
                    value: data.skippedRecords.toLocaleString("pl-PL"),
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p
                      style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 18, color: "var(--text-primary)" }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Formula explainer */}
            <div
              className="card p-5 fade-in"
              style={{ opacity: 0, animationDelay: "600ms" }}
            >
              <p
                className="font-display text-xs font-medium uppercase tracking-widest mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                Metodologia obliczeń
              </p>
              <div
                className="rounded-lg p-4"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              >
                <code
                  className="font-display"
                  style={{ fontSize: 13, color: "var(--accent)", lineHeight: 1.8 }}
                >
                  RCEm = Σ(rce_pln) / n
                  <br />
                  stawka_netto = RCEm / 1000
                  <br />
                  depozyt = stawka_netto × 1,23
                </code>
              </div>
              <p
                className="mt-3"
                style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}
              >
                Źródło danych: Polskie Sieci Elektroenergetyczne –{" "}
                <span style={{ color: "var(--text-secondary)" }}>api.raporty.pse.pl/api/rce-pln</span>.
                Dane w rozdzielczości 15-minutowej. RCEm liczone jako średnia arytmetyczna
                wszystkich przedziałów w miesiącu (API PSE nie udostępnia wolumenu PV
                w endpoincie rce-pln). Odświeżanie co 30 minut.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer
        className="max-w-5xl mx-auto px-4 py-6 mt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          PSE RCEm Monitor · dane: api.pse.pl · wyłącznie do celów informacyjnych
        </p>
      </footer>
    </main>
  );
}
