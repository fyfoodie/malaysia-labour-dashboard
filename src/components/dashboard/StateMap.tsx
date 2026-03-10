import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { latestStateData } from "@/data/labourData";

type Metric = "unemploymentRate" | "participationRate";

const STATE_NAME_MAP: Record<string, string> = {
  "Kedah": "Kedah", "Pulau Pinang": "Pulau Pinang", "Perak": "Perak", "Perlis": "Perlis",
  "Selangor": "Selangor", "Negeri Sembilan": "Negeri Sembilan", "Melaka": "Melaka",
  "Johor": "Johor", "Pahang": "Pahang", "Terengganu": "Terengganu", "Kelantan": "Kelantan",
  "Sabah": "Sabah", "Sarawak": "Sarawak", "W.P. Kuala Lumpur": "W.P. Kuala Lumpur",
  "W.P. Putrajaya": "W.P. Putrajaya", "W.P. Labuan": "W.P. Labuan",
};

const getColor = (value: number, metric: Metric): string => {
  if (metric === "unemploymentRate") {
    if (value <= 2.5) return "hsl(120, 40%, 50%)";
    if (value <= 3.0) return "hsl(80, 50%, 50%)";
    if (value <= 3.5) return "hsl(45, 80%, 55%)";
    if (value <= 4.5) return "hsl(25, 80%, 55%)";
    return "hsl(0, 70%, 55%)";
  }
  if (value >= 73) return "hsl(120, 40%, 50%)";
  if (value >= 70) return "hsl(80, 50%, 50%)";
  if (value >= 67) return "hsl(45, 80%, 55%)";
  if (value >= 64) return "hsl(25, 80%, 55%)";
  return "hsl(0, 70%, 55%)";
};

interface GeoFeature {
  type: string;
  id: string;
  properties: { name: string; state: string };
  geometry: { type: string; coordinates: number[][][][] };
}

const StateMap = () => {
  const [metric, setMetric] = useState<Metric>("unemploymentRate");
  const [geoData, setGeoData] = useState<GeoFeature[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  useEffect(() => {
    fetch("/malaysia-states.geojson")
      .then(r => r.json())
      .then(data => setGeoData(data.features || []))
      .catch(() => {});
  }, []);

  const sortedData = useMemo(() => {
    return [...latestStateData].sort((a, b) => b[metric] - a[metric]);
  }, [metric]);

  const metricLabel = metric === "unemploymentRate" ? "Unemployment Rate" : "Labour Force Participation Rate";

  const projectPoint = (lon: number, lat: number): [number, number] => {
    const minLon = 99.5, maxLon = 119.5, minLat = 0.8, maxLat = 7.5;
    const width = 800, height = 400;
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return [x, y];
  };

  const getPathFromCoords = (coords: number[][]) => {
    return coords.map((point, i) => {
      const [x, y] = projectPoint(point[0], point[1]);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + 'Z';
  };

  const getStatePath = (geometry: GeoFeature['geometry']) => {
    const paths: string[] = [];
    if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => { paths.push(getPathFromCoords(ring)); });
      });
    } else if (geometry.type === 'Polygon') {
      (geometry.coordinates as unknown as number[][][]).forEach(ring => {
        paths.push(getPathFromCoords(ring));
      });
    }
    return paths.join(' ');
  };

  const findStateData = (name: string) => {
    const mapped = Object.entries(STATE_NAME_MAP).find(([key]) =>
      name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())
    );
    if (mapped) return latestStateData.find(s => s.state === mapped[1]);
    return latestStateData.find(s =>
      s.state.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(s.state.toLowerCase())
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">State-Level Labour Market</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Compare employment conditions across Malaysia's states — Q3 2025 data.
          </p>
        </div>
        <div className="flex gap-2">
          {([
            { key: "unemploymentRate" as Metric, label: "Unemployment" },
            { key: "participationRate" as Metric, label: "Participation" },
          ]).map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                metric === m.key ? "bg-foreground text-background shadow-md" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">{metricLabel} by State</h3>
          <p className="text-xs text-muted-foreground mb-4">Q3 2025 — Hover over a state for details</p>
          {geoData.length > 0 ? (
            <div className="relative">
              <svg viewBox="0 0 800 400" className="w-full h-auto">
                {geoData.map((feature, i) => {
                  const stateData = findStateData(feature.properties.name);
                  const value = stateData ? stateData[metric] : 0;
                  const color = getColor(value, metric);
                  const isHovered = hoveredState === feature.properties.name;
                  return (
                    <path key={i} d={getStatePath(feature.geometry)} fill={color}
                      stroke="hsl(var(--background))" strokeWidth={isHovered ? 2 : 0.5}
                      opacity={hoveredState && !isHovered ? 0.5 : 1}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredState(feature.properties.name)}
                      onMouseLeave={() => setHoveredState(null)}
                    />
                  );
                })}
              </svg>
              {hoveredState && (() => {
                const sd = findStateData(hoveredState);
                if (!sd) return null;
                return (
                  <div className="absolute top-2 left-2 bg-card border border-border rounded-xl p-3 shadow-lg text-sm z-10">
                    <p className="font-semibold text-foreground">{sd.state}</p>
                    <p className="text-muted-foreground">Unemployment: <strong className="text-foreground">{sd.unemploymentRate}%</strong></p>
                    <p className="text-muted-foreground">LFPR: <strong className="text-foreground">{sd.participationRate}%</strong></p>
                    <p className="text-muted-foreground">Labour Force: <strong className="text-foreground">{sd.labourForce.toLocaleString()}k</strong></p>
                  </div>
                );
              })()}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center flex-wrap">
                {metric === "unemploymentRate" ? (
                  <>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(120, 40%, 50%)" }} /> ≤2.5%</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(80, 50%, 50%)" }} /> 2.5-3.0%</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(45, 80%, 55%)" }} /> 3.0-3.5%</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(25, 80%, 55%)" }} /> 3.5-4.5%</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(0, 70%, 55%)" }} /> &gt;4.5%</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(120, 40%, 50%)" }} /> ≥73%</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(80, 50%, 50%)" }} /> 70-73%</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(45, 80%, 55%)" }} /> 67-70%</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(25, 80%, 55%)" }} /> 64-67%</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(0, 70%, 55%)" }} /> &lt;64%</div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading map...</div>
          )}
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-1">State Rankings</h3>
          <p className="text-xs text-muted-foreground mb-4">States ranked by {metricLabel.toLowerCase()}</p>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }}
                  formatter={(value: number) => [`${value}%`, metricLabel]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey={metric} radius={[0, 6, 6, 0]} barSize={18}>
                  {sortedData.map((entry) => (
                    <Cell key={entry.state} fill={getColor(entry[metric], metric)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StateMap;
