import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { AlertCircle, Star, Loader2, Info } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StateEconData {
  state:              string;
  medianIncome:       number;   
  meanIncome:         number;   
  gini:               number;   
  povertyRate:        number;   
  unemploymentRate:   number;   
  participationRate:  number;   
  opportunityScore:   number;   
  dataYear:           string;   
}

type SortKey = "opportunityScore" | "medianIncome" | "unemploymentRate" | "povertyRate";

// ── API proxy ─────────────────────────────────────────────────────────────────
const isLocal = window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1";
const PROXY = (id: string, limit = 500) =>
  isLocal
    ? `https://corsproxy.io/?${encodeURIComponent(
        `https://api.data.gov.my/data-catalogue?id=${id}&limit=${limit}`
      )}`
    : `/.netlify/functions/dosm-proxy?id=${id}&limit=${limit}`;

const POVERTY_FALLBACK: Record<string, number> = {
  "Sabah":             19.5,
  "Kelantan":           8.2,
  "Kedah":              6.5,
  "Sarawak":            6.2,
  "Terengganu":         5.4,
  "Perlis":             5.3,
  "W.P. Labuan":        4.5,
  "Pahang":             3.3,
  "Perak":              2.8,
  "Negeri Sembilan":    1.3,
  "Johor":              1.0,
  "Melaka":             0.8,
  "Selangor":           0.5,
  "W.P. Kuala Lumpur":  0.4,
  "Pulau Pinang":       0.3,
  "W.P. Putrajaya":     0.2,
};

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

// FIXED TOOLTIP: Aligned to the right so it doesn't get cut off on the edge of the screen
function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex items-center ml-1">
      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[9px] font-bold select-none flex-shrink-0">
        i
      </div>
      <div className="absolute bottom-full -right-2 mb-2 w-48 sm:w-56 bg-card border border-border rounded-xl p-2.5 shadow-lg text-xs text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-[100] text-left">
        {text}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  tooltip,
}: {
  label:    string;
  value:    string;
  color:    string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border p-2">
      <div className="flex items-center gap-0.5 mb-0.5">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <p className={`text-xs font-bold ${color}`}>{value}</p>
    </div>
  );
}

const RegionalJobsMap = () => {
  const { data: labourData } = useLabourData();
  const { t }                = useLanguage();

  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [hiesData,   setHiesData]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<string | null>(null);
  
  const [sortBy, setSortBy] = useState<SortKey>("opportunityScore");

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

    const lfsSorted  = [...labourData.state].sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );
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
      const inc       = incByState[stateName];
      const hies      = hiesByState[stateName];

      if (!inc && !hies) return;

      const medianIncome = hies?.income_median ?? inc?.income_median ?? 0;
      const meanIncome   = hies?.income_mean   ?? inc?.income_mean   ?? 0;
      const gini         = hies?.gini ?? 0;
      const povertyRate  = hies?.poverty ?? POVERTY_FALLBACK[stateName] ?? 0;
      const unemploymentRate  = lfs.u_rate ?? 0;
      const participationRate = lfs.p_rate ?? 0;

      const dataYear = (hies?.date ?? inc?.date ?? "")
        .toString()
        .substring(0, 4);

      const incScore  = Math.min((medianIncome / 12_000) * 100, 100);
      const uScore    = Math.max(0, 100 - (unemploymentRate / 8)   * 100);
      const povScore  = Math.max(0, 100 - (povertyRate / 20)       * 100);
      const giniScore = gini
        ? Math.max(0, 100 - ((gini - 0.3) / 0.25) * 100)
        : 50; 
      const partScore = Math.min(
        Math.max(0, ((participationRate - 55) / 25) * 100),
        100
      );

      const opportunityScore = Math.round(
        incScore  * 0.35 +
        uScore    * 0.25 +
        povScore  * 0.20 +
        giniScore * 0.10 +
        partScore * 0.10
      );

      results.push({
        state: stateName,
        medianIncome,
        meanIncome,
        gini,
        povertyRate,
        unemploymentRate,
        participationRate,
        opportunityScore: Math.max(0, Math.min(100, opportunityScore)),
        dataYear,
      });
    });

    return results.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }, [labourData, incomeData, hiesData]);

  const sorted = useMemo(() =>
    [...stateData].sort((a, b) => {
      const valA = Number(a[sortBy]);
      const valB = Number(b[sortBy]);
      return sortBy === "unemploymentRate" || sortBy === "povertyRate"
        ? valA - valB
        : valB - valA;
    }),
    [stateData, sortBy]
  );

  const selectedData = selected
    ? stateData.find(d => d.state === selected) ?? null
    : null;

  const radarData = selectedData
    ? [
        { metric: "Income",        value: Math.min((selectedData.medianIncome / 12_000) * 100, 100) },
        { metric: "Employment",    value: Math.max(0, 100 - (selectedData.unemploymentRate / 8) * 100) },
        { metric: "Participation", value: Math.min(Math.max(0, ((selectedData.participationRate - 55) / 25) * 100), 100) },
        { metric: "Low Poverty",   value: Math.max(0, 100 - (selectedData.povertyRate / 20) * 100) },
        { metric: "Equality",      value: selectedData.gini ? Math.max(0, 100 - ((selectedData.gini - 0.3) / 0.25) * 100) : 50 },
      ]
    : [];

  const top3    = sorted.slice(0, 3);
  const bottom3 = [...sorted].reverse().slice(0, 3);

  if (loading || !stateData.length) {
    return (
      <div className="p-10 text-center bg-card rounded-2xl border border-border">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Analyzing regional economic data...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t("regional.title") ?? "Regional Opportunity"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("regional.desc") ?? "Economic health comparison by state"}</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: "opportunityScore", label: "Opportunity Score" },
              { key: "medianIncome",     label: "Median Income"     },
              { key: "unemploymentRate", label: "Unemployment"      },
              { key: "povertyRate",      label: "Poverty Rate"      },
            ] as { key: SortKey; label: string }[]).map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  sortBy === s.key
                    ? "bg-foreground text-background shadow-md"
                    : "bg-muted border border-border text-foreground hover:bg-muted/80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-semibold text-foreground">Highest Opportunity</span>
            </div>
            {top3.map((s, i) => (
              <div key={s.state} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-xs font-medium text-foreground">{s.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${s.opportunityScore}%` }}
                    />
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
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${s.opportunityScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-red-500">{s.opportunityScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bar chart + detail panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="lg:col-span-2 p-5 border-b lg:border-b-0 lg:border-r border-border">
          <h3 className="text-xs font-semibold text-foreground mb-3">
            {sortBy === "opportunityScore" && "Composite Opportunity Score by State"}
            {sortBy === "medianIncome"     && "Median Monthly Household Income (RM) by State"}
            {sortBy === "unemploymentRate" && "Unemployment Rate (%) by State"}
            {sortBy === "povertyRate"      && "Absolute Poverty Rate (%) by State"}
          </h3>
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted}
                layout="vertical"
                margin={{ left: 8, right: 40 }}
                onClick={(e) =>
                  e?.activePayload &&
                  setSelected(s =>
                    s === e.activePayload![0].payload.state
                      ? null
                      : e.activePayload![0].payload.state
                  )
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={v =>
                    sortBy === "medianIncome"
                      ? `RM${(v / 1000).toFixed(0)}k`
                      : `${v}${sortBy !== "opportunityScore" ? '%' : ''}`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="state"
                  tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                  width={115}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                />
                <Bar dataKey={sortBy} radius={[0, 6, 6, 0]} barSize={16}>
                  {sorted.map((entry) => (
                    <Cell
                      key={entry.state}
                      fill={scoreColor(entry.opportunityScore)}
                      opacity={selected && selected !== entry.state ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 flex flex-col">
          <AnimatePresence mode="wait">
            {selectedData ? (
              <motion.div
                key={selectedData.state}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3 h-full"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{selectedData.state}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-muted-foreground">Opportunity Score</span>
                      <span
                        className="text-sm font-bold ml-1"
                        style={{ color: scoreColor(selectedData.opportunityScore) }}
                      >
                        {selectedData.opportunityScore}/100
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 hover:text-foreground"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Radar
                        dataKey="value"
                        stroke={scoreColor(selectedData.opportunityScore)}
                        fill={scoreColor(selectedData.opportunityScore)}
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <StatCard
                    label="Median Income"
                    value={`RM ${selectedData.medianIncome.toLocaleString()}/mo`}
                    color="text-green-500"
                    tooltip="The middle point of household incomes. Source: DOSM HIES."
                  />
                  <StatCard
                    label="Mean Income"
                    value={`RM ${selectedData.meanIncome.toLocaleString()}/mo`}
                    color="text-teal-500"
                    tooltip="The average household income. Usually higher than median due to top earners. Source: DOSM HIES."
                  />
                  <StatCard
                    label="Unemployment"
                    value={`${selectedData.unemploymentRate}%`}
                    color={selectedData.unemploymentRate > 4 ? "text-red-500" : "text-green-500"}
                    tooltip="Active job seekers vs total labour force. Source: DOSM LFS."
                  />
                  <StatCard
                    label="Participation"
                    value={`${selectedData.participationRate}%`}
                    color="text-blue-500"
                    tooltip="Working-age population active in the market."
                  />
                  <StatCard
                    label="Poverty Rate"
                    value={`${selectedData.povertyRate}%`}
                    color="text-orange-500"
                    tooltip="Proportion below Poverty Line Income."
                  />
                  <StatCard
                    label="Gini Index"
                    value={selectedData.gini ? selectedData.gini.toFixed(3) : "N/A"}
                    color="text-purple-500"
                    tooltip="Measures income inequality (0 to 1). Lower is more equal. Source: DOSM HIES."
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center gap-3 py-8"
              >
                <Star className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">Select a State</p>
                <p className="text-xs text-muted-foreground">Click any bar or card to see details</p>
                <div className="mt-4 w-full space-y-1">
                   {[
                    { color: "#22c55e", label: "High Opportunity" },
                    { color: "#eab308", label: "Moderate" },
                    { color: "#ef4444", label: "Challenging" },
                   ].map(l => (
                     <div key={l.label} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                       <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                       {l.label}
                     </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-5 border-t border-border">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stateData.slice(0, 8).map(s => (
            <motion.div
              key={s.state}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelected(s.state)}
              className={`rounded-xl border p-2.5 cursor-pointer transition-all ${
                selected === s.state ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[10px] truncate max-w-[70%]">{s.state}</span>
                <span className="font-bold text-[10px]" style={{ color: scoreColor(s.opportunityScore) }}>{s.opportunityScore}</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full" style={{ width: `${s.opportunityScore}%`, backgroundColor: scoreColor(s.opportunityScore) }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── FIXED: Added the proper Source footer layout back! ── */}
      <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">
            Source:{" "}
            <a href="https://open.dosm.gov.my/data-catalogue/hh_income_state" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">DOSM — Household Income</a>
            {" · "}
            <a href="https://open.dosm.gov.my/data-catalogue/hies_state" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">HIES</a>
            {" · "}
            <a href="https://open.dosm.gov.my/data-catalogue/lfs_qtr_state" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">LFS Quarterly</a>
          </span>
        </div>
        <div className="group relative flex items-center">
          <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[10px] font-bold select-none">i</div>
          <div className="absolute bottom-6 right-0 w-72 bg-card border border-border rounded-xl p-3 shadow-lg text-xs text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 space-y-1 text-left">
            <p className="font-semibold text-foreground mb-1">Field definitions</p>
            <p><strong>income_median</strong> — median gross monthly household income (RM)</p>
            <p><strong>income_mean</strong> — mean gross monthly household income (RM)</p>
            <p><strong>gini</strong> — Gini coefficient (0–1), higher = more unequal</p>
            <p><strong>poverty</strong> — % of households below the Poverty Line Income</p>
            <p><strong>u_rate</strong> — unemployment rate from LFS quarterly</p>
            <p><strong>p_rate</strong> — labour force participation rate</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RegionalJobsMap;