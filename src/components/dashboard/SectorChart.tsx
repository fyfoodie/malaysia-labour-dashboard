import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { TrendingUp, TrendingDown } from "lucide-react";

const SECTOR_CONFIG = {
  Services:    { color: "hsl(var(--chart-1))", emoji: "🏢", desc: "Finance, retail, hospitality, ICT" },
  Industry:    { color: "hsl(var(--chart-2))", emoji: "🏭", desc: "Manufacturing, construction, mining" },
  Agriculture: { color: "hsl(var(--chart-3))", emoji: "🌾", desc: "Farming, fishing, forestry" },
};

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
  const [view, setView] = useState<View>("snapshot");
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  const bothSex = useMemo(() =>
    (data?.sectors ?? [])
      .filter((d: any) => d.sex === "both" || d.sex === "overall" || !d.sex)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
  , [data]);

  const byYear = useMemo(() => {
    const map: Record<number, any> = {};
    bothSex.forEach((d: any) => {
      const year = new Date(d.date).getFullYear();
      if (!map[year]) map[year] = { year, date: d.date };
      const sector = d.sector?.toLowerCase();
      if (sector === "agriculture") map[year].Agriculture = d.proportion ?? 0;
      if (sector === "industry")    map[year].Industry    = d.proportion ?? 0;
      if (sector === "services")    map[year].Services    = d.proportion ?? 0;
    });
    return Object.values(map).sort((a: any, b: any) => a.year - b.year);
  }, [bothSex]);

  const trendData = useMemo(() =>
    byYear.filter((d: any) => d.year >= 2005)
  , [byYear]);

  const latest      = byYear[byYear.length - 1];
  const latestYear  = latest?.year ?? 2022;
  const tenYrAgo    = byYear.find((d: any) => d.year === latestYear - 10) ?? byYear[0];
  const tenYrAgoYear = tenYrAgo?.year ?? latestYear - 10;

  const snapshotData = latest ? [
    { sector: "Services",    value: latest.Services    ?? 0 },
    { sector: "Industry",    value: latest.Industry    ?? 0 },
    { sector: "Agriculture", value: latest.Agriculture ?? 0 },
  ] : [];

  const shiftData = latest && tenYrAgo ? [
    { sector: "Services",    before: tenYrAgo.Services    ?? 0, after: latest.Services    ?? 0, change: +((latest.Services    ?? 0) - (tenYrAgo.Services    ?? 0)).toFixed(1) },
    { sector: "Industry",    before: tenYrAgo.Industry    ?? 0, after: latest.Industry    ?? 0, change: +((latest.Industry    ?? 0) - (tenYrAgo.Industry    ?? 0)).toFixed(1) },
    { sector: "Agriculture", before: tenYrAgo.Agriculture ?? 0, after: latest.Agriculture ?? 0, change: +((latest.Agriculture ?? 0) - (tenYrAgo.Agriculture ?? 0)).toFixed(1) },
  ] : [];

  const servicesGrowth = shiftData.find(d => d.sector === "Services")?.change ?? 0;
  const agriDecline    = shiftData.find(d => d.sector === "Agriculture")?.change ?? 0;

  if (loading || !bothSex.length) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-80 animate-pulse" />;
  }

  const views: { key: View; label: string }[] = [
    { key: "snapshot", label: `${latestYear} Snapshot` },
    { key: "trend",    label: "Historical Trend"       },
    { key: "shift",    label: "Structural Shift"       },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Employment by Sector</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              How Malaysia's workforce is distributed across the three main economic sectors
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {snapshotData.map(s => (
              <motion.div
                key={s.sector}
                whileHover={{ scale: 1.05 }}
                onMouseEnter={() => setHoveredSector(s.sector)}
                onMouseLeave={() => setHoveredSector(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/30 cursor-default"
              >
                <span>{SECTOR_CONFIG[s.sector as keyof typeof SECTOR_CONFIG].emoji}</span>
                <span className="text-xs font-semibold text-foreground">{s.sector}</span>
                <span className="text-xs font-bold" style={{ color: SECTOR_CONFIG[s.sector as keyof typeof SECTOR_CONFIG].color }}>
                  {s.value}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-muted/40 border border-border flex flex-wrap gap-4 text-xs">
          <span className="text-muted-foreground">
            💡 Services sector{" "}
            <strong className="text-foreground">
              {servicesGrowth >= 0 ? `grew +${servicesGrowth}pp` : `fell ${servicesGrowth}pp`}
            </strong>{" "}
            over the past decade
          </span>
          <span className="text-muted-foreground">
            🌾 Agriculture share{" "}
            <strong className="text-foreground">
              {agriDecline <= 0 ? `declined ${Math.abs(agriDecline)}pp` : `grew +${agriDecline}pp`}
            </strong>{" "}
            — Malaysia's ongoing structural transformation
          </span>
        </div>
      </div>

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

      <div className="p-5">
        <AnimatePresence mode="wait">
          {view === "snapshot" && (
            <motion.div key="snapshot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={snapshotData} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={tickStyle} unit="%" domain={[0, 80]} />
                      <YAxis type="category" dataKey="sector" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} width={100} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}% of workforce`, "Share"]} labelStyle={{ fontWeight: 600 }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                        {snapshotData.map((entry, i) => (
                          <Cell key={i}
                            fill={SECTOR_CONFIG[entry.sector as keyof typeof SECTOR_CONFIG].color}
                            opacity={hoveredSector && hoveredSector !== entry.sector ? 0.4 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="lg:col-span-2 flex flex-col gap-3">
                  {snapshotData.map(s => {
                    const cfg = SECTOR_CONFIG[s.sector as keyof typeof SECTOR_CONFIG];
                    const shift = shiftData.find(d => d.sector === s.sector);
                    const isUp = (shift?.change ?? 0) > 0;
                    const Icon = isUp ? TrendingUp : TrendingDown;
                    return (
                      <div key={s.sector}
                        onMouseEnter={() => setHoveredSector(s.sector)}
                        onMouseLeave={() => setHoveredSector(null)}
                        className={`rounded-xl border p-3 transition-all cursor-default ${
                          hoveredSector === s.sector ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span>{cfg.emoji}</span>
                            <span className="text-sm font-semibold text-foreground">{s.sector}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Icon className="h-3 w-3" style={{ color: isUp ? "#22c55e" : "#ef4444" }} />
                            <span className="text-xs font-bold" style={{ color: isUp ? "#22c55e" : "#ef4444" }}>
                              {isUp ? "+" : ""}{shift?.change ?? 0}pp
                            </span>
                          </div>
                        </div>
                        <p className="text-2xl font-extrabold" style={{ color: cfg.color }}>{s.value}%</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</p>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: cfg.color }}
                            initial={{ width: 0 }} animate={{ width: `${s.value}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {view === "trend" && (
            <motion.div key="trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted-foreground mb-3">
                How each sector's share of total employment has evolved since 2005
              </p>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={tickStyle} />
                    <YAxis tick={tickStyle} unit="%" domain={[0, 75]} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`]} labelStyle={{ fontWeight: 600 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--foreground))" }} />
                    {Object.entries(SECTOR_CONFIG).map(([sector, cfg]) => (
                      <Line key={sector} type="monotone" dataKey={sector}
                        stroke={cfg.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }}
                        opacity={hoveredSector && hoveredSector !== sector ? 0.2 : 1} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {view === "shift" && (
            <motion.div key="shift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-xs text-muted-foreground mb-4">
                Structural change from <strong>{tenYrAgoYear}</strong> to <strong>{latestYear}</strong> — Malaysia's economic transformation
              </p>
              <div className="space-y-4">
                {shiftData.map(s => {
                  const cfg = SECTOR_CONFIG[s.sector as keyof typeof SECTOR_CONFIG];
                  const isGrowth = s.change > 0;
                  return (
                    <div key={s.sector} className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cfg.emoji}</span>
                          <span className="font-semibold text-foreground">{s.sector}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                          isGrowth ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        }`}>
                          {isGrowth ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isGrowth ? "+" : ""}{s.change}pp
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-10">{tenYrAgoYear}</span>
                          <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                            <motion.div className="h-full rounded-full flex items-center justify-end pr-2"
                              style={{ backgroundColor: cfg.color, opacity: 0.5 }}
                              initial={{ width: 0 }} animate={{ width: `${(s.before / 75) * 100}%` }}
                              transition={{ duration: 0.8 }}>
                              <span className="text-xs font-bold text-white">{s.before}%</span>
                            </motion.div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-10">{latestYear}</span>
                          <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                            <motion.div className="h-full rounded-full flex items-center justify-end pr-2"
                              style={{ backgroundColor: cfg.color }}
                              initial={{ width: 0 }} animate={{ width: `${(s.after / 75) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}>
                              <span className="text-xs font-bold text-white">{s.after}%</span>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                pp = percentage points shift in workforce share
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SectorChart;
