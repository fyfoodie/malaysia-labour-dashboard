import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { TrendingUp, TrendingDown, Briefcase, MapPin } from "lucide-react";

type Metric = "u_rate" | "p_rate";

interface GeoFeature {
  type: string;
  properties: { state: string; code_state: number; [key: string]: any };
  geometry: { type: string; coordinates: any[] };
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

const StateMap = () => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();
  const [metric, setMetric] = useState<Metric>("u_rate");
  const [geoData, setGeoData] = useState<GeoFeature[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/dosm-malaysia/data-open/main/datasets/geodata/administrative_1_state.geojson")
      .then(r => r.json())
      .then(d => {
        console.log("GeoJSON first feature properties:", d.features?.[0]?.properties);
        console.log("All state names:", d.features?.map((f: any) => f.properties));
        setGeoData(d.features || []);
      })
      .catch((e) => console.error("GeoJSON failed:", e));
  }, []);

  const sorted = useMemo(() =>
    data?.state ? [...data.state].sort((a: any, b: any) => a.date.localeCompare(b.date)) : []
  , [data]);

  const latestDate = sorted[sorted.length - 1]?.date;
  const latestData = sorted.filter((d: any) => d.date === latestDate);

  const findStateData = (stateName: string | undefined | null) => {
    if (!stateName) return null;
    return latestData.find((s: any) => s.state === stateName);
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

  const metricLabel = metric === "u_rate" ? t("state.unemploymentRate") : t("state.participationRate");
  const latestYear  = latestDate ? new Date(latestDate).getFullYear() : "";
  const latestMonth = latestDate ? new Date(latestDate).toLocaleString("en-MY", { month: "long" }) : "";

  const avgUnemployment = latestData.length
    ? (latestData.reduce((s: number, d: any) => s + (d.u_rate ?? 0), 0) / latestData.length).toFixed(1)
    : "0";
  const avgParticipation = latestData.length
    ? (latestData.reduce((s: number, d: any) => s + (d.p_rate ?? 0), 0) / latestData.length).toFixed(1)
    : "0";

  if (loading || !data?.state?.length) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-[600px] animate-pulse" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t("state.title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{latestMonth} {latestYear}</p>
          </div>
          <div className="flex gap-2 p-1 rounded-full bg-muted border border-border">
            {([
              { key: "u_rate" as Metric, label: "Unemployment" },
              { key: "p_rate" as Metric, label: "Participation" },
            ]).map(m => (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  metric === m.key
                    ? "bg-foreground text-background shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Avg Unemployment", value: `${avgUnemployment}%`, icon: TrendingDown, color: "text-red-500",    bg: "bg-red-500/10"    },
            { label: "Avg Participation", value: `${avgParticipation}%`, icon: TrendingUp, color: "text-green-500",  bg: "bg-green-500/10"  },
            { label: "Best Unemployment", value: `${Math.min(...latestData.map((d: any) => d.u_rate ?? 99))}%`, icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "States Tracked",   value: `${latestData.length}`, icon: MapPin,      color: "text-purple-500", bg: "bg-purple-500/10" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className={`rounded-xl ${kpi.bg} p-3 flex items-center gap-2`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color} flex-shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="lg:col-span-2 p-5 relative">
          <h3 className="text-sm font-semibold text-foreground mb-1">{metricLabel} Choropleth</h3>
          <p className="text-xs text-muted-foreground mb-3">Click a state to pin details • Hover to preview</p>

          {geoData.length > 0 ? (
            <div className="relative">
              <svg viewBox="0 0 800 400" className="w-full h-auto drop-shadow-sm">
                {geoData.map((feature, i) => {
                  const sd       = findStateData(feature.properties.state);
                  const value    = sd ? (sd[metric] ?? 0) : 0;
                  const color    = sd ? getColor(value, metric) : "#e5e7eb";
                  const isHovered  = hoveredState  === feature.properties.state;
                  const isSelected = selectedState === feature.properties.state;
                  return (
                    <path key={i}
                      d={getStatePath(feature.geometry)}
                      fill={color}
                      stroke={isSelected ? "#1e293b" : "white"}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.8}
                      opacity={
                        selectedState && !isSelected ? 0.45 :
                        hoveredState && !isHovered && !isSelected ? 0.6 : 1
                      }
                      className="cursor-pointer transition-all duration-150"
                      style={{ filter: isSelected || isHovered ? "brightness(1.1)" : "none" }}
                      onMouseEnter={() => setHoveredState(feature.properties.state)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState(prev =>
                        prev === feature.properties.state ? null : feature.properties.state
                      )}
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
                      className="absolute top-3 right-3 bg-card border border-border rounded-xl p-3 shadow-xl text-sm z-10 min-w-[180px]"
                    >
                      <p className="font-bold text-foreground mb-2">{sd.state}</p>
                      <div className="space-y-1">
                        {[
                          { label: "Unemployment", value: `${sd.u_rate}%` },
                          { label: "Participation", value: `${sd.p_rate}%` },
                          { label: "Labour Force",  value: `${sd.lf?.toLocaleString()}k` },
                        ].map(r => (
                          <div key={r.label} className="flex justify-between gap-4">
                            <span className="text-muted-foreground text-xs">{r.label}</span>
                            <span className="font-semibold text-foreground">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Legend */}
              <div className="mt-3 flex items-center justify-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Low</span>
                {["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"].map((c, i) => (
                  <div key={i} className="w-6 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">High</span>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Loading DOSM boundary data...
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="border-t lg:border-t-0 lg:border-l border-border p-5 flex flex-col">
          <AnimatePresence mode="wait">
            {selectedState && activeState ? (
              <motion.div key="detail"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">{activeState.state}</h3>
                  <button onClick={() => setSelectedState(null)}
                    className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-0.5">
                    ✕ Close
                  </button>
                </div>
                {[
                  { label: "Unemployment Rate", value: `${activeState.u_rate}%`,             color: getColor(activeState.u_rate, "u_rate") },
                  { label: "Participation Rate", value: `${activeState.p_rate}%`,             color: getColor(activeState.p_rate, "p_rate") },
                  { label: "Labour Force",       value: `${activeState.lf?.toLocaleString()}k`,      color: "#6366f1" },
                  { label: "Employed",           value: `${activeState.employed?.toLocaleString()}k`, color: "#22c55e" },
                  { label: "Unemployed",         value: `${activeState.unemployed?.toLocaleString()}k`, color: "#ef4444" },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <span className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</span>
                  </div>
                ))}
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Unemployment vs national avg ({avgUnemployment}%)</p>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((activeState.u_rate / 8) * 100, 100)}%`,
                        backgroundColor: getColor(activeState.u_rate, "u_rate"),
                      }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span><span>8%</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="rankings"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                <h3 className="text-sm font-semibold text-foreground">{metricLabel} Rankings</h3>
                <p className="text-xs text-muted-foreground mb-1">Click a state on the map for details</p>
                <div className="space-y-1.5 overflow-y-auto max-h-[420px] pr-1">
                  {rankedData.map((d: any, i: number) => {
                    const val    = d[metric] ?? 0;
                    const maxVal = metric === "u_rate" ? 8 : 85;
                    return (
                      <div key={d.state} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{d.state}</span>
                            <span className="text-xs font-bold" style={{ color: getColor(val, metric) }}>{val}%</span>
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

      <div className="px-5 pb-4">
        <p className="text-xs text-muted-foreground">
          Boundaries:{" "}
          <a href="https://github.com/dosm-malaysia/data-open" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            DOSM Open Data
          </a>{" · "}
          <a href="https://open.dosm.gov.my/data-catalogue/lfs_qtr_state" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            DOSM LFS Quarterly by State
          </a>
        </p>
      </div>
    </motion.div>
  );
};

export default StateMap;
