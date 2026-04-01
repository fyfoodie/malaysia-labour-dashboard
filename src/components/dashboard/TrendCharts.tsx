import { useState, useMemo, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart,
} from "recharts";
import { motion } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};
const labelStyle = { fontWeight: 600, color: "hsl(var(--foreground))" };
const tickStyle  = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

type Tab = "workforce" | "unemployment" | "participation" | "change";

const TrendCharts = () => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [activeTab, setActiveTab] = useState<Tab>("unemployment");
  const cardRef = useRef<HTMLDivElement>(null);

  const national = useMemo(() =>
    data?.national ? [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date)) : []
  , [data]);

  const years = useMemo(() =>
    [...new Set(national.map((d: any) => new Date(d.date).getFullYear()))]
  , [national]);

  const filtered = useMemo(() =>
    selectedYear === "all" ? national : national.filter((d: any) => new Date(d.date).getFullYear() === selectedYear)
  , [selectedYear, national]);

  const chartData = useMemo(() =>
    filtered.map((d: any, i: number) => {
      const prev = i > 0 ? filtered[i - 1] : null;
      return {
        label: new Date(d.date).toLocaleDateString("en-MY", { month: "short", year: "2-digit" }),
        lf:       +(d.lf / 1000).toFixed(2),
        employed: +(d.employed / 1000).toFixed(2),
        uRate:    d.u_rate ?? 0,
        pRate:    d.p_rate ?? 0,
        change:   prev ? +(d.employed - prev.employed).toFixed(1) : 0,
      };
    })
  , [filtered]);

  const latest = chartData[chartData.length - 1];
  const first  = chartData[0];

  const handleExport = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = `employment-trends-${activeTab}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading || !data?.national?.length) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-80 animate-pulse" />;
  }

  const xInterval = selectedYear === "all" ? 11 : 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: "unemployment",  label: t("trends.unemployment")  },
    { key: "workforce",     label: t("trends.workforce")      },
    { key: "participation", label: t("trends.participation")  },
    { key: "change",        label: t("trends.jobChange")     },
  ];

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t("trends.title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("trends.monthly")} {first?.label} {t("insight.to")} {latest?.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="appearance-none px-3 py-2 pr-8 rounded-xl bg-muted border border-border text-foreground text-xs font-medium cursor-pointer hover:bg-muted/80 transition-all focus:outline-none w-fit"
            >
              <option value="all">{t("trends.allYears")}</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={handleExport}
              title={t("common.export")}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.key ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === "unemployment" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="uGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number) => [`${v}%`, t("trends.unemploymentRate")]} />
                <ReferenceLine y={3.3} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5"
                  label={{ value: t("trends.preCovid"), fill: "hsl(var(--muted-foreground))", fontSize: 9, position: "insideTopRight" }} />
                <Area type="monotone" dataKey="uRate" name={t("trends.unemploymentRate")}
                  stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#uGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            ) : activeTab === "workforce" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="lfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="empGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--chart-3))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} tickFormatter={v => `${v}M`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number) => [`${v}M`]} />
                <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="lf"       name={t("trends.labourForce")} stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#lfGrad)"  dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="employed" name={t("trends.employed")}     stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#empGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            ) : activeTab === "participation" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--chart-4))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} tickFormatter={v => `${v}%`} domain={["auto", "auto"]} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number) => [`${v}%`, t("trends.participationRate")]} />
                <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5"
                  label={{ value: t("trends.70target"), fill: "hsl(var(--muted-foreground))", fontSize: 9, position: "insideTopRight" }} />
                <Area type="monotone" dataKey="pRate" name={t("trends.participationRate")}
                  stroke="hsl(var(--chart-4))" strokeWidth={2.5} fill="url(#pGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            ) : (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} tickFormatter={v => `${v > 0 ? "+" : ""}${v}k`} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle}
                  formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(1)}k`, t("trends.jobChange")]} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
                <Bar dataKey="change" name={t("trends.jobChange")} radius={[2, 2, 0, 0]} fill="hsl(var(--chart-1))" />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {activeTab === "unemployment"  && t("trends.note.unemployment")}
          {activeTab === "workforce"     && t("trends.note.workforce")}
          {activeTab === "participation" && t("trends.note.participation")}
          {activeTab === "change"        && t("trends.note.change")}
        </p>
      </div>
    </motion.div>
  );
};

export default TrendCharts;
