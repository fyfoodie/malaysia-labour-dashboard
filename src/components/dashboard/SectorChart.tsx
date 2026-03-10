import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { sectorData2024, sectorData2023 } from "@/data/labourData";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

const SectorChart = () => {
  const [year, setYear] = useState(2024);
  const data = year === 2024 ? sectorData2024 : sectorData2023;

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
        <div className="flex gap-2">
          {[2023, 2024].map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                year === y ? "bg-foreground text-background shadow-md" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="k" />
            <YAxis type="category" dataKey="sector" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} width={130} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }}
              formatter={(value: number, name: string) => [`${value.toLocaleString()}k employed (${data.find(d => d.employed === value)?.percentage}%)`, "Employment"]}
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar dataKey="employed" radius={[0, 8, 8, 0]} barSize={28}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {data.slice(0, 3).map((sector, i) => (
          <div key={sector.sector} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
            <span><strong className="text-foreground">{sector.sector}</strong> — {sector.percentage}% of jobs</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SectorChart;
