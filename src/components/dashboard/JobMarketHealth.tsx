import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Briefcase, Target, TrendingUp, TrendingDown,
  Lightbulb, Search, Loader2, BarChart3, Activity,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { latestStateData } from "@/data/labourData";
import { labourMarketData } from "@/data/labourMarketData";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ─── static data ─── */
const STATES = latestStateData.map(s => s.state).sort();

const INDUSTRIES = [
  "Technology",
  "Manufacturing",
  "Services",
  "Construction",
  "Agriculture",
  "Finance & Insurance",
  "Healthcare",
  "Education",
  "Retail & Trade",
  "Tourism & Hospitality",
] as const;

type Industry = typeof INDUSTRIES[number];

/* industry modifiers — simulate sector-specific adjustments */
const INDUSTRY_MOD: Record<Industry, { uMod: number; pMod: number; gMod: number; desc: string }> = {
  Technology:           { uMod: -0.8, pMod: 3,  gMod: 2.5, desc: "high demand for digital skills driving strong growth" },
  Manufacturing:        { uMod: 0.2,  pMod: 1,  gMod: 0.5, desc: "steady industrial output with moderate workforce expansion" },
  Services:             { uMod: -0.3, pMod: 2,  gMod: 1.5, desc: "broad service-sector recovery across consumer-facing industries" },
  Construction:         { uMod: 0.5,  pMod: -1, gMod: 0.8, desc: "infrastructure projects sustaining demand for skilled trades" },
  Agriculture:          { uMod: 0.8,  pMod: -2, gMod: -0.5, desc: "structural shifts reducing traditional farming employment" },
  "Finance & Insurance":{ uMod: -0.6, pMod: 2,  gMod: 1.8, desc: "fintech expansion and digital banking boosting opportunities" },
  Healthcare:           { uMod: -1.0, pMod: 3,  gMod: 2.0, desc: "sustained demand for medical professionals and allied health workers" },
  Education:            { uMod: -0.2, pMod: 1,  gMod: 0.5, desc: "stable public-sector employment with growing private tuition demand" },
  "Retail & Trade":     { uMod: 0.3,  pMod: 0,  gMod: 0.8, desc: "e-commerce growth offsetting traditional retail contraction" },
  "Tourism & Hospitality": { uMod: 0.6, pMod: -1, gMod: 1.2, desc: "tourism rebound creating seasonal and full-time roles" },
};

/* ─── score helpers ─── */
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function computeScore(uRate: number, pRate: number, growthPct: number) {
  const uScore = clamp((1 - uRate / 10) * 100, 0, 100);
  const pScore = clamp(((pRate - 55) / 25) * 100, 0, 100);
  const gScore = clamp(((growthPct + 3) / 6) * 100, 0, 100);
  return Math.round(uScore * 0.4 + pScore * 0.35 + gScore * 0.25);
}

