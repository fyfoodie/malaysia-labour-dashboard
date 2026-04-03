import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { TrendingUp, TrendingDown, Briefcase, MapPin, Download } from "lucide-react";
import html2canvas from "html2canvas";

type Metric = "u_rate" | "p_rate";

interface GeoFeature {
  type: string;
  properties: { [key: string]: any };
  geometry: { type: string; coordinates: any[] };
}

// Try local geojson first, then DOSM GitHub via corsproxy
const GEO_URLS = [
  "/malaysia-states.geojson",
  `https://corsproxy.io/?${encodeURIComponent(
    "https://raw.githubusercontent.com/dosm-malaysia/data-open/main/datasets/geodata/administrative_1_state.geojson"
  )}`,
];

// Keys to try when reading state name from GeoJSON properties
const STATE_NAME_KEYS = ["state", "name", "NAME_1", "nm_state", "State", "Name", "shapeName"];

// Normalise GeoJSON names → DOSM LFS state names
const STATE_NAME_MAP: Record<string, string> = {
  "Wilayah Persekutuan Kuala Lumpur":  "W.P. Kuala Lumpur",
  "WP Kuala Lumpur":                   "W.P. Kuala Lumpur",
  "Kuala Lumpur":                      "W.P. Kuala Lumpur",
  "Federal Territory of Kuala Lumpur": "W.P. Kuala Lumpur",
  "Wilayah Persekutuan Labuan":        "W.P. Labuan",
  "WP Labuan":                         "W.P. Labuan",
  "Labuan":                            "W.P. Labuan",
  "Wilayah Persekutuan Putrajaya":     "W.P. Putrajaya",
  "WP Putrajaya":                      "W.P. Putrajaya",
  "Putrajaya":                         "W.P. Putrajaya",
  "Penang":                            "Pulau Pinang",
  "Pinang":                            "Pulau Pinang",
  "Pulau Pinang":                      "Pulau Pinang",
  "Negeri Sembilan":                   "Negeri Sembilan",
};

function extractStateName(properties: Record<string, any>): string {
  for (const key of STATE_NAME_KEYS) {
    if (properties[key]) {
      const raw = String(properties[key]);
      return STATE_NAME_MAP[raw] ?? raw;
    }
  }
  return "";
}

const getColor = (value: number, metric: Metric): string => {
  if (metric === "u_rate") {
    if (value <= 2.5) return "#22c55e";
    if (value <= 3.0) return "#84cc16";
    if (value <= 3.5) return "#eab308";
    if (value <= 4.5) return "#f97316";
    return "#ef4444";
  }
  if (value >= 73) return "#22c55e";
  if (value >= 70) return "#84cc16";
  if (value >= 67) return "#eab308";
  if (value >= 64) return "#f97316";
  return "#ef4444";
};

const projectPoint = (lon: number, lat: number): [number, number] => {
  const x = ((lon - 99.5) / (119.5 - 99.5)) * 800;
  const y = 400 - ((lat - 0.8) / (7.5 - 0.8)) * 400;
  return [x, y];
};

const getPathFromCoords = (coords: number[][]) =>
  coords.map((p, i) => {
    const [x, y] = projectPoint(p[0], p[1]);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + "Z";

const getStatePath = (geometry: GeoFeature["geometry"]): string => {
  const paths: string[] = [];
  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((poly: any) =>
      poly.forEach((ring: any) => paths.push(getPathFromCoords(ring)))
    );
  } else if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring: any) => paths.push(getPathFromCoords(ring)));
  }
  return paths.join(" ");
};

// Format thousands to readable string e.g. 1234.5 → "1,234.5k"
const fmtK = (val: number | undefined | null) =>
  val != null ? `${val.toLocaleString()}k` : "—";

