import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { inDemandOccupations } from "@/data/labourData";
import { useLanguage } from "@/context/LanguageContext";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "hsl(36, 70%, 45%)", "hsl(15, 60%, 50%)", "hsl(50, 60%, 45%)", "hsl(27, 80%, 40%)",
];

const InDemandChart = () => {
  const { t } = useLanguage();
  const total = inDemandOccupations.reduce((sum, o) => sum + o.salary, 0);
  const pieData = inDemandOccupations.map(o => ({
    name: o.occupation,
    value: o.salary,
    percentage: ((o.salary / total) * 100).toFixed(1),
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border p-5 md:p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">{t("indemand.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("indemand.desc")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={130} innerRadius={60} dataKey="value" paddingAngle={2}
                label={({ name, percentage, x, y }) => (
                  <text x={x} y={y} fill="hsl(var(--foreground))" fontSize={11} textAnchor="middle">{`${name} (${percentage}%)`}</text>
                )}
                labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}>
                {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px", color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [`RM ${value.toLocaleString()} / year`, name]}
                labelStyle={{ fontWeight: 600, color: "hsl(var(--foreground))" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-semibold text-foreground">{t("indemand.occupation")}</th>
                <th className="text-right p-3 font-semibold text-foreground">{t("indemand.avgSalary")}</th>
              </tr>
            </thead>
            <tbody>
              {inDemandOccupations.map((occ, i) => (
                <tr key={occ.occupation} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      {occ.occupation}
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium text-foreground">RM {occ.salary.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {t("common.source")}: <a href="https://www.y-axis.com/job-outlook/malaysia/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Y-Axis Job Outlook Malaysia</a>
      </p>
    </motion.div>
  );
};

export default InDemandChart;