function statusOf(score: number) {
  if (score >= 81) return { label: "Strong",     color: "#3b82f6", bg: "bg-blue-500/10  border-blue-500/30  text-blue-400" };
  if (score >= 61) return { label: "Healthy",    color: "#22c55e", bg: "bg-green-500/10 border-green-500/30 text-green-400" };
  if (score >= 41) return { label: "Recovering", color: "#eab308", bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" };
  return               { label: "Weak",        color: "#ef4444", bg: "bg-red-500/10   border-red-500/30   text-red-400" };
}

/* ─── component ─── */
const JobMarketHealth = () => {
  const { t } = useLanguage();
  const [state, setState] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<null | {
    score: number;
    uRate: number;
    pRate: number;
    growth: number;
    insight: string;
    suggestions: { icon: React.ReactNode; text: string }[];
    trendData: { label: string; value: number }[];
  }>(null);

  const analyse = useCallback(() => {
    if (!state || !industry) return;
    setAnalysing(true);
    setResult(null);

    // simulate brief loading
    setTimeout(() => {
      const stateRow = latestStateData.find(s => s.state === state)!;
      const mod = INDUSTRY_MOD[industry as Industry];

      const uRate = Math.max(0.5, +(stateRow.u_rate + mod.uMod).toFixed(1));
      const pRate = Math.min(85, Math.max(50, +(stateRow.p_rate + mod.pMod).toFixed(1)));

      // derive growth from national trend + mods
      const latest = labourMarketData[labourMarketData.length - 1];
      const growth = +((latest.employmentGrowthPercent ?? 0) + mod.gMod).toFixed(2);

      const score = clamp(computeScore(uRate, pRate, growth), 0, 100);
      const st = statusOf(score);

      // mini trend (last 12 months of national data + modifier)
      const last12 = labourMarketData.slice(-12);
      const trendData = last12.map(d => ({
        label: d.label,
        value: +(d.uRate + mod.uMod + (Math.random() * 0.4 - 0.2)).toFixed(1),
      }));

      // dynamic insight
      const insight = `The ${industry} sector in ${state} shows ${st.label.toLowerCase()} labour market conditions, with an adjusted unemployment rate of ${uRate}% and participation at ${pRate}%. This is driven by ${mod.desc}.`;

      // recommendations
      const allIndustries = Object.entries(INDUSTRY_MOD).map(([name, m]) => ({
        name,
        score: computeScore(
          Math.max(0.5, stateRow.u_rate + m.uMod),
          Math.min(85, Math.max(50, stateRow.p_rate + m.pMod)),
          (latest.employmentGrowthPercent ?? 0) + m.gMod,
        ),
      })).sort((a, b) => b.score - a.score);

      const suggestions: { icon: React.ReactNode; text: string }[] = [];
      const top = allIndustries[0];
      if (top.name !== industry) {
        suggestions.push({
          icon: <TrendingUp className="h-4 w-4 text-green-400" />,
          text: `Consider ${top.name} — strongest growth trend in ${state} (score ${top.score}).`,
        });
      }
      const weak = allIndustries[allIndustries.length - 1];
      if (weak.name !== industry) {
        suggestions.push({
          icon: <TrendingDown className="h-4 w-4 text-red-400" />,
          text: `${weak.name} shows slower recovery in ${state} (score ${weak.score}).`,
        });
      }
      const stable = allIndustries.find(
        i => i.name !== industry && i.score >= 55 && i.score <= 75,
      );
      if (stable) {
        suggestions.push({
          icon: <Lightbulb className="h-4 w-4 text-yellow-400" />,
          text: `${stable.name} sector has stable employment rates (score ${stable.score}).`,
        });
      }

      setResult({ score, uRate, pRate, growth, insight, suggestions, trendData });
      setAnalysing(false);
    }, 1200);
  }, [state, industry]);

  const status = result ? statusOf(result.score) : null;

  /* gauge geometry */
  const R = 80;
  const circ = Math.PI * R;
  const dash = result ? circ - (result.score / 100) * circ : circ;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.04) 50%, hsl(var(--card)) 100%)",
      }}
    >
      {/* glass glow */}
      <div className="absolute top-0 right-1/4 w-72 h-36 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 md:p-8 space-y-6">
        {/* ── Title ── */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/8 text-xs font-semibold text-primary tracking-widest uppercase mb-2">
            <Search className="h-3 w-3" /> {t("job.personalised")}
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-foreground">{t("job.title")}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("job.desc")}</p>
        </div>

        {/* ── Selectors ── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-full sm:w-56 bg-muted/50 border-border backdrop-blur">
              <MapPin className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder={t("job.selectState")} />
            </SelectTrigger>
            <SelectContent>
              {STATES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-full sm:w-56 bg-muted/50 border-border backdrop-blur">
              <Briefcase className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder={t("job.selectIndustry")} />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(i => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={analyse}
            disabled={!state || !industry || analysing}
            className="w-full sm:w-auto gap-2"
          >
            {analysing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("job.analysing")}
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                {t("job.analyze")}
              </>
            )}
          </Button>
        </div>

        {/* ── Empty state ── */}
        <AnimatePresence mode="wait">
          {!result && !analysing && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10 text-muted-foreground text-sm">
              {t("job.emptyState")}
            </motion.div>
          )}

          {/* ── Loading ── */}
          {analysing && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-10 space-y-3"
            >
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">{t("job.analyzingMarket")}</p>
            </motion.div>
          )}

          {/* ── Results ── */}
          {result && status && !analysing && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Score card */}
              <div
                className="rounded-2xl border border-border/60 p-6 relative overflow-hidden"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${status.color}10 0%, hsl(var(--card)) 70%)`,
                  boxShadow: `0 0 40px ${status.color}08`,
                }}
              >
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-3xl opacity-25 pointer-events-none"
                  style={{ backgroundColor: status.color }}
                />

                <div className="relative z-10">
                  {/* tags */}
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground border border-border">
                      <MapPin className="h-3 w-3 text-primary" /> {state}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground border border-border">
                      <Briefcase className="h-3 w-3 text-primary" /> {industry}
                    </span>
                  </div>

                  {/* gauge + number */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <svg width="220" height="125" viewBox="0 0 220 125">
                        <path
                          d={`M 20 118 A ${R} ${R} 0 0 1 200 118`}
                          fill="none"
                          stroke="hsl(var(--muted))"
                          strokeWidth="14"
                          strokeLinecap="round"
                        />
                        <motion.path
                          d={`M 20 118 A ${R} ${R} 0 0 1 200 118`}
                          fill="none"
                          stroke={status.color}
                          strokeWidth="14"
                          strokeLinecap="round"
                          strokeDasharray={circ}
                          initial={{ strokeDashoffset: circ }}
                          animate={{ strokeDashoffset: dash }}
                          transition={{ duration: 1.6, ease: "easeOut" }}
                          style={{ filter: `drop-shadow(0 0 8px ${status.color}60)` }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                        <motion.span
                          className="text-5xl font-black leading-none"
                          style={{ color: status.color }}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                        >
                          {result.score}
                        </motion.span>
                        <span className="text-xs text-muted-foreground font-medium">out of 100</span>
                      </div>
                    </div>
                  </div>

                  {/* status badge */}
                  <div className="flex justify-center mt-2">
                    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${status.bg}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* key metrics */}
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    {[
                      { label: t("job.unemployment"), value: `${result.uRate}%`, icon: <Target className="h-3.5 w-3.5" /> },
                      { label: t("job.participation"), value: `${result.pRate}%`, icon: <BarChart3 className="h-3.5 w-3.5" /> },
                      { label: t("job.growth"), value: `${result.growth > 0 ? "+" : ""}${result.growth}%`, icon: <TrendingUp className="h-3.5 w-3.5" /> },
                    ].map(m => (
                      <div key={m.label} className="text-center rounded-xl bg-muted/40 border border-border/40 py-3 px-2">
                        <div className="flex justify-center text-primary mb-1">{m.icon}</div>
                        <p className="text-lg font-bold text-foreground">{m.value}</p>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Insight */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1">{t("job.insight")}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.insight}</p>
                  </div>
                </div>
              </div>

              {/* Mini trend chart */}
              <div className="rounded-xl border border-border bg-card/80 p-4">
                <p className="text-xs font-bold text-foreground mb-3">
                  {t("job.trendTitle")} — {state} · {industry}
                </p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        domain={["dataMin - 0.5", "dataMax + 0.5"]}
                        width={35}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          color: "hsl(var(--foreground))",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(v: number) => [`${v}%`, "Unemployment"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={status.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">{t("job.suggestions")}</p>
                  {result.suggestions.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.12 }}
                      className="flex items-start gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground"
                    >
                      {s.icon}
                      <span>{s.text}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default JobMarketHealth;
