import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { regionalJobs } from "@/data/labourData";

const DEMAND_COLORS: Record<string, string> = {
  "Kuala Lumpur": "hsl(0, 70%, 55%)",
  "Selangor": "hsl(15, 80%, 55%)",
  "Penang": "hsl(0, 80%, 50%)",
  "Johor": "hsl(25, 80%, 55%)",
  "Sarawak": "hsl(45, 80%, 55%)",
  "Sabah": "hsl(45, 80%, 55%)",
  "Perak": "hsl(80, 50%, 50%)",
  "Melaka": "hsl(80, 50%, 50%)",
  "Negeri Sembilan": "hsl(80, 50%, 50%)",
};

const GEO_NAME_MAP: Record<string, string> = {
  "Kuala Lumpur": "W.P. Kuala Lumpur",
  "Penang": "Pulau Pinang",
};

interface GeoFeature {
  type: string;
  properties: { name: string };
  geometry: { type: string; coordinates: number[][][][] };
}

const RegionalJobsMap = () => {
  const [geoData, setGeoData] = useState<GeoFeature[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  useEffect(() => {
    fetch("/malaysia-states.geojson")
      .then(r => r.json())
      .then(data => setGeoData(data.features || []))
      .catch(() => {});
  }, []);

  const barData = regionalJobs.map(r => ({
    state: r.state,
    avgSalary: (r.salaryMin + r.salaryMax) / 2,
    salaryMin: r.salaryMin,
    salaryMax: r.salaryMax,
  })).sort((a, b) => b.avgSalary - a.avgSalary);

  const projectPoint = (lon: number, lat: number): [number, number] => {
    const minLon = 99.5, maxLon = 119.5, minLat = 0.8, maxLat = 7.5;
    const x = ((lon - minLon) / (maxLon - minLon)) * 800;
    const y = 400 - ((lat - minLat) / (maxLat - minLat)) * 400;
    return [x, y];
  };

  const getPathFromCoords = (coords: number[][]) =>
    coords.map((point, i) => {
      const [x, y] = projectPoint(point[0], point[1]);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + 'Z';

  const getStatePath = (geometry: GeoFeature['geometry']) => {
    const paths: string[] = [];
    if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => polygon.forEach(ring => paths.push(getPathFromCoords(ring))));
    } else if (geometry.type === 'Polygon') {
      (geometry.coordinates as unknown as number[][][]).forEach(ring => paths.push(getPathFromCoords(ring)));
    }
    return paths.join(' ');
  };

  const findRegionalData = (geoName: string) => {
    return regionalJobs.find(r => {
      const mapped = GEO_NAME_MAP[r.state] || r.state;
      return geoName.toLowerCase().includes(mapped.toLowerCase()) || mapped.toLowerCase().includes(geoName.toLowerCase())
        || geoName.toLowerCase().includes(r.state.toLowerCase()) || r.state.toLowerCase().includes(geoName.toLowerCase());
    });
  };

  const getStateColor = (geoName: string) => {
    const data = findRegionalData(geoName);
    if (!data) return "hsl(var(--muted))";
    return DEMAND_COLORS[data.state] || "hsl(var(--muted))";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border p-5 md:p-6 shadow-sm"
    >
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Regions with Strong Job Opportunities</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Explore which regions in Malaysia offer the best job demand and salary ranges.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Job Demand Map</h3>
          {geoData.length > 0 ? (
            <div className="relative">
              <svg viewBox="0 0 800 400" className="w-full h-auto">
                {geoData.map((feature, i) => {
                  const isHovered = hoveredState === feature.properties.name;
                  const color = getStateColor(feature.properties.name);
                  return (
                    <path key={i} d={getStatePath(feature.geometry)} fill={color}
                      stroke="hsl(var(--background))" strokeWidth={isHovered ? 2 : 0.5}
                      opacity={hoveredState && !isHovered ? 0.4 : 1}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredState(feature.properties.name)}
                      onMouseLeave={() => setHoveredState(null)}
                    />
                  );
                })}
              </svg>
              {hoveredState && (() => {
                const rd = findRegionalData(hoveredState);
                if (!rd) return (
                  <div className="absolute top-2 left-2 bg-card border border-border rounded-xl p-3 shadow-lg text-sm z-10">
                    <p className="font-semibold text-foreground">{hoveredState}</p>
                    <p className="text-muted-foreground text-xs">No specific data available</p>
                  </div>
                );
                return (
                  <div className="absolute top-2 left-2 bg-card border border-border rounded-xl p-3 shadow-lg text-sm z-10 max-w-[260px]">
                    <p className="font-semibold text-foreground">{rd.state}</p>
                    <p className="text-muted-foreground text-xs mt-1">{rd.demand}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Salary: <strong className="text-foreground">RM {(rd.salaryMin / 1000).toFixed(0)}k – RM {(rd.salaryMax / 1000).toFixed(0)}k</strong> / year
                    </p>
                  </div>
                );
              })()}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center flex-wrap">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(0, 70%, 55%)" }} /> High Demand</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(25, 80%, 55%)" }} /> Growing</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(45, 80%, 55%)" }} /> Moderate</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(80, 50%, 50%)" }} /> Steady</div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading map...</div>
          )}
        </div>

        {/* Salary bar chart */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Average Salary by Region (MYR/year)</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `RM${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "13px" }}
                  formatter={(value: number, name: string) => {
                    const item = barData.find(d => d.avgSalary === value);
                    return [`RM ${item?.salaryMin?.toLocaleString()} – RM ${item?.salaryMax?.toLocaleString()}`, "Salary Range"];
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="avgSalary" radius={[0, 6, 6, 0]} barSize={20}>
                  {barData.map((entry) => (
                    <Cell key={entry.state} fill={DEMAND_COLORS[entry.state] || "hsl(var(--chart-1))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detail cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {regionalJobs.map(r => (
          <div key={r.state} className="rounded-xl border border-border p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
            <p className="font-semibold text-foreground text-sm">{r.state}</p>
            <p className="text-xs text-muted-foreground mt-1">{r.demand}</p>
            <p className="text-xs font-medium text-foreground mt-1">
              RM {(r.salaryMin / 1000).toFixed(0)}k – RM {(r.salaryMax / 1000).toFixed(0)}k / year
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Source: <a href="https://www.y-axis.com/job-outlook/malaysia/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Y-Axis Job Outlook Malaysia</a>
      </p>
    </motion.div>
  );
};

export default RegionalJobsMap;
