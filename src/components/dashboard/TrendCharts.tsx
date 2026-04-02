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

type Tab = "unemployment" | "labourforce" | "participation" | "change";

const SOURCE_URL = "https://open.dosm.gov.my/data-catalogue/lfs_month";
const SOURCE_LABEL = "DOSM — Labour Force Survey (lfs_month)";

const SourceFooter = ({ note }: { note: string }) => {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
      <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground/60 underline hover:text-foreground transition-colors">{SOURCE_LABEL}</a>
      <div className="group relative flex items-center">
        <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[10px] font-bold select-none">i</div>
        <div className="absolute bottom-6 right-0 w-64 bg-card border border-border rounded-xl p-3 shadow-lg text-xs text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">{note}</div>
      </div>
    </div>
  );
};

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
        label:    new Date(d.date).toLocaleDateString("en-MY", { month: "short", year: "2-digit" }),
        lf:       +(d.lf / 1000).toFixed(2),
        employed: +(d.employed / 1000).toFixed(2),
        uRate:    d.u_rate ?? 0,
        pRate:    d.p_rate ?? 0,
        change:   prev ? +(d.employed - prev.employed).toFixed(1) : 0,
        changePct: prev && prev.employed
          ? +((d.employed - prev.employed) / prev.employed * 100).toFixed(2)
          : 0,
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
    { key: "labourforce",   label: "Labour Force"             },
    { key: "participation", label: t("trends.participation")  },
    { key: "change",        label: t("trends.jobChange")      },
  ];

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
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

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
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
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle}
                  formatter={(v: number) => [`${v}%`, "Unemployment Rate"]} />
                <ReferenceLine y={3.3} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5"
                  label={{ value: "Pre-COVID avg (3.3%)", fill: "hsl(var(--muted-foreground))", fontSize: 9, position: "insideTopRight" }} />
                <Area type="monotone" dataKey="uRate" name="Unemployment Rate"
                  stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#uGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>

            ) : activeTab === "labourforce" ? (
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
                <Area type="monotone" dataKey="lf"       name="Labour Force" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#lfGrad)"  dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="employed" name="Employed"      stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#empGrad)" dot={false} activeDot={{ r: 4 }} />
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
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle}
                  formatter={(v: number) => [`${v}%`, "Labour Force Participation Rate"]} />
                <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5"
                  label={{ value: "70% target", fill: "hsl(var(--muted-foreground))", fontSize: 9, position: "insideTopRight" }} />
                <Area type="monotone" dataKey="pRate" name="Participation Rate"
                  stroke="hsl(var(--chart-4))" strokeWidth={2.5} fill="url(#pGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>

            ) : (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={tickStyle} interval={xInterval} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={tickStyle} tickFormatter={v => `${v > 0 ? "+" : ""}${v}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={labelStyle}
                  formatter={(v: number, name: string) => {
                    if (name === "change") return [`${v > 0 ? "+" : ""}${v.toFixed(1)}k persons`, "MoM Change (absolute)"];
                    return [`${v > 0 ? "+" : ""}${v}%`, "MoM Change (%)"];
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
                <Bar dataKey="change" name="change" radius={[2, 2, 0, 0]} fill="hsl(var(--chart-1))" />
              </ComposedChart>
            )}

          </ResponsiveContainer>
        </div>

        {/* Per-tab source footer */}
        {activeTab === "unemployment" && (
  <SourceFooter note="% of people actively looking for work but can't find it. Lower is better. Calculated by DOSM as: unemployed persons ÷ total labour force × 100." />
)}
{activeTab === "labourforce" && (
  <SourceFooter note="Total people working or actively job-hunting (Labour Force), vs. those actually employed. The gap between the two lines = unemployed persons. Values shown in millions; raw DOSM figures divided by 1,000." />
)}
{activeTab === "participation" && (
  <SourceFooter note="% of working-age Malaysians who are either employed or actively looking for work. The 70% dashed line is Malaysia's national target. Calculated by DOSM as: labour force ÷ working-age population × 100." />
)}
{activeTab === "change" && (
  <SourceFooter note="How many jobs were added or lost compared to the previous month. Positive bars = more people employed. Calculated as: employed persons this month − employed persons last month." />
)}
      </div>
    </motion.div>
  );
};

export default TrendCharts;