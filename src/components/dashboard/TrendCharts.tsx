import { useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { labourMarketData, labourMarketYears } from "@/data/labourMarketData";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "13px",
  color: "hsl(var(--foreground))",
};
const labelStyle = { fontWeight: 600, color: "hsl(var(--foreground))" };
const itemStyle = { color: "hsl(var(--foreground))" };
const tickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const legendStyle = { color: "hsl(var(--foreground))" };

const TrendCharts = () => {
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");

  const filteredData = useMemo(() => {
    if (selectedYear === "all") return labourMarketData;
    return labourMarketData.filter(d => d.year === selectedYear);
  }, [selectedYear]);

  const xInterval = selectedYear === "all" ? 11 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="space-y-6"
    >
      {/* Title + Year Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Employment Trends Over Time</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly labour market data from 2010 to 2026 — track long-term shifts in employment.
          </p>
        </div>
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl bg-card border border-border text-foreground text-sm font-medium cursor-pointer hover:bg-muted transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Years</option>
            {labourMarketYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Chart 1: Labour Force & Employed (millions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">Labour Force & Employed</h3>
          <p className="text-xs text-muted-foreground mb-4">In millions — how big is the workforce?</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} tickFormatter={v => `${v}M`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(v: number) => [`${v.toFixed(3)}M`]} />
                <Legend wrapperStyle={legendStyle} />
                <Line type="monotone" dataKey="lfMillion" name="Labour Force" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="employedMillion" name="Employed" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Unemployment Rate */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">Unemployment Rate Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly unemployment rate (%)</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} domain={["auto", "auto"]} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(v: number) => [`${v}%`]} />
                <ReferenceLine y={3.3} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Pre-COVID avg", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Line type="monotone" dataKey="uRate" name="Unemployment Rate" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Monthly Employment Change (bar) + Chart 4: LFPR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">Monthly Employment Change</h3>
          <p className="text-xs text-muted-foreground mb-4">Month-over-month change in employed persons (thousands)</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(1)}k`]} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Bar
                  dataKey="employmentChange"
                  name="Employment Change"
                  fill="hsl(var(--chart-1))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">Labour Force Participation Rate</h3>
          <p className="text-xs text-muted-foreground mb-4">How many working-age people are in the labour market (%)</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} domain={["auto", "auto"]} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(v: number) => [`${v}%`]} />
                <Line type="monotone" dataKey="pRate" name="LFPR" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 5: Employment Growth % */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-1">Employment Growth Rate</h3>
        <p className="text-xs text-muted-foreground mb-4">Month-over-month employment growth percentage (%)</p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={tickStyle} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(2)}%`]} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="employmentGrowthPercent" name="Growth %" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default TrendCharts;
