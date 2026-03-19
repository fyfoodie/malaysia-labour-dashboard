import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

const StoryMode = () => {
  const { data } = useLabourData();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const national = data?.national
    ? [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date))
    : [];

  const chartData = national.map((d: any) => ({
    label: new Date(d.date).toLocaleDateString("en-MY", { month: "short", year: "2-digit" }),
    lf:       +(d.lf / 1000).toFixed(2),
    employed: +(d.employed / 1000).toFixed(2),
    uRate:    d.u_rate ?? 0,
    pRate:    d.p_rate ?? 0,
  }));

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    fontSize: "12px",
    color: "hsl(var(--foreground))",
  };

  const stories = [
    {
      emoji: "📈",
      title: t("story.s1.title"),
      body: t("story.s1.body"),
      chart: (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="lfGradS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={11} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}M`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}M`]} />
            <Area type="monotone" dataKey="lf" name={t("trends.labourForce")} stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#lfGradS)" dot={false} />
            <Area type="monotone" dataKey="employed" name={t("trends.employed")} stroke="hsl(var(--chart-3))" strokeWidth={2} fill="none" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      emoji: "😷",
      title: t("story.s2.title"),
      body: t("story.s2.body"),
      chart: (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="uGradS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={11} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, t("trends.unemployment")]} />
            <Area type="monotone" dataKey="uRate" name={t("trends.unemploymentRate")} stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#uGradS)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      emoji: "💪",
      title: t("story.s3.title"),
      body: t("story.s3.body"),
      chart: (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData.filter(d => d.label.includes("20") && parseInt(d.label.split(" ")[1]) >= 20)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={2} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, t("trends.unemployment")]} />
            <Line type="monotone" dataKey="uRate" name={t("trends.unemployment")} stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      emoji: "🔮",
      title: t("story.s4.title"),
      body: t("story.s4.body"),
      chart: (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData.slice(-36)}>
            <defs>
              <linearGradient id="pGradS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={5} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, t("trends.participationRate")]} />
            <Area type="monotone" dataKey="pRate" name={t("trends.participationRate")} stroke="hsl(var(--chart-4))" strokeWidth={2.5} fill="url(#pGradS)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ];

  return (
    <>
      <button onClick={() => { setOpen(true); setStep(0); }}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
        <Play className="h-4 w-4 fill-current" />
        {t("story.button")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "hsl(var(--background))", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">{t("story.title")}</span>
                  <span className="text-xs text-muted-foreground">{step + 1} / {stories.length}</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                    <h3 className="text-lg font-bold text-foreground mb-2">{stories[step].emoji} {stories[step].title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{stories[step].body}</p>
                    {stories[step].chart}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="h-4 w-4" />
                  {t("story.previous")}
                </button>
                <div className="flex gap-1.5">
                  {stories.map((_, i) => (
                    <button key={i} onClick={() => setStep(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-primary w-4" : "bg-muted-foreground/30"}`} />
                  ))}
                </div>
                {step < stories.length - 1 ? (
                  <button onClick={() => setStep(s => Math.min(stories.length - 1, s + 1))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all">
                    {t("story.next")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all">
                    {t("story.done")}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StoryMode;
