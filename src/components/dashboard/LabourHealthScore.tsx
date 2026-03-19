import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";

const LabourHealthScore = () => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();

  const { score, status, statusColor, ringColor, description } = useMemo(() => {
    const fallback = {
      score: 0, status: "Loading", statusColor: "text-muted-foreground",
      ringColor: "hsl(var(--primary))", description: "Calculating...",
    };
    if (!data?.national?.length) return fallback;

    const national = [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latest = national[national.length - 1];
    const prev   = national[national.length - 2];

    const uScore = Math.max(0, Math.min(100, (1 - latest.u_rate / 10) * 100));
    const pScore = Math.max(0, Math.min(100, ((latest.p_rate - 60) / 15) * 100));
    const growthPercent = prev ? ((latest.employed - prev.employed) / prev.employed) * 100 : 0;
    const gScore = Math.max(0, Math.min(100, ((growthPercent + 2) / 4) * 100));
    const s = Math.max(0, Math.min(100, Math.round(uScore * 0.4 + pScore * 0.35 + gScore * 0.25)));

    let status: string, statusKey: string, statusColor: string, ringColor: string;
    if (s >= 81) {
      statusKey = "strong"; statusColor = "text-green-400"; ringColor = "#22c55e";
    } else if (s >= 61) {
      statusKey = "healthy"; statusColor = "text-emerald-400"; ringColor = "#10b981";
    } else if (s >= 41) {
      statusKey = "recovering"; statusColor = "text-yellow-400"; ringColor = "#eab308";
    } else {
      statusKey = "weak"; statusColor = "text-red-400"; ringColor = "#ef4444";
    }
    status = t(`health.${statusKey}`);
    const description = t(`health.${statusKey}.desc`);

    return { score: s, status, statusColor, ringColor, description };
  }, [data, t]);

  const R             = 88;
  const circumference = Math.PI * R;
  const dashOffset    = circumference - (score / 100) * circumference;

  if (loading) {
    return <div className="rounded-2xl bg-card border border-border p-6 h-52 animate-pulse" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border shadow-sm relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 60% 0%, ${ringColor}12 0%, hsl(var(--card)) 70%)` }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: ringColor }} />

      <div className="relative z-10 px-6 py-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{t("health.title")}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor} border-current/20 bg-current/5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {status}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4 ml-6">{description}</p>

        <div className="flex justify-center">
          <div className="relative">
            <svg width="240" height="135" viewBox="0 0 240 135">
              <path d={`M 16 128 A ${R + 8} ${R + 8} 0 0 1 224 128`} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="3 5" strokeLinecap="round" />
              <path d={`M 24 128 A ${R} ${R} 0 0 1 216 128`} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" strokeLinecap="round" />
              <motion.path d={`M 24 128 A ${R} ${R} 0 0 1 216 128`} fill="none" stroke={ringColor} strokeWidth="16" strokeLinecap="round"
                strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.8, ease: "easeOut" }} style={{ filter: `drop-shadow(0 0 6px ${ringColor}80)` }} />
              <text x="18"  y="128" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">0</text>
              <text x="222" y="128" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">100</text>
              <text x="120" y="22"  textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">50</text>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
              <motion.span className="text-6xl font-black leading-none" style={{ color: ringColor }}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200 }}>
                {score}
              </motion.span>
              <span className="text-xs text-muted-foreground font-medium">{t("health.outOf")}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-2">
          {[
            { label: t("health.weak"),       color: "#ef4444" },
            { label: t("health.recovering"), color: "#eab308" },
            { label: t("health.healthy"),    color: "#10b981" },
            { label: t("health.strong"),     color: "#22c55e" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default LabourHealthScore;
