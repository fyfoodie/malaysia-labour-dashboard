import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { TrendingUp, TrendingDown } from "lucide-react";

// ── MSIC 2008 sector definitions (per DOSM employment_sector dataset) ─────────
// Agriculture = MSIC Sections A (Agriculture, Forestry & Fishing) + B (Mining & Quarrying)
// Industry    = MSIC Sections C (Manufacturing) + D (Electricity, Gas, Steam) +
//               E (Water Supply, Sewerage, Waste) + F (Construction)
// Services    = MSIC Sections G–Q (Wholesale & Retail, Transport, Accommodation,
//               F&B, ICT, Finance & Insurance, Real Estate, Professional,
//               Administrative, Public Admin & Defence, Education,
//               Health & Social Work, Arts, Other Services)
const SECTOR_CONFIG = {
  services: {
    label:    "Services",
    color:    "hsl(var(--chart-1))",
    emoji:    "🏢",
    msic:     "MSIC Sections G–Q",
    desc:     "Wholesale & retail, transport, hospitality, ICT, finance, education, health & public services",
    shortDesc:"Sections G–Q",
  },
  industry: {
    label:    "Industry",
    color:    "hsl(var(--chart-2))",
    emoji:    "🏭",
    msic:     "MSIC Sections C–F",
    desc:     "Manufacturing, construction, electricity & utilities, water supply & waste management",
    shortDesc:"Sections C–F",
  },
  agriculture: {
    label:    "Agriculture",
    color:    "hsl(var(--chart-3))",
    emoji:    "🌾",
    msic:     "MSIC Sections A–B",
    desc:     "Farming, forestry & fishing (Section A) and mining & quarrying (Section B)",
    shortDesc:"Sections A–B",
  },
} as const;

type SectorKey = keyof typeof SECTOR_CONFIG;

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};
const tickStyle = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

type View = "snapshot" | "trend" | "shift";

