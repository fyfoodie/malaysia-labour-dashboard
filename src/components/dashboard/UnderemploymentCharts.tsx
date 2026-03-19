import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { Users, GraduationCap, TrendingDown, AlertTriangle } from "lucide-react";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};
const tickStyle = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

type Tab = "gender" | "age" | "trend";

const UnderemploymentCharts = () => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("gender");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");

  const sexRows = useMemo(() => {
    const rows = (data?.mismatch ?? [])
      .filter((d: any) => d.variable === "rate_pct" || d.variable?.includes("rate"))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    if (!rows.length) {
      const persons = (data?.mismatch ?? [])
        .filter((d: any) => d.variable === "persons")
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      const lf = data?.national?.[data.national.length - 1]?.lf ?? 1;
      return persons.map((d: any) => ({
        ...d,
        rate: d.sex === "overall" || d.sex === "both"
          ? +((d.sru / lf) * 100).toFixed(2)
          : d.sru,
      }));
    }
    return rows;
  }, [data]);

  const years = useMemo(() =>
    [...new Set(sexRows.map((d: any) => new Date(d.date).getFullYear()))] as number[]
  , [sexRows]);

  const filteredSex = useMemo(() =>
    yearFilter === "all" ? sexRows : sexRows.filter((d: any) => new Date(d.date).getFullYear() === yearFilter)
  , [sexRows, yearFilter]);

  const genderData = useMemo(() => {
    const grouped: Record<string, any> = {};
    filteredSex.forEach((d: any) => {
      const date = new Date(d.date);
      const m    = date.getMonth() + 1;
      const q    = m <= 3 ? "Q1" : m <= 6 ? "Q2" : m <= 9 ? "Q3" : "Q4";
      const key  = `${q} ${date.getFullYear()}`;
      const sex  = d.sex?.toLowerCase();
      const val  = d.sru ?? d.rate ?? 0;
      if (!grouped[key]) grouped[key] = { period: key };
      if (sex === "male")                      grouped[key].Male    = val;
      if (sex === "female")                    grouped[key].Female  = val;
      if (sex === "overall" || sex === "both") grouped[key].Overall = val;
    });
    return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period));
  }, [filteredSex]);

  const ageRows = useMemo(() =>
    (data?.underemployment ?? [])
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
  , [data]);

  const latestAgeDate = ageRows[ageRows.length - 1]?.date;
  const latestAgeRows = ageRows.filter((d: any) => d.date === latestAgeDate);

  const getAge = (group: string) => {
    const row = latestAgeRows.find((d: any) =>
      d.age?.toLowerCase().includes(group) && d.variable === "rate"
    );
    return row?.sru ?? 0;
  };

  const ageData = [
    { age: "15-24", label: t("under.youth"),       rate: getAge("15-24"), color: "#ef4444" },
    { age: "25-34", label: t("under.youngAdult"),   rate: getAge("25-34"), color: "#f97316" },
    { age: "35-44", label: t("under.midCareer"),    rate: getAge("35-44"), color: "#eab308" },
    { age: "45+",   label: t("under.senior"),       rate: getAge("45+"),   color: "#22c55e" },
  ];

  const latestQ = latestAgeDate ? (() => {
    const m = new Date(latestAgeDate).getMonth() + 1;
    return `${m <= 3 ? "Q1" : m <= 6 ? "Q2" : m <= 9 ? "Q3" : "Q4"} ${new Date(latestAgeDate).getFullYear()}`;
  })() : "";

  const trendData = useMemo(() => {
    const overall = sexRows.filter((d: any) => d.sex === "overall" || d.sex === "both");
    return overall.map((d: any) => {
      const date = new Date(d.date);
      const m    = date.getMonth() + 1;
      const q    = m <= 3 ? "Q1" : m <= 6 ? "Q2" : m <= 9 ? "Q3" : "Q4";
      return {
        period: `${q} ${date.getFullYear()}`,
        rate:   d.sru ?? d.rate ?? 0,
      };
    });
  }, [sexRows]);

  const latestOverall = trendData[trendData.length - 1]?.rate ?? 0;
  const prevOverall   = trendData[trendData.length - 2]?.rate ?? 0;
  const change        = +(latestOverall - prevOverall).toFixed(1);
  const peakRate      = trendData.reduce((m, d) => d.rate > m ? d.rate : m, 0);
  const youthRate     = ageData[0].rate;
  const maxAgeRate    = Math.max(...ageData.map(d => d.rate));

  if (loading || !data?.mismatch?.length) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-80 animate-pulse" />;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "gender", label: "By Gender" },
    { key: "age",    label: "By Age"    },
    { key: "trend",  label: "Over Time" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Skills Mismatch & Underemployment</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tertiary-educated workers in jobs below their qualification level — a key signal of labour market inefficiency
            </p>
          </div>
          {tab === "gender" && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setYearFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${yearFilter === "all" ? "bg-foreground text-background" : "bg-muted border border-border text-foreground hover:bg-muted/80"}`}>
                All
              </button>
              {years.slice(-6).map(y => (
                <button key={y} onClick={() => setYearFilter(y)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${yearFilter === y ? "bg-foreground text-background" : "bg-muted border border-border text-foreground hover:bg-muted/80"}`}>
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            {
              icon: GraduationCap,
              label: "Current Rate",
              value: latestOverall ? `${latestOverall}%` : "N/A",
              sub: change !== 0 ? `${change > 0 ? "+" : ""}${change}% vs prev quarter` : "No change",
              color: change > 0 ? "text-red-500" : "text-green-500",
              bg: change > 0 ? "bg-red-500/10" : "bg-green-500/10",
            },
            {
              icon: AlertTriangle,
              label: "Peak Rate",
              value: `${peakRate}%`,
              sub: "Highest recorded",
              color: "text-orange-500",
              bg: "bg-orange-500/10",
            },
            {
              icon: Users,
              label: "Youth vs Senior",
              value: `${youthRate}% vs ${ageData[3].rate}%`,
              sub: "15-24 vs 45+",
              color: "text-purple-500",
              bg: "bg-purple-500/10",
            },
            {
              icon: TrendingDown,
              label: "Most Affected",
              value: ageData.find(d => d.rate === maxAgeRate)?.label ?? "-",
              sub: `At ${maxAgeRate}% rate`,
              color: "text-red-500",
              bg: "bg-red-500/10",
            },
          ].map(s => (
            <div key={s.label} className={`rounded-xl ${s.bg} p-3 flex items-center gap-2`}>
              <s.icon className={`h-4 w-4 ${s.color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-sm font-bold ${s.color} truncate`}>{s.value}</p>
                <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-xs font-semibold transition-all border-b-2 ${
              tab === t.key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {tab === "gender" && (
            <motion.div key="gender" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted-foreground mb-3">
                Quarterly skills mismatch rate by gender — are women or men more affected?
              </p>
              {genderData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genderData} margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" tick={{ ...tickStyle, fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                      <YAxis tick={tickStyle} unit="%" />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600 }}
                        formatter={(v: number) => [`${v.toLocaleString()}`, ""]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Male"   name="Male"   fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar dataKey="Female" name="Female" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No rate data available
                </div>
              )}
            </motion.div>
          )}

          {tab === "age" && (
            <motion.div key="age" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted-foreground mb-3">
                Latest quarter ({latestQ}) — which age group faces the most skills mismatch?
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData} margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="age" tick={tickStyle} />
                      <YAxis tick={tickStyle} unit="%" />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600 }}
                        formatter={(v: number) => [`${v}%`, "Mismatch Rate"]} />
                      <Bar dataKey="rate" radius={[8, 8, 0, 0]} barSize={45}>
                        {ageData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3">
                  {ageData.map((d, i) => (
                    <motion.div key={d.age}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${d.color}20` }}>
                        <span className="text-xs font-bold" style={{ color: d.color }}>{d.age}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">{d.label}</span>
                          <span className="text-xs font-bold" style={{ color: d.color }}>{d.rate}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: d.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${maxAgeRate > 0 ? (d.rate / maxAgeRate) * 100 : 0}%` }}
                            transition={{ duration: 0.7, delay: i * 0.1 }} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {youthRate > 0 && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mt-1">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong className="text-foreground">Youth (15-24)</strong> are{" "}
                        <strong className="text-red-500">
                          {ageData[3].rate > 0 ? `${(youthRate / ageData[3].rate).toFixed(1)}x` : "significantly"}
                        </strong>{" "}
                        more likely to be underemployed than workers aged 45+
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {tab === "trend" && (
            <motion.div key="trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted-foreground mb-3">
                Overall skills mismatch rate trend — is Malaysia's graduate underemployment improving?
              </p>
              {trendData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="mismatchGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" tick={{ ...tickStyle, fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                      <YAxis tick={tickStyle} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 600 }}
                        formatter={(v: number) => [v.toLocaleString(), "Skills Mismatch"]} />
                      <Area type="monotone" dataKey="rate" name="Mismatch Rate"
                        stroke="hsl(var(--chart-2))" strokeWidth={2.5}
                        fill="url(#mismatchGrad)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Trend data not available
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
          Source:{" "}
          <a href="https://open.dosm.gov.my/data-catalogue/lfs_qtr_sru_sex" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            DOSM Skills-Related Underemployment by Sex
          </a>
          {" · "}
          <a href="https://open.dosm.gov.my/data-catalogue/lfs_qtr_sru_age" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            DOSM Skills-Related Underemployment by Age
          </a>
        </p>
      </div>
    </motion.div>
  );
};

export default UnderemploymentCharts;
