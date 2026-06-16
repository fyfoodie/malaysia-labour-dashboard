import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, ChevronDown, Info } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";

/* ═══════════════════════════════════════════════════════════════════════════
   FORECAST MATH — unchanged. Damped Holt's double exponential smoothing.
   Presentation rebuilt for a general audience; the statistics are identical.
   ═══════════════════════════════════════════════════════════════════════════ */

function dampedHoltSmooth(data: number[], alpha: number, beta: number, phi: number) {
  if (data.length < 2) return { smoothed: data, level: data[0] ?? 0, trend: 0 };
  let level = data[0];
  let trend = data[1] - data[0];
  const smoothed = [level];
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + phi * trend);
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
    smoothed.push(level);
  }
  return { smoothed, level, trend };
}

function optimizeDampedHolt(data: number[]) {
  let bestAlpha = 0.3, bestBeta = 0.1, bestPhi = 0.9, bestSSE = Infinity;
  for (let a = 0.05; a <= 0.95; a = +(a + 0.1).toFixed(2)) {
    for (let b = 0.05; b <= 0.50; b = +(b + 0.1).toFixed(2)) {
      for (let p = 0.80; p <= 0.98; p = +(p + 0.06).toFixed(2)) {
        const { smoothed } = dampedHoltSmooth(data, a, b, p);
        const sse = smoothed.reduce((sum, s, i) => sum + Math.pow(s - data[i], 2), 0);
        if (sse < bestSSE) { bestSSE = sse; bestAlpha = a; bestBeta = b; bestPhi = p; }
      }
    }
  }
  return { alpha: bestAlpha, beta: bestBeta, phi: bestPhi };
}

function forecastDampedHolt(data: number[], h: number) {
  const { alpha, beta, phi } = optimizeDampedHolt(data);
  const { smoothed, level, trend } = dampedHoltSmooth(data, alpha, beta, phi);
  const residuals = data.map((d, i) => d - smoothed[i]);
  const stdResid  = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);
  const mape      = data.reduce((s, d, i) => d === 0 ? s : s + Math.abs((d - smoothed[i]) / d), 0)
                    / data.length * 100;
  let phiSum = 0;
  const forecasts = Array.from({ length: h }, (_, i) => {
    phiSum += Math.pow(phi, i + 1);
    const point = level + phiSum * trend;
    return {
      value: +point.toFixed(3),
      upper: +(point + 1.96 * stdResid * Math.sqrt(i + 1)).toFixed(3),
      lower: +(point - 1.96 * stdResid * Math.sqrt(i + 1)).toFixed(3),
    };
  });
  return { forecasts, mape: +mape.toFixed(1), alpha: +alpha.toFixed(2), beta: +beta.toFixed(2), phi: +phi.toFixed(2) };
}

const HORIZON = 12;

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "11px",
  color: "hsl(var(--foreground))",
};

// Plain-language confidence label (from MAPE, but never shows the term MAPE)
const confidenceLabel = (mape: number, isBm: boolean) =>
  mape < 5  ? (isBm ? "Keyakinan tinggi"   : "High confidence")
: mape < 10 ? (isBm ? "Keyakinan sederhana" : "Medium confidence")
            : (isBm ? "Keyakinan rendah"    : "Lower confidence");

const confidenceColor = (mape: number) =>
  mape < 5 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
  : mape < 10 ? "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
  : "text-red-500 bg-red-500/10";

function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString("en-MY", { month: "short", year: "2-digit" });
}

