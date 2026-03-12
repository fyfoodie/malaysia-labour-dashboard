import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { monthlyStats } from "@/data/labourData";

const TrendCharts = () => {
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const years = [...new Set(monthlyStats.map(d => d.year))];

  const filteredData = useMemo(() => {
    if (selectedYear === "all") return monthlyStats;
    return monthlyStats.filter(d => d.year === selectedYear);
  }, [selectedYear]);

  const chartData = filteredData.map(d => ({
    label: selectedYear === "all" ? `${d.month} ${d.year}` : d.month,
    "Employment Rate": d.employmentRate,
    "Unemployment Rate": d.unemploymentRate,
    "LFPR": d.participationRate,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Employment Trends Over Time</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track how the job market has changed month by month — is it getting better or worse?
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedYear("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedYear === "all" ? "bg-foreground text-background shadow-md" : "bg-card border border-border text-foreground hover:bg-muted"
            }`}
          >
            All Years
          </button>
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedYear === year ? "bg-foreground text-background shadow-md" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">Employment & Unemployment Rate</h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly figures (%)</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={selectedYear === "all" ? 5 : 0} angle={-30} textAnchor="end" height={50} />
                <YAxis domain={[90, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px", color: "hsl(var(--foreground))" }}
                  labelStyle={{ fontWeight: 600, color: "hsl(var(--foreground))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Line type="monotone" dataKey="Employment Rate" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Unemployment Rate" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">Labour Force Participation Rate</h3>
          <p className="text-xs text-muted-foreground mb-4">How many working-age people are in the labour market (%)</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={selectedYear === "all" ? 5 : 0} angle={-30} textAnchor="end" height={50} />
                <YAxis domain={[65, 75]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="LFPR" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} name="LFPR" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TrendCharts;
