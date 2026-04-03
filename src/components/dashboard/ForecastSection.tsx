import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingDown, TrendingUp, Activity, Info, BookOpen } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";

// ── Damped Holt's Double Exponential Smoothing ────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const HORIZON = 12;

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "11px",
  color: "hsl(var(--foreground))",
};

const accuracyLabel = (mape: number) =>
  mape < 5 ? "High" : mape < 10 ? "Medium" : "Low";
const accuracyColor = (mape: number) =>
  mape < 5 ? "text-green-500 bg-green-500/10"
  : mape < 10 ? "text-yellow-500 bg-yellow-500/10"
  : "text-red-500 bg-red-500/10";

function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString("en-MY", { month: "short", year: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────
const ForecastSection = () => {
  const { data, loading } = useLabourData();

  const forecasts = useMemo(() => {
    if (!data?.national?.length) return null;
    const nat    = [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const recent = nat.slice(-48);
    if (recent.length < 12) return null;

    const lastDate = recent[recent.length - 1].date;

    const metrics = [
      {
        key:    "uRate",
        label:  "Unemployment Rate",
        unit:   "%",
        color:  "#f97316",
        values: recent.map((d: any) => d.u_rate ?? 0),
        invert: true,
      },
      {
        key:    "pRate",
        label:  "Participation Rate",
        unit:   "%",
        color:  "#22c55e",
        values: recent.map((d: any) => d.p_rate ?? 0),
        invert: false,
      },
      {
        key:    "lf",
        label:  "Labour Force",
        unit:   "M",
        color:  "#3b82f6",
        values: recent.map((d: any) => +(d.lf / 1000).toFixed(2)),
        invert: false,
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
      const improving   = m.invert ? change < 0 : change > 0;
      const targetDate  = addMonths(lastDate, HORIZON);

      return { ...m, combined, mape, alpha, beta, phi, currentVal, forecastVal, change, improving, targetDate };
    });
  }, [data]);

  if (loading || !forecasts) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-64 animate-pulse" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">12-Month Market Forecast</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Damped Holt's Exponential Smoothing · trained on post-recovery data only
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border self-start">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Statistical Projection</span>
          </div>
        </div>

        {/* Headline summary */}
        <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border">
          <p className="text-xs text-foreground leading-relaxed">
            {forecasts.map((f, i) => (
              <span key={f.key}>
                <span className="font-semibold">{f.label}</span>
                {" projected to reach "}
                <strong style={{ color: f.color }}>{f.forecastVal}{f.unit}</strong>
                {" by "}<strong>{f.targetDate}</strong>
                {" "}
                <span className={f.improving ? "text-green-500" : "text-red-500"}>
                  ({f.change > 0 ? "+" : ""}{f.change}{f.unit})
                </span>
                {i < forecasts.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* 3 charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {forecasts.map(f => (
          <div key={f.key} className="p-4">
            {/* Mini header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-foreground">{f.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-base font-black" style={{ color: f.color }}>
                    {f.forecastVal}{f.unit}
                  </span>
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${f.improving ? "text-green-500" : "text-red-500"}`}>
                    {f.improving
                      ? <TrendingDown className="h-3 w-3" />
                      : <TrendingUp className="h-3 w-3" />}
                    {f.change > 0 ? "+" : ""}{f.change}{f.unit}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${accuracyColor(f.mape)}`}>
                  {accuracyLabel(f.mape)} accuracy
                </span>
                <span className="text-[9px] text-muted-foreground">
                  α={f.alpha} β={f.beta} φ={f.phi}
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={f.combined} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} interval={5} />
                  <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={v => `${v}${f.unit}`} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600 }}
                    formatter={(v: number, name: string) => {
                      if (name === "upper" || name === "lower") return null;
                      return [`${v}${f.unit}`, name === "actual" ? "Actual" : "Forecast"];
                    }} />
                  <Area type="monotone" dataKey="upper" stroke="none"
                    fill={f.color} fillOpacity={0.08} legendType="none" dot={false} activeDot={false} name="upper" />
                  <Area type="monotone" dataKey="lower" stroke="none"
                    fill="hsl(var(--card))" fillOpacity={1} legendType="none" dot={false} activeDot={false} name="lower" />
                  <Line type="monotone" dataKey="actual" stroke={f.color} strokeWidth={2}
                    dot={false} activeDot={{ r: 3 }} connectNulls={false} name="actual" />
                  <Line type="monotone" dataKey="forecast" stroke={f.color} strokeWidth={1.5}
                    strokeDasharray="5 3" dot={false} activeDot={{ r: 3 }} connectNulls name="forecast" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 rounded" style={{ backgroundColor: f.color }} />
                <span className="text-[10px] text-muted-foreground">Actual</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: f.color }} />
                <span className="text-[10px] text-muted-foreground">Forecast</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2.5 rounded-sm opacity-20" style={{ backgroundColor: f.color }} />
                <span className="text-[10px] text-muted-foreground">95% CI</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Methodology — collapsed by default */}
      <div className="border-t border-border bg-muted/10">
        <details className="group">
          <summary className="flex items-center justify-between px-5 py-3 cursor-pointer list-none select-none hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Methodology & Limitations</span>
            </div>
            <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>

          <div className="px-5 pb-5 pt-2 space-y-4">

            {/* Why Damped Holt's */}
            <div className="flex items-start gap-2">
              <BookOpen className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Why Damped Holt's Exponential Smoothing?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Malaysia's unemployment and participation data shows a clear, slowly-evolving trend with low noise — precisely the data characteristics where exponential smoothing outperforms ARIMA
                  (Hyndman & Athanasopoulos, 2021, <em>Forecasting: Principles and Practice</em>, 3rd ed.). Standard Holt's linear method was ruled out because it projects a constant trend indefinitely,
                  which empirical evidence shows leads to over-forecasting at longer horizons (Gardner & McKenzie, 1985, <em>Management Science</em>). The <strong>damped variant</strong> adds a
                  φ parameter that flattens the trend toward a stable level over time — producing more conservative and realistic projections. Validated as one of the top individual forecasting methods
                  in the M4 Competition (Makridakis et al., 2020, <em>International Journal of Forecasting</em>), which benchmarked 61 methods across 100,000 time series.
                </p>
              </div>
            </div>

            {/* COVID handling */}
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">How COVID-19 is handled</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  COVID-19 created a structural break in Malaysia's labour data (unemployment peaked at 5.3% in May 2020). No univariate model can fully account for a shock of this nature —
                  even the U.S. Bureau of Labor Statistics manually split their seasonal adjustment into pre- and post-pandemic runs
                  (Hudson, Mercurio & Kropf, 2022, <em>U.S. BLS Monthly Labor Review</em>). This forecast trains only on the{" "}
                  <strong>last 48 months of DOSM data</strong> (post-recovery window) to exclude peak pandemic distortion. Parameters α, β, and φ are auto-optimized per metric by minimizing
                  sum of squared errors on this window.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Source — own line */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/70">Source:</span>
              <a href="https://open.dosm.gov.my/data-catalogue/lfs_month" target="_blank" rel="noopener noreferrer"
                className="text-xs text-muted-foreground/70 underline hover:text-foreground transition-colors">
                DOSM Labour Force Survey — lfs_month
              </a>
            </div>

            {/* Disclaimer with ⓘ */}
            <div className="flex items-start gap-2">
              <div className="group/info relative flex-shrink-0 mt-0.5">
                <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[10px] font-bold select-none">i</div>
                <div className="absolute bottom-6 left-0 w-64 bg-card border border-border rounded-xl p-3 shadow-lg text-xs text-muted-foreground leading-relaxed opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                  This is a statistical projection only and does not represent an official forecast by DOSM or any government agency. Confidence intervals widen over time, reflecting genuine uncertainty growth in longer-horizon projections.
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Statistical projection only — not an official DOSM forecast. Confidence intervals widen over time reflecting increasing uncertainty.
              </p>
            </div>

          </div>
        </details>
      </div>
    </motion.div>
  );
};

export default ForecastSection;