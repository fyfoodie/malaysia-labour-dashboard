import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { motion } from "framer-motion";
import { sectorData } from "@/data/labourData";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

const SectorChart = () => {
  const [selectedYear, setSelectedYear] = useState(2022);
  const years = sectorData.map(d => d.year);

  const currentData = sectorData.find(d => d.year === selectedYear);
  const barData = currentData ? [
    { sector: "Services", proportion: currentData.services },
    { sector: "Industry", proportion: currentData.industry },
    { sector: "Agriculture", proportion: currentData.agriculture },
  ] : [];

  // Trend data for line view
  const trendData = sectorData.filter(d => d.year >= 2010).map(d => ({
    year: d.year.toString(),
    Services: d.services,
    Industry: d.industry,
    Agriculture: d.agriculture,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border p-5 md:p-6 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Employment by Sector</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Discover which industries offer the most job opportunities in Malaysia.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[2018, 2019, 2020, 2021, 2022].map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedYear === y ? "bg-foreground text-background shadow-md" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart for selected year */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Sector Distribution — {selectedYear}</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <YAxis type="category" dataKey="sector" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px", color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value}%`, "Proportion"]}
                  labelStyle={{ fontWeight: 600, color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="proportion" radius={[0, 8, 8, 0]} barSize={28}>
                  {barData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend over time */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Sector Trends (2010–2022)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px", color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value}%`]}
                  labelStyle={{ fontWeight: 600, color: "hsl(var(--foreground))" }}
                />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                <Bar dataKey="Services" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Industry" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Agriculture" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {barData.map((sector, i) => (
          <div key={sector.sector} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
            <span><strong className="text-foreground">{sector.sector}</strong> — {sector.proportion}% of jobs</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SectorChart;
