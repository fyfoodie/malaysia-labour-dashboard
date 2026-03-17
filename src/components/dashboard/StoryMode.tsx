import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

const StoryMode = () => {
  const { data } = useLabourData();
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
      title: "Employment Overview",
      body: "Malaysia experienced a gradual recovery in employment following the pandemic, with job numbers steadily increasing since 2021. The labour force has grown consistently over the years — a remarkable expansion driven by economic development and population growth.",
      chart: (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="lfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={11} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}M`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}M`]} />
            <Area type="monotone" dataKey="lf" name="Labour Force" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#lfGrad)" dot={false} />
            <Area type="monotone" dataKey="employed" name="Employed" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="none" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      emoji: "😷",
      title: "The COVID-19 Shock",
      body: "The pandemic caused Malaysia's unemployment rate to spike dramatically in 2020, reaching its highest level in decades. Movement control orders halted entire industries overnight, pushing hundreds of thousands out of work in a matter of months.",
      chart: (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="uGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={11} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Unemployment"]} />
            <Area type="monotone" dataKey="uRate" name="Unemployment Rate" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#uGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      emoji: "💪",
      title: "The Recovery",
      body: "From 2021 onwards, Malaysia's labour market staged an impressive recovery. Vaccination rollouts, economic reopening and targeted government interventions helped bring unemployment back down toward pre-pandemic levels by 2022.",
      chart: (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData.filter(d => d.label.includes("20") && parseInt(d.label.split(" ")[1]) >= 20)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={2} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Unemployment"]} />
            <Line type="monotone" dataKey="uRate" name="Unemployment" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      emoji: "🔮",
      title: "Where We Are Now",
      body: "Today, Malaysia's labour market shows resilience with unemployment at around 2.9% and labour force participation at 70.9%. However, challenges remain — skills mismatch affects over 11% of graduates, and regional disparities between states persist.",
      chart: (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData.slice(-36)}>
            <defs>
              <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={5} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "LFPR"]} />
            <Area type="monotone" dataKey="pRate" name="Participation Rate" stroke="hsl(var(--chart-4))" strokeWidth={2.5} fill="url(#pGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ];

  return (
    <>
      <button
        onClick={() => { setOpen(true); setStep(0); }}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
      >
        <Play className="h-4 w-4 fill-current" />
        Explain Malaysia Labour Trends
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "hsl(var(--background))", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Story Mode</span>
                  <span className="text-xs text-muted-foreground">{step + 1} / {stories.length}</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Story content */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {stories[step].emoji} {stories[step].title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {stories[step].body}
                    </p>
                    {stories[step].chart}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-border">
                <button
                  onClick={() => setStep(s => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                {/* Dots */}
                <div className="flex gap-1.5">
                  {stories.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-primary w-4" : "bg-muted-foreground/30"}`}
                    />
                  ))}
                </div>

                {step < stories.length - 1 ? (
                  <button
                    onClick={() => setStep(s => Math.min(stories.length - 1, s + 1))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all"
                  >
                    Done ✓
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
