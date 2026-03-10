import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { underemploymentBySex, underemploymentByAge } from "@/data/labourData";

const UnderemploymentCharts = () => {
  const sexData = underemploymentBySex.map(d => ({
    period: `${d.quarter} ${d.year}`,
    Male: d.male,
    Female: d.female,
  }));

  const latestAge = underemploymentByAge[underemploymentByAge.length - 1];
  const ageData = [
    { age: "15-24 (Youth)", rate: latestAge.age15_24 },
    { age: "25-34", rate: latestAge.age25_34 },
    { age: "35-44", rate: latestAge.age35_44 },
    { age: "45-54", rate: latestAge.age45_54 },
    { age: "55-64", rate: latestAge.age55_64 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground">Underemployment & Skills Mismatch</h2>
        <p className="text-sm text-muted-foreground mt-1">
          High underemployment may indicate a mismatch between people's skills and available job opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Sex */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">Underemployment by Gender</h3>
          <p className="text-xs text-muted-foreground mb-4">Quarterly comparison of male vs female underemployment rates (%)</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sexData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [`${value}%`]}
                />
                <Legend />
                <Bar dataKey="Male" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} barSize={16} />
                <Bar dataKey="Female" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Age */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">Underemployment by Age Group</h3>
          <p className="text-xs text-muted-foreground mb-4">Latest quarter — Youth face significantly higher underemployment</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="age" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [`${value}%`, "Underemployment Rate"]}
                />
                <Bar dataKey="rate" radius={[8, 8, 0, 0]} barSize={40}>
                  {ageData.map((entry, index) => (
                    <motion.rect key={index} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              💡 <strong className="text-foreground">Youth (15-24)</strong> face the highest underemployment at <strong className="text-foreground">{latestAge.age15_24}%</strong> — 
              nearly 3x the rate of workers aged 35-44. This suggests many young workers are in jobs below their qualifications.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UnderemploymentCharts;
