import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Info } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
// Score calculation — 7 indicators from real DOSM data
//
// Weights chosen to reflect a holistic view of labour market health:
//   Unemployment Rate   25% — core signal, most tracked globally
//   Participation Rate  20% — engagement of working-age population
//   Employment Growth   15% — momentum (MoM change)
//   Youth Unemployment  15% — structural health & future pipeline
//   Skills Mismatch     10% — quality of employment (not just quantity)
//   Wage Level          10% — real household wellbeing
//   Unemployment Duration 5% — severity & hardship of joblessness
// ─────────────────────────────────────────────────────────────────────────────

interface IndicatorResult {
  label:      string;
  rawValue:   string;
  score:      number; // 0–100
  weight:     number; // 0–1
  direction:  "up" | "down"; // up = higher is better
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

const DashRing = ({
  score,
  ringColor,
  size = 240,
}: {
  score: number;
  ringColor: string;
  size?: number;
}) => {
  const R           = 90;
  const cx          = size / 2;
  const cy          = size * 0.533;
  const circumference = Math.PI * R;
  const dashOffset  = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size * 0.617} viewBox={`0 0 ${size} ${size * 0.617}`}>
      {/* Outer tick ring */}
      <path
        d={`M ${cx - (R + 10)} ${cy} A ${R + 10} ${R + 10} 0 0 1 ${cx + (R + 10)} ${cy}`}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="1"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
      {/* Background track */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth="16"
        strokeLinecap="round"
      />
      {/* Animated fill */}
      <motion.path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke={ringColor}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${ringColor}80)` }}
      />
      {/* End labels */}
      <text x={cx - (R + 10)} y={size * 0.617 - 3} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">0</text>
      <text x={cx + (R + 10)} y={size * 0.617 - 3} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">100</text>
      <text x={cx} y="14" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">50</text>
    </svg>
  );
};

const LabourHealthScore = () => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();

  const result = useMemo(() => {
    if (!data?.national?.length) return null;

    // ── 1. National data (sorted ascending by date) ────────────────────────
    const national = [...data.national].sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );
    const latest = national[national.length - 1];
    const prev   = national[national.length - 2];

    // ── 2. Unemployment Rate (25%) ─────────────────────────────────────────
    // Malaysia range: ~2.5% (excellent) → 5.5%+ (poor). Normalised to 0–100.
    const uRate       = latest.u_rate ?? 0;
    const uScore      = clamp(((5.5 - uRate) / (5.5 - 2.5)) * 100);

    // ── 3. Participation Rate (20%) ────────────────────────────────────────
    // Malaysia target 70%. Range: 60% (poor) → 75%+ (excellent).
    const pRate       = latest.p_rate ?? 0;
    const pScore      = clamp(((pRate - 60) / (75 - 60)) * 100);

    // ── 4. Employment Growth MoM (15%) ────────────────────────────────────
    // Month-over-month % change in employed persons.
    // Range: -0.5% (contraction) → +0.5% (strong growth).
    const growthPct   = prev
      ? ((latest.employed - prev.employed) / prev.employed) * 100
      : 0;
    const growthScore = clamp(((growthPct + 0.5) / 1.0) * 100);

    // ── 5. Youth Unemployment (15%) ───────────────────────────────────────
    // From lfs_month_youth. Latest entry, u_rate field.
    // Malaysia youth range: ~8% (good) → 20%+ (poor).
    let youthScore = 50; // default if data unavailable
    if (data.youth?.length) {
      const youthSorted = [...data.youth]
        .filter((d: any) => d.u_rate != null)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      const latestYouth = youthSorted[youthSorted.length - 1];
      if (latestYouth) {
        const yRate = latestYouth.u_rate;
        youthScore  = clamp(((20 - yRate) / (20 - 8)) * 100);
      }
    }

    // ── 6. Skills Mismatch Rate (10%) ─────────────────────────────────────
    // From lfs_qtr_sru_sex (mismatch). Field: u_skilled or sru_rate.
    // Lower mismatch = better. Range: 8% (good) → 20%+ (poor).
    let mismatchScore = 50;
    if (data.mismatch?.length) {
      const mSorted = [...data.mismatch]
        .filter((d: any) => d.date != null)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      // Get latest date entries, average across sex categories
      const latestDate = mSorted[mSorted.length - 1]?.date;
      const latestM    = mSorted.filter((d: any) => d.date === latestDate);
      // Try sru_rate (skills-related underemployment rate) field
      const rates = latestM
        .map((d: any) => d.sru_rate ?? d.u_skilled ?? null)
        .filter((v: any) => v != null);
      if (rates.length) {
        const avgRate = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
        mismatchScore = clamp(((20 - avgRate) / (20 - 8)) * 100);
      }
    }

    // ── 7. Wage / Household Income Level (10%) ────────────────────────────
    // From hh_income. Field: income_median.
    // Malaysia range: RM 3,000 (low) → RM 8,000+ (high).
    let wageScore = 50;
    if (data.wages?.length) {
      const wSorted = [...data.wages]
        .filter((d: any) => d.income_median != null)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      const latestW = wSorted[wSorted.length - 1];
      if (latestW) {
        wageScore = clamp(((latestW.income_median - 3000) / (8000 - 3000)) * 100);
      }
    }

    // ── 8. Unemployment Duration Score (5%) ───────────────────────────────
    // From lfs_month_duration. Proportion unemployed for < 3 months is positive.
    // Field: u_lt3m (unemployed < 3 months as % of total unemployed) — higher is better.
    let durationScore = 50;
    if (data.duration?.length) {
      const dSorted = [...data.duration]
        .filter((d: any) => d.date != null)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      const latestD = dSorted[dSorted.length - 1];
      if (latestD) {
        // Try various field names DOSM might use
        const shortTermPct =
          latestD.u_lt3m     ??  // < 3 months
          latestD.short_term ??
          latestD.lt3months  ??
          null;
        if (shortTermPct != null) {
          // Higher % of short-term unemployed = less structural unemployment = better
          durationScore = clamp((shortTermPct / 70) * 100);
        }
      }
    }

    // ── Composite score ────────────────────────────────────────────────────
    const composite = Math.round(
      uScore      * 0.25 +
      pScore      * 0.20 +
      growthScore * 0.15 +
      youthScore  * 0.15 +
      mismatchScore * 0.10 +
      wageScore   * 0.10 +
      durationScore * 0.05
    );

    // ── Status ─────────────────────────────────────────────────────────────
    let statusKey: string, statusColor: string, ringColor: string;
    if (composite >= 81) {
      statusKey = "strong";    statusColor = "text-green-400";   ringColor = "#22c55e";
    } else if (composite >= 61) {
      statusKey = "healthy";   statusColor = "text-emerald-400"; ringColor = "#10b981";
    } else if (composite >= 41) {
      statusKey = "recovering";statusColor = "text-yellow-400";  ringColor = "#eab308";
    } else {
      statusKey = "weak";      statusColor = "text-red-400";     ringColor = "#ef4444";
    }

    // ── Breakdown for display ──────────────────────────────────────────────
    const indicators: IndicatorResult[] = [
      {
        label:     "Unemployment Rate",
        rawValue:  `${uRate.toFixed(1)}%`,
        score:     Math.round(uScore),
        weight:    0.25,
        direction: "down",
      },
      {
        label:     "Participation Rate",
        rawValue:  `${pRate.toFixed(1)}%`,
        score:     Math.round(pScore),
        weight:    0.20,
        direction: "up",
      },
      {
        label:     "Employment Growth",
        rawValue:  `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(3)}%`,
        score:     Math.round(growthScore),
        weight:    0.15,
        direction: "up",
      },
      {
        label:     "Youth Unemployment",
        rawValue:  youthScore === 50 && !data.youth?.length ? "N/A" : `~${((20 - (youthScore / 100) * 12)).toFixed(1)}%`,
        score:     Math.round(youthScore),
        weight:    0.15,
        direction: "down",
      },
      {
        label:     "Skills Mismatch",
        rawValue:  mismatchScore === 50 ? "N/A" : `~${((20 - (mismatchScore / 100) * 12)).toFixed(1)}%`,
        score:     Math.round(mismatchScore),
        weight:    0.10,
        direction: "down",
      },
      {
        label:     "Household Income",
        rawValue:  wageScore === 50 && !data.wages?.length ? "N/A" : `RM ${Math.round(3000 + (wageScore / 100) * 5000).toLocaleString()}`,
        score:     Math.round(wageScore),
        weight:    0.10,
        direction: "up",
      },
      {
        label:     "Short-term Unemployed",
        rawValue:  durationScore === 50 ? "N/A" : `${Math.round((durationScore / 100) * 70)}%`,
        score:     Math.round(durationScore),
        weight:    0.05,
        direction: "up",
      },
    ];

    return {
      score:       clamp(composite),
      status:      t(`health.${statusKey}`),
      statusKey,
      statusColor,
      ringColor,
      description: t(`health.${statusKey}.desc`),
      indicators,
    };
  }, [data, t]);

  if (loading || !result) {
    return <div className="rounded-2xl bg-card border border-border p-6 h-52 animate-pulse" />;
  }

  const { score, status, statusColor, ringColor, description, indicators } = result;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border shadow-sm relative overflow-visible bg-card"
      style={{
        background: `radial-gradient(ellipse at 60% 0%, ${ringColor}12 0%, hsl(var(--card)) 70%)`,
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: ringColor }}
      />

      <div className="relative z-10 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{t("health.title")}</span>
            <div className="group relative flex items-center">
              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden w-[260px] p-3 bg-popover border border-border rounded-lg shadow-xl text-[11px] text-popover-foreground leading-relaxed group-hover:block z-50 pointer-events-none space-y-1">
                <p className="font-semibold text-foreground mb-1.5">7-Indicator Composite</p>
                {indicators.map(ind => (
                  <div key={ind.label} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{ind.label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 rounded-full bg-muted w-12 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${ind.score}%`, backgroundColor: ind.score >= 70 ? "#22c55e" : ind.score >= 50 ? "#eab308" : "#ef4444" }} />
                      </div>
                      <span className="font-bold text-foreground w-5 text-right tabular-nums">{Math.round(ind.weight * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor} border-current/20 bg-current/5`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {status}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4 ml-6">{description}</p>

        {/* Gauge */}
        <div className="flex justify-center">
          <div className="relative w-[240px] h-[148px]">
            <DashRing score={score} ringColor={ringColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-[18px] pointer-events-none">
              <motion.span
                className="text-6xl font-black leading-none tabular-nums"
                style={{ color: ringColor }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
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

        {/* Status legend */}
        <div className="flex justify-center gap-4 mt-2 mb-5">
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

        {/* Indicator breakdown — collapsible */}
        <details className="group border-t border-border/50 pt-3 mt-1">
          <summary className="flex items-center justify-between cursor-pointer list-none select-none">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Indicator Breakdown
            </span>
            <span className="text-[10px] text-muted-foreground group-open:hidden">Show ▾</span>
            <span className="text-[10px] text-muted-foreground hidden group-open:inline">Hide ▴</span>
          </summary>
          <div className="mt-3 space-y-2.5">
            {indicators.map((ind) => (
              <div key={ind.label} className="flex items-center gap-3">
                <div className="w-40 flex-shrink-0">
                  <span className="text-[11px] text-foreground font-medium leading-tight block">{ind.label}</span>
                  <span className="text-[10px] text-muted-foreground">{ind.rawValue} · {Math.round(ind.weight * 100)}%</span>
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: ind.score >= 70 ? "#22c55e" : ind.score >= 50 ? "#eab308" : "#ef4444" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${ind.score}%` }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[11px] font-bold w-7 text-right tabular-nums" style={{ color: ind.score >= 70 ? "#22c55e" : ind.score >= 50 ? "#eab308" : "#ef4444" }}>
                  {ind.score}
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </motion.div>
  );
};

export default LabourHealthScore;