const StateMap = () => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();
  const [metric, setMetric]           = useState<Metric>("u_rate");
  const [geoData, setGeoData]         = useState<GeoFeature[]>([]);
  const [geoStatus, setGeoStatus]     = useState<"loading" | "loaded" | "error">("loading");
  const [hoveredState, setHoveredState]   = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Export PNG ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = `state-labour-map-${metric}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // ── Load GeoJSON ────────────────────────────────────────────────────────────
  useEffect(() => {
    const tryFetch = async () => {
      for (const url of GEO_URLS) {
        try {
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) continue;
          const d = await res.json();
          const features: GeoFeature[] = d.features ?? [];
          if (features.length > 0) {
            setGeoData(features);
            setGeoStatus("loaded");
            return;
          }
        } catch {
          // try next URL
        }
      }
      setGeoStatus("error");
    };
    tryFetch();
  }, []);

  // ── Process state data ──────────────────────────────────────────────────────
  // DOSM lfs_qtr_state fields:
  //   lf           → Labour Force Size (thousands)
  //   lf_employed  → Employed Persons (thousands)
  //   lf_unemployed→ Unemployed Persons (thousands)
  //   lf_outside   → Outside Labour Force (thousands)
  //   u_rate       → Unemployment Rate (%)
  //   p_rate       → Participation Rate (%)
  const sorted = useMemo(() =>
    data?.state
      ? [...data.state].sort((a: any, b: any) => a.date.localeCompare(b.date))
      : []
  , [data]);

  const latestDate = sorted[sorted.length - 1]?.date;

  const latestData = useMemo(() =>
    sorted.filter((d: any) => d.date === latestDate)
  , [sorted, latestDate]);

  const findStateData = (stateName: string | undefined | null) => {
    if (!stateName) return null;
    return latestData.find((s: any) => s.state === stateName) ?? null;
  };

  const rankedData = useMemo(() =>
    [...latestData].sort((a: any, b: any) =>
      metric === "u_rate" ? a[metric] - b[metric] : b[metric] - a[metric]
    )
  , [latestData, metric]);

  const activeState = selectedState
    ? findStateData(selectedState)
    : hoveredState
    ? findStateData(hoveredState)
    : null;

  // ── Derived labels ──────────────────────────────────────────────────────────
  const metricLabel = metric === "u_rate" ? "Unemployment Rate" : "Participation Rate";

  // Format latest date as "Q3 2025" style from YYYY-MM-DD
  const latestQuarter = useMemo(() => {
    if (!latestDate) return "";
    const d = new Date(latestDate);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear()}`;
  }, [latestDate]);

  // ── KPI aggregates ──────────────────────────────────────────────────────────
  const avgUnemployment = latestData.length
    ? (latestData.reduce((s: number, d: any) => s + (d.u_rate ?? 0), 0) / latestData.length).toFixed(1)
    : "—";
  const avgParticipation = latestData.length
    ? (latestData.reduce((s: number, d: any) => s + (d.p_rate ?? 0), 0) / latestData.length).toFixed(1)
    : "—";
  const bestUnemployment = latestData.length
    ? Math.min(...latestData.map((d: any) => d.u_rate ?? 99)).toFixed(1)
    : "—";

  if (loading || !data?.state?.length) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-[600px] animate-pulse" />;
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">State-Level Labour Market</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest data: {latestQuarter} — Compare unemployment and participation across Malaysia's 16 states
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              title="Export as PNG"
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <div className="flex gap-1 p-1 rounded-full bg-muted border border-border">
              {([
                { key: "u_rate" as Metric, label: "Unemployment" },
                { key: "p_rate" as Metric, label: "Participation" },
              ]).map(m => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    metric === m.key
                      ? "bg-foreground text-background shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            {
              label: "Avg Unemployment",
              value: `${avgUnemployment}%`,
              icon:  TrendingDown,
              color: "text-red-500",
              bg:    "bg-red-500/10",
              tip:   "Simple average of unemployment rates across all states",
            },
            {
              label: "Avg Participation",
              value: `${avgParticipation}%`,
              icon:  TrendingUp,
              color: "text-green-500",
              bg:    "bg-green-500/10",
              tip:   "Simple average of LFPR across all states",
            },
            {
              label: "Lowest Unemployment",
              value: `${bestUnemployment}%`,
              icon:  Briefcase,
              color: "text-blue-500",
              bg:    "bg-blue-500/10",
              tip:   "State with the lowest unemployment rate this quarter",
            },
            {
              label: "States Tracked",
              value: `${latestData.length}`,
              icon:  MapPin,
              color: "text-purple-500",
              bg:    "bg-purple-500/10",
              tip:   "Number of states and federal territories with data",
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`rounded-xl ${kpi.bg} p-3 flex items-center gap-2`}
              title={kpi.tip}
            >
              <kpi.icon className={`h-4 w-4 ${kpi.color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">

        {/* Map panel */}
        <div className="lg:col-span-2 p-5 relative">
          <h3 className="text-sm font-semibold text-foreground mb-1">{metricLabel} by State</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Click a state to pin its details · Hover to preview
          </p>

          {geoStatus === "error" ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">Could not load map boundary data.</p>
              <button
                onClick={() => { setGeoStatus("loading"); setGeoData([]); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted/60 transition-all"
              >
                Retry
              </button>
            </div>
          ) : geoStatus === "loading" && geoData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="relative">
              <svg viewBox="0 0 800 400" className="w-full h-auto drop-shadow-sm">
                {geoData.map((feature, i) => {
                  const stateName  = extractStateName(feature.properties);
                  const sd         = findStateData(stateName);
                  const value      = sd ? (sd[metric] ?? 0) : 0;
                  const color      = sd ? getColor(value, metric) : "#d1d5db";
                  const isHovered  = hoveredState  === stateName;
                  const isSelected = selectedState === stateName;
                  return (
                    <path
                      key={i}
                      d={getStatePath(feature.geometry)}
                      fill={color}
                      stroke={isSelected ? "#1e293b" : "white"}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.8}
                      opacity={
                        selectedState && !isSelected ? 0.45
                        : hoveredState && !isHovered && !isSelected ? 0.6
                        : 1
                      }
                      className="cursor-pointer transition-all duration-150"
                      style={{ filter: isSelected || isHovered ? "brightness(1.1)" : "none" }}
                      onMouseEnter={() => setHoveredState(stateName)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState(prev => prev === stateName ? null : stateName)}
                    />
                  );
                })}
              </svg>

              {/* Hover tooltip */}
              <AnimatePresence>
                {hoveredState && !selectedState && (() => {
                  const sd = findStateData(hoveredState);
                  if (!sd) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute top-3 right-3 bg-card border border-border rounded-xl p-3 shadow-xl text-sm z-10 min-w-[190px]"
                    >
                      <p className="font-bold text-foreground mb-2">{sd.state}</p>
                      <div className="space-y-1">
                        {[
                          { label: "Unemployment Rate", value: `${sd.u_rate}%`       },
                          { label: "Participation Rate", value: `${sd.p_rate}%`      },
                          { label: "Labour Force",       value: fmtK(sd.lf)          },
                          { label: "Employed",           value: fmtK(sd.lf_employed) },
                          { label: "Unemployed",         value: fmtK(sd.lf_unemployed) },
                        ].map(r => (
                          <div key={r.label} className="flex justify-between gap-4">
                            <span className="text-muted-foreground text-xs">{r.label}</span>
                            <span className="font-semibold text-foreground text-xs">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Legend */}
              <div className="mt-3 flex items-center justify-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">
                  {metric === "u_rate" ? "Low" : "Low"}
                </span>
                {["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"].map((c, i) => (
                  <div key={i} className="w-6 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  {metric === "u_rate" ? "High" : "High"}
                </span>
              </div>

              {/* Legend thresholds */}
              <div className="mt-1 flex items-center justify-center gap-3 flex-wrap">
                {metric === "u_rate" ? (
                  <>
                    {[
                      { color: "#22c55e", label: "≤2.5%" },
                      { color: "#84cc16", label: "2.5–3.0%" },
                      { color: "#eab308", label: "3.0–3.5%" },
                      { color: "#f97316", label: "3.5–4.5%" },
                      { color: "#ef4444", label: ">4.5%" },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                        <span className="text-[10px] text-muted-foreground">{l.label}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { color: "#22c55e", label: "≥73%" },
                      { color: "#84cc16", label: "70–73%" },
                      { color: "#eab308", label: "67–70%" },
                      { color: "#f97316", label: "64–67%" },
                      { color: "#ef4444", label: "<64%" },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                        <span className="text-[10px] text-muted-foreground">{l.label}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="border-t lg:border-t-0 lg:border-l border-border p-5 flex flex-col">
          <AnimatePresence mode="wait">

            {/* State detail panel */}
            {selectedState && activeState ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">{activeState.state}</h3>
                  <button
                    onClick={() => setSelectedState(null)}
                    className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Stats — using correct DOSM field names */}
                {[
                  {
                    label: "Unemployment Rate",
                    value: `${activeState.u_rate ?? "—"}%`,
                    color: getColor(activeState.u_rate, "u_rate"),
                    tip:   "u_rate — ratio of unemployed to labour force",
                  },
                  {
                    label: "Participation Rate",
                    value: `${activeState.p_rate ?? "—"}%`,
                    color: getColor(activeState.p_rate, "p_rate"),
                    tip:   "p_rate — ratio of labour force to working-age population",
                  },
                  {
                    label: "Labour Force Size",
                    value: fmtK(activeState.lf),
                    color: "#6366f1",
                    tip:   "lf — total employed + unemployed persons (thousands)",
                  },
                  {
                    label: "Employed Persons",
                    value: fmtK(activeState.lf_employed),
                    color: "#22c55e",
                    tip:   "lf_employed — worked at least 1 hour for pay/profit (thousands)",
                  },
                  {
                    label: "Unemployed Persons",
                    value: fmtK(activeState.lf_unemployed),
                    color: "#ef4444",
                    tip:   "lf_unemployed — not working but actively seeking work (thousands)",
                  },
                  {
                    label: "Outside Labour Force",
                    value: fmtK(activeState.lf_outside),
                    color: "#94a3b8",
                    tip:   "lf_outside — housewives, students, early retired, disabled (thousands)",
                  },
                ].map(stat => (
                  <div
                    key={stat.label}
                    title={stat.tip}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border"
                  >
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                    <span className="text-xs font-bold" style={{ color: stat.color }}>{stat.value}</span>
                  </div>
                ))}

                {/* Unemployment vs national avg bar */}
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    vs. national average ({avgUnemployment}%)
                  </p>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((activeState.u_rate / 8) * 100, 100)}%`,
                        backgroundColor: getColor(activeState.u_rate, "u_rate"),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span><span>8%</span>
                  </div>
                </div>
              </motion.div>

            ) : (
              /* Rankings list */
              <motion.div
                key="rankings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                <h3 className="text-sm font-semibold text-foreground">
                  {metricLabel} Rankings
                </h3>
                <p className="text-xs text-muted-foreground mb-1">
                  Click any state on the map to see full details
                </p>
                <div className="space-y-1.5 overflow-y-auto max-h-[420px] pr-1">
                  {rankedData.map((d: any, i: number) => {
                    const val    = d[metric] ?? 0;
                    const maxVal = metric === "u_rate" ? 8 : 85;
                    return (
                      <div key={d.state} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                              {d.state}
                            </span>
                            <span className="text-xs font-bold" style={{ color: getColor(val, metric) }}>
                              {val}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(val / maxVal) * 100}%` }}
                              transition={{ delay: i * 0.03, duration: 0.4 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: getColor(val, metric) }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Source footer ── */}
      <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground/70">
            {"Source: "}
            <a href="https://open.dosm.gov.my/data-catalogue/lfs_qtr_state" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">{"DOSM — Quarterly Principal Labour Force Statistics by State (lfs_qtr_state)"}</a>
          </span>
          <span className="text-xs text-muted-foreground/50">
            {"Map boundaries: "}
            <a href="https://github.com/dosm-malaysia/data-open" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">{"DOSM Open Data (dosm-malaysia/data-open)"}</a>
          </span>
        </div>
        <div className="group relative flex items-center">
          <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[10px] font-bold select-none">i</div>
          <div className="absolute bottom-6 right-0 w-72 bg-card border border-border rounded-xl p-3 shadow-lg text-xs text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 space-y-1">
            <p className="font-semibold text-foreground mb-1">Field definitions (DOSM lfs_qtr_state)</p>
            <p><strong>{"lf"}</strong>{" — Labour Force Size: total employed + unemployed (thousands)"}</p>
            <p><strong>{"lf_employed"}</strong>{" — worked at least 1 hour for pay/profit (thousands)"}</p>
            <p><strong>{"lf_unemployed"}</strong>{" — not working but actively seeking work (thousands)"}</p>
            <p><strong>{"lf_outside"}</strong>{" — outside labour force: housewives, students, retired (thousands)"}</p>
            <p><strong>{"u_rate"}</strong>{" — unemployment rate: lf_unemployed / lf × 100"}</p>
            <p><strong>{"p_rate"}</strong>{" — participation rate: lf / working-age population × 100"}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StateMap;