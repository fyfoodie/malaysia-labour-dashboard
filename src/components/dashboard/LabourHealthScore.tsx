import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Info } from "lucide-react";
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

  const R = 90;
  const cx = 120;
  const cy = 128;
  const circumference = Math.PI * R;
  const dashOffset = circumference - (score / 100) * circumference;

  if (loading) {
    return <div className="rounded-2xl bg-card border border-border p-6 h-52 animate-pulse" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border shadow-sm relative overflow-visible bg-card"
      style={{ background: `radial-gradient(ellipse at 60% 0%, ${ringColor}12 0%, hsl(var(--card)) 70%)` }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: ringColor }} />

      <div className="relative z-10 px-6 py-6">
        <div className="flex items-center justify-between mb-1">
          
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{t("health.title")}</span>
            
            <div className="group relative flex items-center">
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden w-[280px] p-3 bg-popover border border-border rounded-lg shadow-xl text-[11px] text-popover-foreground leading-relaxed group-hover:block z-50 pointer-events-none">
                Score is calculated using a weighted average: <strong className="text-foreground">Unemployment Rate (40%)</strong>, <strong className="text-foreground">Participation Rate (35%)</strong>, and <strong className="text-foreground">Employment Growth (25%)</strong>.
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor} border-current/20 bg-current/5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {status}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4 ml-6">{description}</p>

        <div className="flex justify-center mt-6">
          <div className="relative w-[240px] h-[148px]">
            
            <svg width="240" height="148" viewBox="0 0 240 148">
              <path d={`M ${cx - (R + 10)} ${cy} A ${R + 10} ${R + 10} 0 0 1 ${cx + (R + 10)} ${cy}`} fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="3 5" strokeLinecap="round" />
              <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" strokeLinecap="round" />
              <motion.path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke={ringColor} strokeWidth="16" strokeLinecap="round"
                strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.8, ease: "easeOut" }} style={{ filter: `drop-shadow(0 0 6px ${ringColor}80)` }} />
              
              <text x={cx - (R + 10)} y="145" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">0</text>
              <text x={cx + (R + 10)} y="145" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">100</text>
              <text x={cx} y="20" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">50</text>
            </svg>

            {/* FIX APPLIED HERE: Using inset-0 to perfectly map the parent box */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-[1.5rem] pointer-events-none">
              <motion.span 
                className="text-6xl font-black leading-none tabular-nums" 
                style={{ color: ringColor }}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
              >
                {score}
              </motion.span>
              <span className="text-xs text-muted-foreground font-medium mt-1">
                {t("health.outOf")}
              </span>
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