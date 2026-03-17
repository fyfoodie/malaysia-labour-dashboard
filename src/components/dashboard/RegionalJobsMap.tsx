import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { TrendingUp, DollarSign, AlertCircle, Star } from "lucide-react";

interface StateEconData {
  state: string;
  medianIncome: number;
  meanIncome: number;
  gini: number;
  povertyRate: number;
  unemploymentRate: number;
  participationRate: number;
  opportunityScore: number;
}

const PROXY = (id: string, limit = 500) =>
  `https://corsproxy.io/?${encodeURIComponent(`https://api.data.gov.my/data-catalogue?id=${id}&limit=${limit}`)}`;

async function fetchJSON(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

const scoreColor = (score: number) => {
  if (score >= 75) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 45) return "#eab308";
  if (score >= 30) return "#f97316";
  return "#ef4444";
};

const RegionalJobsMap = () => {
  const { data: labourData } = useLabourData();
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [hiesData,   setHiesData]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [sortBy,     setSortBy]     = useState<"opportunityScore" | "medianIncome" | "unemploymentRate" | "povertyRate">("opportunityScore");

  useEffect(() => {
    Promise.all([
      fetchJSON(PROXY("hh_income_state", 500)),
      fetchJSON(PROXY("hies_state", 200)),
    ]).then(([inc, hies]) => {
      setIncomeData(inc);
      setHiesData(hies);
      setLoading(false);
    });
  }, []);

  const stateData = useMemo<StateEconData[]>(() => {
    if (!labourData?.state?.length || !incomeData.length) return [];

    const lfsSorted  = [...labourData.state].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latestDate = lfsSorted[lfsSorted.length - 1]?.date;
    const latestLFS  = lfsSorted.filter((d: any) => d.date === latestDate);

    const incByState: Record<string, any> = {};
    incomeData.forEach((d: any) => {
      const s = d.state;
      if (!incByState[s] || d.date > incByState[s].date) incByState[s] = d;
    });

    const hiesByState: Record<string, any> = {};
    hiesData.forEach((d: any) => {
      const s = d.state;
      if (!hiesByState[s] || d.date > hiesByState[s].date) hiesByState[s] = d;
    });

    const results: StateEconData[] = [];
    latestLFS.forEach((lfs: any) => {
      const stateName = lfs.state;
      const inc  = incByState[stateName];
      const hies = hiesByState[stateName];
      if (!inc) return;

      const medianIncome     = inc.income_median  ?? inc.median ?? 0;
      const meanIncome       = inc.income_mean    ?? inc.mean   ?? 0;
      const gini             = hies?.gini         ?? 0;
      const povertyRate      = hies?.poverty_rate ?? hies?.incidence_poverty ?? 0;
      const unemploymentRate = lfs.u_rate         ?? 0;
      const participationRate = lfs.p_rate        ?? 0;

      const maxMedian = 12000;
      const incScore  = Math.min((medianIncome / maxMedian) * 100, 100);
      const uScore    = Math.max(0, 100 - (unemploymentRate / 8) * 100);
      const povScore  = Math.max(0, 100 - (povertyRate / 20) * 100);
      const giniScore = Math.max(0, 100 - ((gini - 0.3) / 0.25) * 100);
      const partScore = Math.min(((participationRate - 55) / 25) * 100, 100);

      const opportunityScore = Math.round(
        incScore * 0.35 + uScore * 0.25 + povScore * 0.20 + giniScore * 0.10 + partScore * 0.10
      );

      results.push({
        state: stateName, medianIncome, meanIncome, gini, povertyRate,
        unemploymentRate, participationRate,
        opportunityScore: Math.max(0, Math.min(100, opportunityScore)),
      });
    });

    return results.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }, [labourData, incomeData, hiesData]);

  const sorted = useMemo(() =>
    [...stateData].sort((a, b) =>
      sortBy === "unemploymentRate" || sortBy === "povertyRate"
        ? a[sortBy] - b[sortBy]
        : b[sortBy] - a[sortBy]
    )
  , [stateData, sortBy]);

  const selectedData = selected ? stateData.find(d => d.state === selected) : null;

  const radarData = selectedData ? [
    { metric: "Income",        value: Math.min((selectedData.medianIncome / 12000) * 100, 100) },
    { metric: "Employment",    value: Math.max(0, 100 - (selectedData.unemploymentRate / 8) * 100) },
    { metric: "Participation", value: Math.min(((selectedData.participationRate - 55) / 25) * 100, 100) },
    { metric: "Low Poverty",   value: Math.max(0, 100 - (selectedData.povertyRate / 20) * 100) },
    { metric: "Equality",      value: selectedData.gini ? Math.max(0, 100 - ((selectedData.gini - 0.3) / 0.25) * 100) : 50 },
  ] : [];

  if (loading || !stateData.length) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border p-5 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-1">State Economic Opportunity Index</h2>
        <p className="text-sm text-muted-foreground mb-4">Loading live data from DOSM...</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </motion.div>
    );
  }

  const top3    = sorted.slice(0, 3);
  const bottom3 = [...sorted].reverse().slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">State Economic Opportunity Index</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Composite score: household income, unemployment, poverty & equality — live from DOSM
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: "opportunityScore", label: "Score"     },
              { key: "medianIncome",     label: "Income"    },
              { key: "unemploymentRate", label: "Unemploy." },
              { key: "povertyRate",      label: "Poverty"   },
            ] as const).map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  sortBy === s.key
                    ? "bg-foreground text-background shadow-md"
                    : "bg-muted border border-border text-foreground hover:bg-muted/80"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top & Bottom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-semibold text-foreground">Top Opportunity States</span>
            </div>
            {top3.map((s, i) => (
              <div key={s.state} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-xs font-medium text-foreground">{s.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${s.opportunityScore}%` }} />
                  </div>
                  <span className="text-xs font-bold text-green-500">{s.opportunityScore}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-semibold text-foreground">Needs Attention</span>
            </div>
            {bottom3.map((s, i) => (
              <div key={s.state} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-xs font-medium text-foreground">{s.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${s.opportunityScore}%` }} />
                  </div>
                  <span className="text-xs font-bold text-red-500">{s.opportunityScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="lg:col-span-2 p-5 border-b lg:border-b-0 lg:border-r border-border">
          <h3 className="text-xs font-semibold text-foreground mb-3">
            {sortBy === "opportunityScore"  && "Opportunity Score by State"}
            {sortBy === "medianIncome"      && "Median Monthly Household Income (RM)"}
            {sortBy === "unemploymentRate"  && "Unemployment Rate (%) — lower is better"}
            {sortBy === "povertyRate"       && "Poverty Incidence (%) — lower is better"}
          </h3>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 40 }}
                onClick={(e) => e?.activePayload && setSelected(
                  s => s === e.activePayload![0].payload.state ? null : e.activePayload![0].payload.state
                )}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v =>
                    sortBy === "medianIncome" ? `RM${(v/1000).toFixed(0)}k` : `${v}${sortBy === "opportunityScore" ? "" : "%"}`
                  } />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} width={115} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(value: number) => [
                    sortBy === "medianIncome" ? `RM ${value.toLocaleString()}` : `${value}${sortBy === "opportunityScore" ? "/100" : "%"}`,
                    sortBy === "opportunityScore" ? "Score" : sortBy === "medianIncome" ? "Median Income" : sortBy === "unemploymentRate" ? "Unemployment" : "Poverty Rate"
                  ]}
                  labelStyle={{ fontWeight: 600 }}
                  cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                />
                <Bar dataKey={sortBy} radius={[0, 6, 6, 0]} barSize={16}>
                  {sorted.map((entry) => (
                    <Cell key={entry.state}
                      fill={scoreColor(entry.opportunityScore)}
                      opacity={selected && selected !== entry.state ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Click any bar to see full state profile</p>
        </div>

        {/* Detail panel */}
        <div className="p-5 flex flex-col">
          <AnimatePresence mode="wait">
            {selectedData ? (
              <motion.div key={selectedData.state}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-3 h-full"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{selectedData.state}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-muted-foreground">Score:</span>
                      <span className="text-sm font-bold" style={{ color: scoreColor(selectedData.opportunityScore) }}>
                        {selectedData.opportunityScore}/100
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 hover:text-foreground">
                    ✕
                  </button>
                </div>

                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <Radar dataKey="value" stroke={scoreColor(selectedData.opportunityScore)}
                        fill={scoreColor(selectedData.opportunityScore)} fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  {[
                    { label: "Median Income",  value: `RM ${selectedData.medianIncome.toLocaleString()}`,  color: "text-green-500"  },
                    { label: "Mean Income",    value: `RM ${selectedData.meanIncome.toLocaleString()}`,    color: "text-blue-500"   },
                    { label: "Unemployment",   value: `${selectedData.unemploymentRate}%`,                 color: selectedData.unemploymentRate > 4 ? "text-red-500" : "text-green-500" },
                    { label: "Participation",  value: `${selectedData.participationRate}%`,                color: "text-blue-500"   },
                    { label: "Poverty Rate",   value: selectedData.povertyRate ? `${selectedData.povertyRate}%` : "N/A", color: "text-orange-500" },
                    { label: "Gini Index",     value: selectedData.gini ? selectedData.gini.toFixed(3) : "N/A", color: "text-purple-500" },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg bg-muted/40 border border-border p-2">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={`text-xs font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center gap-3 py-8"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Star className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Select a state</p>
                <p className="text-xs text-muted-foreground">Click any bar to see full economic profile with radar breakdown</p>
                <div className="mt-3 space-y-1 w-full">
                  {[
                    { range: "75–100", label: "High Opportunity",  color: "#22c55e" },
                    { range: "60–74",  label: "Good Opportunity",  color: "#84cc16" },
                    { range: "45–59",  label: "Moderate",          color: "#eab308" },
                    { range: "30–44",  label: "Needs Improvement", color: "#f97316" },
                    { range: "0–29",   label: "Challenging",       color: "#ef4444" },
                  ].map(l => (
                    <div key={l.range} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                        <span className="text-muted-foreground">{l.label}</span>
                      </div>
                      <span className="text-muted-foreground">{l.range}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* State cards */}
      <div className="p-5 border-t border-border">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {sorted.slice(0, 8).map(s => (
            <motion.div key={s.state} whileHover={{ scale: 1.02 }}
              onClick={() => setSelected(prev => prev === s.state ? null : s.state)}
              className={`rounded-xl border p-2.5 cursor-pointer transition-all ${
                selected === s.state ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground truncate max-w-[75%]" style={{ fontSize: "10px" }}>{s.state}</span>
                <span className="text-xs font-bold" style={{ color: scoreColor(s.opportunityScore), fontSize: "10px" }}>{s.opportunityScore}</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.opportunityScore}%`, backgroundColor: scoreColor(s.opportunityScore) }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="text-xs text-muted-foreground">
          Sources:{" "}
          <a href="https://open.dosm.gov.my/data-catalogue/hh_income_state" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">DOSM Household Income</a>
          {" · "}
          <a href="https://open.dosm.gov.my/data-catalogue/hies_state" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">HIES Poverty & Gini</a>
          {" · "}
          <a href="https://open.dosm.gov.my/data-catalogue/lfs_qtr_state" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">LFS Quarterly by State</a>
        </p>
      </div>
    </motion.div>
  );
};

export default RegionalJobsMap;