const ForecastSection = () => {
  const { data, loading } = useLabourData();
  const { lang } = useLanguage();
  const isBm = lang === "bm";
  const [showMethod, setShowMethod] = useState(false);

  const forecasts = useMemo(() => {
    if (!data?.national?.length) return null;
    const nat    = [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const recent = nat.slice(-48);
    if (recent.length < 12) return null;

    const lastDate = recent[recent.length - 1].date;

    const metrics = [
      {
        key: "uRate",
        label: isBm ? "Kadar Pengangguran" : "Unemployment Rate",
        plain: isBm ? "Berapa ramai mencari kerja tetapi belum dapat" : "How many people want work but can't find it",
        unit: "%", color: "#f97316",
        values: recent.map((d: any) => d.u_rate ?? 0),
        goodWhenDown: true,
      },
      {
        key: "pRate",
        label: isBm ? "Kadar Penyertaan" : "Participation Rate",
        plain: isBm ? "Berapa ramai dewasa bekerja atau mencari kerja" : "How many adults are working or job-hunting",
        unit: "%", color: "#22c55e",
        values: recent.map((d: any) => d.p_rate ?? 0),
        goodWhenDown: false,
      },
      {
        key: "lf",
        label: isBm ? "Saiz Tenaga Kerja" : "Workforce Size",
        plain: isBm ? "Jumlah rakyat dalam pasaran kerja" : "Total people in the job market",
        unit: "M", color: "#3b82f6",
        values: recent.map((d: any) => +(d.lf / 1000).toFixed(2)),
        goodWhenDown: false,
      },
    ];

    return metrics.map(m => {
      const { forecasts: pts, mape, alpha, beta, phi } = forecastDampedHolt(m.values, HORIZON);

      const historical = recent.slice(-18).map((d: any, i: number) => ({
        label:    new Date(d.date).toLocaleDateString("en-MY", { month: "short", year: "2-digit" }),
        actual:   m.values[recent.length - 18 + i],
        forecast: null as number | null,
        upper:    null as number | null,
        lower:    null as number | null,
      }));

      const last = historical[historical.length - 1];
      historical[historical.length - 1] = { ...last, forecast: last.actual, upper: last.actual, lower: last.actual };

      const future = pts.map((p, i) => ({
        label:    addMonths(lastDate, i + 1),
        actual:   null as number | null,
        forecast: p.value,
        upper:    p.upper,
        lower:    p.lower,
      }));

      const combined    = [...historical, ...future];
      const currentVal  = m.values[m.values.length - 1];
      const forecastVal = pts[HORIZON - 1].value;
      const change      = +(forecastVal - currentVal).toFixed(3);
      const improving   = m.goodWhenDown ? change < 0 : change > 0;
      const flat        = Math.abs(change) < (m.unit === "M" ? 0.05 : 0.05);
      const targetDate  = addMonths(lastDate, HORIZON);

      return { ...m, combined, mape, alpha, beta, phi, currentVal, forecastVal, change, improving, flat, targetDate };
    });
  }, [data, isBm]);

  if (loading || !forecasts) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-64 animate-pulse" />;
  }

  const targetDate = forecasts[0].targetDate;

  // Plain-language one-liner per metric for the summary
  const summaryLine = (f: typeof forecasts[number]) => {
    const dir = f.flat
      ? (isBm ? "kekal lebih kurang sama" : "stay about the same")
      : f.improving
        ? (isBm ? "bertambah baik" : "improve")
        : (isBm ? "merosot sedikit" : "slip a little");
    return { dir, val: `${f.forecastVal}${f.unit}` };
  };

  const L = {
    title:    isBm ? "Pasaran Kerja Setahun Dari Sekarang" : "The Job Market a Year From Now",
    subtitle: isBm
      ? `Anggaran ke ${targetDate}, berdasarkan arah aliran terkini`
      : `An estimate for ${targetDate}, based on where the numbers are heading`,
    badge:    isBm ? "Anggaran" : "Estimate",
    leadIn:   isBm ? "Jika keadaan diteruskan, menjelang" : "If current trends hold, by",
    today:    isBm ? "Hari ini" : "Today",
    projected:isBm ? "Anggaran" : "Projected",
    likelyRange: isBm ? "Julat berkemungkinan" : "Likely range",
    actual:   isBm ? "Sebenar" : "Actual",
    howWeKnow:isBm ? "Bagaimana anggaran ini dibuat" : "How we made this estimate",
    notPromise: isBm ? "Anggaran, bukan jaminan" : "An estimate, not a promise",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{L.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{L.subtitle}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 self-start">
            <Info className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{L.badge}</span>
          </div>
        </div>

        {/* Plain-language summary — three short rows instead of one dense sentence */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {forecasts.map(f => {
            const s = summaryLine(f);
            return (
              <div key={f.key} className="p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="text-[11px] font-semibold text-foreground">{f.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {L.leadIn} <span className="font-medium text-foreground">{f.targetDate}</span>,{" "}
                  {isBm ? "dijangka" : "expected to"}{" "}
                  <span className="font-semibold" style={{ color: f.color }}>{s.dir}</span>
                  {" "}({s.val})
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Three charts ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {forecasts.map(f => {
          const TrendIcon = f.flat ? Minus : f.improving ? (f.goodWhenDown ? TrendingDown : TrendingUp) : (f.goodWhenDown ? TrendingUp : TrendingDown);
          const trendColor = f.flat ? "text-muted-foreground" : f.improving ? "text-emerald-500" : "text-red-500";
          return (
            <div key={f.key} className="p-4">
              {/* Mini header */}
              <div className="flex items-start justify-between mb-1">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.plain}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${confidenceColor(f.mape)}`}>
                  {confidenceLabel(f.mape, isBm)}
                </span>
              </div>

              {/* Now → Projected */}
              <div className="flex items-center gap-2 mb-3 mt-2">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{L.today}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{f.currentVal}{f.unit}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground -rotate-90 mt-3" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{L.projected}</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: f.color }}>{f.forecastVal}{f.unit}</span>
                </div>
                <div className={`flex items-center gap-0.5 ml-auto text-[11px] font-semibold ${trendColor}`}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {f.change > 0 ? "+" : ""}{f.change}{f.unit}
                </div>
              </div>

              {/* Chart */}
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={f.combined} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} interval={5} />
                    <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={v => `${v}${f.unit}`} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600 }}
                      formatter={(v: any, name: string) => {
                        if (name === "upper" || name === "lower" || v == null) return null;
                        return [`${v}${f.unit}`, name === "actual" ? L.actual : L.projected];
                      }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill={f.color} fillOpacity={0.08}
                      legendType="none" dot={false} activeDot={false} name="upper" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--card))" fillOpacity={1}
                      legendType="none" dot={false} activeDot={false} name="lower" />
                    <Line type="monotone" dataKey="actual" stroke={f.color} strokeWidth={2}
                      dot={false} activeDot={{ r: 3 }} connectNulls={false} name="actual" />
                    <Line type="monotone" dataKey="forecast" stroke={f.color} strokeWidth={1.5}
                      strokeDasharray="5 3" dot={false} activeDot={{ r: 3 }} connectNulls name="forecast" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5 rounded" style={{ backgroundColor: f.color }} />
                  <span className="text-[10px] text-muted-foreground">{L.actual}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: f.color }} />
                  <span className="text-[10px] text-muted-foreground">{L.projected}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2.5 rounded-sm opacity-20" style={{ backgroundColor: f.color }} />
                  <span className="text-[10px] text-muted-foreground">{L.likelyRange}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── How we made this (plain language, technical details folded in) ──── */}
      <div className="border-t border-border bg-muted/10">
        <button onClick={() => setShowMethod(o => !o)}
          className="flex items-center justify-between w-full px-5 py-3 hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{L.howWeKnow}</span>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showMethod ? "rotate-180" : ""}`} />
        </button>

        {showMethod && (
          <div className="px-5 pb-5 pt-1 space-y-3 text-[12px] text-muted-foreground leading-relaxed">
            <p>
              {isBm
                ? "Kami mengambil arah aliran setiap petunjuk sejak 4 tahun lepas dan memanjangkannya ke hadapan. Berbanding andaian bahawa trend berterusan selama-lamanya, kaedah kami menganggap trend itu beransur perlahan dari semasa ke semasa, jadi anggaran tidak melampau."
                : "We take each indicator's trend over the last 4 years and extend it forward. Instead of assuming the trend continues forever, our method lets the trend gradually flatten over time, so the estimate stays realistic rather than runaway."}
            </p>
            <p>
              {isBm
                ? "Bayang berwarna di sekeliling garis putus menunjukkan julat berkemungkinan. Ia melebar makin jauh ke hadapan kerana semakin jauh ke masa depan, semakin tidak pasti."
                : "The shaded band around the dashed line shows the likely range. It widens the further out it goes, because the further into the future, the less certain anything is."}
            </p>
            <p>
              {isBm
                ? "Data COVID-19 dikecualikan: kami hanya melatih model dengan 48 bulan terkini supaya lonjakan pandemik (pengangguran memuncak 5.3% pada Mei 2020) tidak memesongkan anggaran."
                : "COVID-19 is left out: we train only on the most recent 48 months so the pandemic spike (unemployment peaked at 5.3% in May 2020) doesn't distort the estimate."}
            </p>

            {/* Technical details — for the curious, kept compact */}
            <details className="group/tech">
              <summary className="cursor-pointer text-[11px] font-medium text-foreground/70 hover:text-foreground list-none flex items-center gap-1">
                <ChevronDown className="h-3 w-3 transition-transform group-open/tech:rotate-180" />
                {isBm ? "Butiran teknikal" : "Technical details"}
              </summary>
              <div className="mt-2 pl-4 space-y-1.5 text-[11px] text-muted-foreground/80">
                <p>
                  {isBm ? "Kaedah: " : "Method: "}
                  <span className="text-foreground">Damped Holt's double exponential smoothing</span>
                  {isBm
                    ? ", satu kaedah peramalan siri masa piawai (Gardner & McKenzie, 1985; disahkan dalam pertandingan peramalan M4, Makridakis et al., 2020)."
                    : ", a standard time-series forecasting method (Gardner & McKenzie, 1985; validated in the M4 forecasting competition, Makridakis et al., 2020)."}
                </p>
                <p>
                  {isBm ? "Parameter setiap petunjuk dioptimumkan automatik:" : "Per-indicator parameters auto-optimised:"}
                </p>
                <ul className="space-y-0.5">
                  {forecasts.map(f => (
                    <li key={f.key} className="font-mono">
                      {f.label}: α={f.alpha} · β={f.beta} · φ={f.phi}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground/60">
                  {isBm
                    ? "(α = berapa cepat bertindak balas kepada data baru, β = kepekaan trend, φ = kadar trend mendatar. Julat = selang keyakinan 95%.)"
                    : "(α = how fast it reacts to new data, β = trend sensitivity, φ = how quickly the trend flattens. Range = 95% confidence interval.)"}
                </p>
              </div>
            </details>

            {/* Source + disclaimer */}
            <div className="pt-2 border-t border-border flex flex-col gap-1.5">
              <a href="https://open.dosm.gov.my/data-catalogue/lfs_month" target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground/70 underline hover:text-foreground transition-colors w-fit">
                {isBm ? "Sumber: Tinjauan Tenaga Buruh DOSM" : "Source: DOSM Labour Force Survey"}
              </a>
              <p className="text-[11px] text-muted-foreground/70">
                <span className="font-semibold text-foreground/80">{L.notPromise}.</span>{" "}
                {isBm
                  ? "Ini bukan ramalan rasmi DOSM atau mana-mana agensi kerajaan."
                  : "This is not an official forecast by DOSM or any government agency."}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ForecastSection;