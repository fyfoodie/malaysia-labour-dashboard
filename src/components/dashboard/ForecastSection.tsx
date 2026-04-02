import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, Activity, Info } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";

// ── Holt's Double Exponential Smoothing last ──────────────────────────────────────
function holtSmooth(data: number[], alpha: number, beta: number) {
  if (data.length < 2) return { smoothed: data, level: data[0] ?? 0, trend: 0 };
  let level = data[0];
  let trend = data[1] - data[0];
  const smoothed = [level];
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta  * (level - prevLevel) + (1 - beta) * trend;
    smoothed.push(level);
  }
  return { smoothed, level, trend };
}

function optimizeHolt(data: number[]) {
  let bestAlpha = 0.3, bestBeta = 0.1, bestSSE = Infinity;
  for (let a = 0.05; a <= 0.95; a = +(a + 0.05).toFixed(2)) {
    for (let b = 0.05; b <= 0.95; b = +(b + 0.05).toFixed(2)) {
      const { smoothed } = holtSmooth(data, a, b);
      const sse = smoothed.reduce((sum, s, i) => sum + Math.pow(s - data[i], 2), 0);
      if (sse < bestSSE) { bestSSE = sse; bestAlpha = a; bestBeta = b; }
    }
  }
  return { alpha: bestAlpha, beta: bestBeta };
}

function forecastHolt(data: number[], h: number) {
  const { alpha, beta } = optimizeHolt(data);
  const { smoothed, level, trend } = holtSmooth(data, alpha, beta);
  const residuals  = data.map((d, i) => d - smoothed[i]);
  const stdResid   = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);
  const mape       = data.reduce((s, d, i) => d === 0 ? s : s + Math.abs((d - smoothed[i]) / d), 0) / data.length * 100;
  const forecasts  = Array.from({ length: h }, (_, i) => {
    const point = level + (i + 1) * trend;
    return {
      value: +point.toFixed(2),
      upper: +(point + 1.96 * stdResid * Math.sqrt(i + 1)).toFixed(2),
      lower: +(point - 1.96 * stdResid * Math.sqrt(i + 1)).toFixed(2),
    };
  });
  return { forecasts, mape: +mape.toFixed(1), alpha: +alpha.toFixed(2), beta: +beta.toFixed(2) };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const HORIZON = 12;
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "11px",
  color: "hsl(var(--foreground))",
};

const accuracyLabel = (mape: number) =>
  mape < 5 ? "High accuracy" : mape < 10 ? "Medium accuracy" : "Low accuracy";
const accuracyColor = (mape: number) =>
  mape < 5 ? "text-green-500 bg-green-500/10" : mape < 10 ? "text-yellow-500 bg-yellow-500/10" : "text-red-500 bg-red-500/10";

function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d.toLocaleDateString("en-MY", { month: "short", year: "2-digit" });
}

// ── Component ────────────────────────────────────────────────────────────────
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
        invert: true, // lower is better
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
      const { forecasts: pts, mape, alpha, beta } = forecastHolt(m.values, HORIZON);

      // Build chart: last 18 actual + 12 forecast
      const historical = recent.slice(-18).map((d: any, i: number) => ({
        label:    new Date(d.date).toLocaleDateString("en-MY", { month: "short", year: "2-digit" }),
        actual:   m.values[recent.length - 18 + i],
        forecast: null as number | null,
        upper:    null as number | null,
        lower:    null as number | null,
      }));

      // Stitch last actual into forecast start
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
      const change      = +(forecastVal - currentVal).toFixed(2);
      const improving   = m.invert ? change < 0 : change > 0;
      const targetDate  = addMonths(lastDate, HORIZON);

      return { ...m, combined, mape, alpha, beta, currentVal, forecastVal, change, improving, targetDate };
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
            <p className="text-xs text-muted-foreground">
              Statistical projection using Holt's Double Exponential Smoothing
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 self-start">
            <Activity className="h-3 w-3 text-primary" />
            <span className="text-xs font-semibold text-primary">AI-Assisted Projection</span>
          </div>
        </div>

        {/* Auto-generated bold headline */}
        <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border">
         <p className="text-sm font-semibold text-foreground leading-relaxed">
           {forecasts.map((f, i) => (
             <span key={f.key}>
              <span className="text-foreground">{f.label}</span>
              {" projected to reach "}
              <strong>{f.forecastVal}{f.unit}</strong>
              {" by "}<strong>{f.targetDate}</strong>
              {i < forecasts.length - 1 ? " · " : ""}
             </span>
            ))}
          </p>
        </div>
      </div>

      {/* 3 charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {forecasts.map((f, idx) => (
          <div key={f.key} className="p-4">
            {/* Mini header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-foreground">{f.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-lg font-black" style={{ color: f.color }}>
                    {f.forecastVal}{f.unit}
                  </span>
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${f.improving ? "text-green-500" : "text-red-500"}`}>
                    {f.improving ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {f.change > 0 ? "+" : ""}{f.change}{f.unit}
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${accuracyColor(f.mape)}`}>
                {accuracyLabel(f.mape)}
              </span>
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

                  {/* Confidence band */}
                  <Area type="monotone" dataKey="upper" stroke="none"
                    fill={f.color} fillOpacity={0.08} legendType="none" dot={false} activeDot={false} name="upper" />
                  <Area type="monotone" dataKey="lower" stroke="none"
                    fill="hsl(var(--card))" fillOpacity={1} legendType="none" dot={false} activeDot={false} name="lower" />

                  {/* Actual line */}
                  <Line type="monotone" dataKey="actual" stroke={f.color} strokeWidth={2}
                    dot={false} activeDot={{ r: 3 }} connectNulls={false} name="actual" />

                  {/* Forecast dashed */}
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

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border flex items-start gap-2 bg-muted/20">
        <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Statistical projection only, not an official DOSM forecast. Confidence intervals widen over time reflecting increasing uncertainty.
          Model parameters auto-optimized per metric to minimize historical error.
        </p>
      </div>
    </motion.div>
  );
};

export default ForecastSection;