const SectorChart = () => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();
  const [view, setView]               = useState<View>("snapshot");
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  // ── Filter to "both" sexes only, sort by date ascending ───────────────────
  const bothSex = useMemo(() =>
    (data?.sectors ?? [])
      .filter((d: any) => {
        const sex = (d.sex ?? "").toLowerCase();
        return sex === "both" || sex === "overall" || sex === "";
      })
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
  , [data]);

  // ── Pivot to { year, services, industry, agriculture } per year ───────────
  const byYear = useMemo(() => {
    const map: Record<number, any> = {};
    bothSex.forEach((d: any) => {
      const year   = new Date(d.date).getFullYear();
      const sector = (d.sector ?? "").toLowerCase().trim();
      if (!map[year]) map[year] = { year, date: d.date };
      if (sector === "agriculture") map[year].agriculture = +(d.proportion ?? 0);
      if (sector === "industry")    map[year].industry    = +(d.proportion ?? 0);
      if (sector === "services")    map[year].services    = +(d.proportion ?? 0);
    });
    return Object.values(map)
      .filter((d: any) => d.agriculture != null && d.industry != null && d.services != null)
      .sort((a: any, b: any) => a.year - b.year);
  }, [bothSex]);

  // ── Latest year & 10-year comparison ─────────────────────────────────────
  const latest       = byYear[byYear.length - 1];
  const latestYear   = latest?.year ?? "";
  const tenYrAgo     = byYear.find((d: any) => d.year === (latestYear as number) - 10) ?? byYear[0];
  const tenYrAgoYear = tenYrAgo?.year ?? "";

  const trendData = useMemo(() =>
    byYear.filter((d: any) => d.year >= 2000)
  , [byYear]);

  // ── Snapshot: sorted largest to smallest ─────────────────────────────────
  const snapshotData: { key: SectorKey; value: number }[] = useMemo(() => {
    if (!latest) return [];
    return (["services", "industry", "agriculture"] as SectorKey[])
      .map(key => ({ key, value: latest[key] ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [latest]);

  // ── Structural shift data ─────────────────────────────────────────────────
  const shiftData = useMemo(() => {
    if (!latest || !tenYrAgo) return [];
    return (["services", "industry", "agriculture"] as SectorKey[]).map(key => ({
      key,
      before: tenYrAgo[key]  ?? 0,
      after:  latest[key]    ?? 0,
      change: +((latest[key] ?? 0) - (tenYrAgo[key] ?? 0)).toFixed(1),
    }));
  }, [latest, tenYrAgo]);

  const servicesShift    = shiftData.find(d => d.key === "services");
  const agricultureShift = shiftData.find(d => d.key === "agriculture");

  if (loading || !bothSex.length) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-80 animate-pulse" />;
  }

  const views: { key: View; label: string }[] = [
    { key: "snapshot", label: `Snapshot`        },
    { key: "trend",    label: t("sectors.historicalTrend")    },
    { key: "shift",    label: t("sectors.structuralShift")    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t("sectors.title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("sectors.desc")}</p>
          </div>

          {/* Sector pills */}
          <div className="flex gap-2 flex-wrap">
            {snapshotData.map(({ key, value }) => {
              const cfg = SECTOR_CONFIG[key];
              return (
                <motion.div
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  onMouseEnter={() => setHoveredSector(key)}
                  onMouseLeave={() => setHoveredSector(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/30 cursor-default"
                >
                  <span>{cfg.emoji}</span>
                  <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
                  <span className="text-xs font-bold" style={{ color: cfg.color }}>{value}%</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Insight strip */}
        <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border flex flex-wrap gap-4 text-xs">
          {servicesShift && (
            <span className="text-muted-foreground">
              🏢 Services sector{" "}
              <strong className="text-foreground">
                {servicesShift.change >= 0
                  ? `grew +${servicesShift.change}pp`
                  : `fell ${Math.abs(servicesShift.change)}pp`}
              </strong>{" "}
              over the past decade
            </span>
          )}
          {agricultureShift && (
            <span className="text-muted-foreground">
              🌾 Agriculture & mining share{" "}
              <strong className="text-foreground">
                {agricultureShift.change <= 0
                  ? `declined ${Math.abs(agricultureShift.change)}pp`
                  : `grew +${agricultureShift.change}pp`}
              </strong>{" "}
              — Malaysia's structural transformation
            </span>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-border">
        {views.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-5 py-3 text-xs font-semibold transition-all border-b-2 ${
              view === v.key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Chart area ── */}
      <div className="p-5">
        <AnimatePresence mode="wait">

          {/* ── SNAPSHOT ── */}
          {view === "snapshot" && (
            <motion.div key="snapshot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Bar chart */}
                <div className="lg:col-span-3 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={snapshotData.map(d => ({ ...d, label: SECTOR_CONFIG[d.key].label }))}
                      layout="vertical" margin={{ left: 20, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={tickStyle} unit="%" domain={[0, 80]} />
                      <YAxis type="category" dataKey="label"
                        tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} width={100} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number, _: any, props: any) => {
                          const key = props?.payload?.key as SectorKey;
                          return [`${v}% of workforce`, SECTOR_CONFIG[key]?.label ?? ""];
                        }}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                        {snapshotData.map(({ key }) => (
                          <Cell
                            key={key}
                            fill={SECTOR_CONFIG[key].color}
                            opacity={hoveredSector && hoveredSector !== key ? 0.4 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detail cards */}
                <div className="lg:col-span-2 flex flex-col gap-3">
                  {snapshotData.map(({ key, value }) => {
                    const cfg   = SECTOR_CONFIG[key];
                    const shift = shiftData.find(d => d.key === key);
                    const isUp  = (shift?.change ?? 0) > 0;
                    const Icon  = isUp ? TrendingUp : TrendingDown;
                    return (
                      <div
                        key={key}
                        onMouseEnter={() => setHoveredSector(key)}
                        onMouseLeave={() => setHoveredSector(null)}
                        className={`rounded-xl border p-3 transition-all cursor-default ${
                          hoveredSector === key
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span>{cfg.emoji}</span>
                            <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                              {cfg.shortDesc}
                            </span>
                          </div>
                          {shift && (
                            <div className="flex items-center gap-1">
                              <Icon className="h-3 w-3" style={{ color: isUp ? "#22c55e" : "#ef4444" }} />
                              <span className="text-xs font-bold" style={{ color: isUp ? "#22c55e" : "#ef4444" }}>
                                {isUp ? "+" : ""}{shift.change}pp
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-2xl font-extrabold" style={{ color: cfg.color }}>{value}%</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cfg.desc}</p>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: cfg.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── HISTORICAL TREND ── */}
          {view === "trend" && (
            <motion.div key="trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted-foreground mb-3">
                Proportion of employed persons by sector, {trendData[0]?.year}–{latestYear}. Based on DOSM Labour Force Survey annual data.
              </p>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={tickStyle} />
                    <YAxis tick={tickStyle} unit="%" domain={[0, 75]} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number, name: string) => {
                        const key = name as SectorKey;
                        return [`${v}%`, SECTOR_CONFIG[key]?.label ?? name];
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend
                      formatter={(value) => {
                        const key = value as SectorKey;
                        return SECTOR_CONFIG[key]?.label ?? value;
                      }}
                      wrapperStyle={{ fontSize: 11, color: "hsl(var(--foreground))" }}
                    />
                    {(["services", "industry", "agriculture"] as SectorKey[]).map(key => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key}
                        stroke={SECTOR_CONFIG[key].color}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        opacity={hoveredSector && hoveredSector !== key ? 0.2 : 1}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* ── STRUCTURAL SHIFT ── */}
          {view === "shift" && (
            <motion.div key="shift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted-foreground mb-4">
                Comparing sector shares between{" "}
                <strong className="text-foreground">{tenYrAgoYear}</strong> and{" "}
                <strong className="text-foreground">{latestYear}</strong> — Malaysia's ongoing economic transformation.
              </p>
              <div className="space-y-4">
                {shiftData
                  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                  .map(({ key, before, after, change }) => {
                    const cfg      = SECTOR_CONFIG[key];
                    const isGrowth = change > 0;
                    return (
                      <div key={key} className="rounded-xl border border-border bg-muted/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{cfg.emoji}</span>
                            <div>
                              <span className="font-semibold text-foreground">{cfg.label}</span>
                              <span className="ml-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                {cfg.msic}
                              </span>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                            isGrowth ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          }`}>
                            {isGrowth
                              ? <TrendingUp className="h-3 w-3" />
                              : <TrendingDown className="h-3 w-3" />}
                            {isGrowth ? "+" : ""}{change}pp
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-10">{tenYrAgoYear}</span>
                            <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className="h-full rounded-full flex items-center justify-end pr-2"
                                style={{ backgroundColor: cfg.color, opacity: 0.5 }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(before / 75) * 100}%` }}
                                transition={{ duration: 0.8 }}
                              >
                                <span className="text-xs font-bold text-white">{before}%</span>
                              </motion.div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-10">{latestYear}</span>
                            <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className="h-full rounded-full flex items-center justify-end pr-2"
                                style={{ backgroundColor: cfg.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(after / 75) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                              >
                                <span className="text-xs font-bold text-white">{after}%</span>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                pp = percentage points. Values may not sum to 100% due to rounding (DOSM).
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

     {/* ── Source footer ── */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between flex-wrap gap-2 bg-muted/10">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground/70">
            {"Source: "}
          <a href="https://open.dosm.gov.my/data-catalogue/employment_sector" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">{"DOSM — Employment by MSIC Sector and Sex (employment_sector)"}</a>
          </span>
          <span className="text-xs text-muted-foreground/50">
            {"Sector classification follows MSIC 2008 Ver. 1.0 · Annual frequency · Latest data: "}{latestYear}
          </span>
        </div>
        <div className="group relative flex items-center">
          <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[10px] font-bold select-none">i</div>
          <div className="absolute bottom-6 right-0 w-72 bg-card border border-border rounded-xl p-3 shadow-lg text-xs text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 space-y-1">
            <p className="font-semibold text-foreground">MSIC 2008 Sector Groupings</p>
            <p><strong>{"Agriculture:"}</strong>{" Sections A (Agriculture, Forestry & Fishing) + B (Mining & Quarrying)"}</p>
            <p><strong>{"Industry:"}</strong>{" Sections C (Manufacturing) + D (Electricity & Gas) + E (Water & Waste) + F (Construction)"}</p>
            <p><strong>{"Services:"}</strong>{" Sections G–Q: wholesale & retail, transport, accommodation, ICT, finance, real estate, professional services, public admin, education, health."}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SectorChart;