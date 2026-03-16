import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { labourMarketData } from "@/data/labourMarketData";

const LabourHealthScore = () => {
  const { score, status, statusColor, description } = useMemo(() => {
    const latest = labourMarketData[labourMarketData.length - 1];
    const prev = labourMarketData[labourMarketData.length - 2];

    // Unemployment score: 0% = 100, 10% = 0
    const uScore = Math.max(0, Math.min(100, (1 - latest.uRate / 10) * 100));

    // LFPR score: 60% = 0, 75% = 100
    const pScore = Math.max(0, Math.min(100, ((latest.pRate - 60) / 15) * 100));

    // Employment growth score: -2% = 0, +2% = 100, centered at 0
    const growthPercent = prev ? ((latest.employed - prev.employed) / prev.employed) * 100 : 0;
    const gScore = Math.max(0, Math.min(100, ((growthPercent + 2) / 4) * 100));

    const combined = Math.round(uScore * 0.4 + pScore * 0.35 + gScore * 0.25);
    const s = Math.max(0, Math.min(100, combined));

    let status: string, statusColor: string, description: string;
    if (s >= 81) {
      status = "Strong"; statusColor = "text-green-400";
      description = "The labour market is performing exceptionally well with low unemployment and high participation.";
    } else if (s >= 61) {
      status = "Healthy"; statusColor = "text-emerald-400";
      description = "The labour market shows solid performance with steady employment growth.";
    } else if (s >= 41) {
      status = "Recovering"; statusColor = "text-yellow-400";
      description = "The labour market is in recovery, with gradual improvements in key indicators.";
    } else {
      status = "Weak"; statusColor = "text-red-400";
      description = "The labour market faces challenges with elevated unemployment or low participation.";
    }

    return { score: s, status, statusColor, description };
  }, []);

  // Gauge SVG parameters
  const radius = 80;
  const circumference = Math.PI * radius; // half circle
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl bg-card border border-border p-6 md:p-8 shadow-sm text-center relative overflow-hidden"
    >
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Malaysia Labour Health Index</h3>
        </div>

        {/* Gauge */}
        <div className="flex justify-center my-4">
          <div className="relative">
            <svg width="200" height="120" viewBox="0 0 200 120">
              {/* Background arc */}
              <path
                d="M 10 110 A 80 80 0 0 1 190 110"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Score arc */}
              <motion.path
                d="M 10 110 A 80 80 0 0 1 190 110"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              {/* Labels */}
              <text x="10" y="118" textAnchor="middle" className="text-[10px]" fill="hsl(var(--muted-foreground))">0</text>
              <text x="190" y="118" textAnchor="middle" className="text-[10px]" fill="hsl(var(--muted-foreground))">100</text>
            </svg>

            {/* Center score */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
              <motion.span
                className="text-4xl font-extrabold text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {score}
              </motion.span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/50 text-sm font-bold ${statusColor}`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            {status} Labour Market
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
        </div>

        {/* Score breakdown legend */}
        <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <span>0–40 Weak</span>
          <span>41–60 Recovering</span>
          <span>61–80 Healthy</span>
          <span>81–100 Strong</span>
        </div>
      </div>
    </motion.div>
  );
};

export default LabourHealthScore;
