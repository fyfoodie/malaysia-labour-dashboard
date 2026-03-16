import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, X, Play } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { labourMarketData } from "@/data/labourMarketData";
import { latestStateData } from "@/data/labourData";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "13px",
  color: "hsl(var(--foreground))",
};
const tickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

interface StorySlide {
  title: string;
  description: string;
  chart: React.ReactNode;
}

const StoryModeButton = ({ onClick }: { onClick: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg transition-all"
  >
    <Play className="h-4 w-4" />
    Explain Malaysia Labour Trends
  </motion.button>
);

const StoryMode = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const postCovid = labourMarketData.filter(d => d.year >= 2020);
  const sortedStates = [...latestStateData].sort((a, b) => b.unemploymentRate - a.unemploymentRate);
  const topStates = sortedStates.slice(0, 8);

  const slides: StorySlide[] = [
    {
      title: "📈 Employment Overview",
      description:
        "Malaysia experienced a gradual recovery in employment following the pandemic, with job numbers steadily increasing since 2021. The labour force has grown from 12.4M in 2010 to over 17M workers today — a remarkable expansion driven by economic development and population growth.",
      chart: (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={labourMarketData.filter((_, i) => i % 3 === 0)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={tickStyle} interval={20} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={tickStyle} tickFormatter={v => `${v}M`} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="employedMillion" name="Employed (M)" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="lfMillion" name="Labour Force (M)" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "📉 Unemployment Trends",
      description:
        "Unemployment spiked to 5.2% in May 2020 due to COVID-19 lockdowns — the highest in decades. Since then, it has steadily declined back to around 3.0%, matching pre-pandemic levels. The recovery took nearly 3 years to fully materialize.",
      chart: (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={postCovid}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={tickStyle} interval={5} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={tickStyle} domain={[2.5, 5.5]} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={3.3} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Pre-COVID", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Line type="monotone" dataKey="uRate" name="Unemployment %" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "🗺️ State Comparison",
      description:
        `${topStates[0].state} has the highest unemployment rate at ${topStates[0].unemploymentRate}%, significantly above the national average. In contrast, states like ${sortedStates[sortedStates.length - 1].state} enjoy much lower unemployment at ${sortedStates[sortedStates.length - 1].unemploymentRate}%. Regional disparities remain a key challenge.`,
      chart: (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topStates} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={tickStyle} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="state" tick={tickStyle} width={120} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`]} />
            <Bar dataKey="unemploymentRate" name="Unemployment %" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "👥 Labour Participation",
      description:
        "Labour force participation rate (LFPR) has climbed steadily from around 64% in 2010 to over 71% recently — meaning more working-age Malaysians are actively employed or seeking work. This is a positive sign of economic engagement and workforce inclusion.",
      chart: (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={labourMarketData.filter((_, i) => i % 3 === 0)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={tickStyle} interval={20} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={tickStyle} domain={[62, 72]} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="pRate" name="LFPR %" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
  ];

  const next = useCallback(() => setCurrentSlide(c => Math.min(c + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setCurrentSlide(c => Math.max(c - 1, 0)), []);

  useEffect(() => {
    if (!isOpen) setCurrentSlide(0);
  }, [isOpen]);

  return (
    <>
      <StoryModeButton onClick={() => setIsOpen(true)} />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-bold text-foreground">Story Mode</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {currentSlide + 1} / {slides.length}
                  </span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div ref={containerRef} className="p-6 md:p-8 min-h-[450px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-bold text-foreground mb-3">{slides[currentSlide].title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-2xl">
                      {slides[currentSlide].description}
                    </p>
                    <div className="rounded-xl bg-muted/30 border border-border p-4">
                      {slides[currentSlide].chart}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <button
                  onClick={prev}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed text-foreground hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                {/* Progress dots */}
                <div className="flex gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === currentSlide ? "bg-primary scale-125" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={currentSlide === slides.length - 1 ? () => setIsOpen(false) : next}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-primary text-primary-foreground hover:opacity-90"
                >
                  {currentSlide === slides.length - 1 ? "Finish" : "Next"} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StoryMode;
