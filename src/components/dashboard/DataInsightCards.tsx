import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, BarChart3, MapPin, Users } from "lucide-react";
import { labourMarketData } from "@/data/labourMarketData";
import { latestStateData } from "@/data/labourData";

interface Insight {
  icon: React.ReactNode;
  title: string;
  text: React.ReactNode;
}

const DataInsightCards = () => {
  const insights = useMemo<Insight[]>(() => {
    const latest = labourMarketData[labourMarketData.length - 1];
    const first = labourMarketData[0];

    // Highest unemployment state
    const worstState = [...latestStateData].sort((a, b) => b.unemploymentRate - a.unemploymentRate)[0];
    const bestState = [...latestStateData].sort((a, b) => a.unemploymentRate - b.unemploymentRate)[0];

    // Peak unemployment during COVID
    const peakUnemp = labourMarketData.reduce((max, d) => d.uRate > max.uRate ? d : max, labourMarketData[0]);

    // LFPR high
    const maxLFPR = labourMarketData.reduce((max, d) => d.pRate > max.pRate ? d : max, labourMarketData[0]);

    // Employment growth since first record
    const totalGrowth = (((latest.employed - first.employed) / first.employed) * 100).toFixed(1);

    return [
      {
        icon: <MapPin className="h-5 w-5" />,
        title: "Did You Know?",
        text: (
          <>
            <span className="font-bold text-primary">{worstState.state}</span> recorded the highest unemployment rate at{" "}
            <span className="font-bold text-primary">{worstState.unemploymentRate}%</span> among Malaysian states, while{" "}
            <span className="font-bold text-primary">{bestState.state}</span> has the lowest at{" "}
            <span className="font-bold text-primary">{bestState.unemploymentRate}%</span>.
          </>
        ),
      },
      {
        icon: <TrendingUp className="h-5 w-5" />,
        title: "Interesting Trend",
        text: (
          <>
            Malaysia's LFPR reached its highest level of{" "}
            <span className="font-bold text-primary">{maxLFPR.pRate}%</span> in{" "}
            <span className="font-bold text-primary">{maxLFPR.label}</span>, showing more people entering the workforce than ever.
          </>
        ),
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        title: "Job Market Insight",
        text: (
          <>
            Employment has grown by <span className="font-bold text-primary">{totalGrowth}%</span> since{" "}
            {first.label}, with the workforce expanding from{" "}
            <span className="font-bold text-primary">{first.employedMillion}M</span> to{" "}
            <span className="font-bold text-primary">{latest.employedMillion}M</span> workers.
          </>
        ),
      },
      {
        icon: <Users className="h-5 w-5" />,
        title: "Pandemic Impact",
        text: (
          <>
            Unemployment peaked at <span className="font-bold text-primary">{peakUnemp.uRate}%</span> in{" "}
            <span className="font-bold text-primary">{peakUnemp.label}</span> during the pandemic, but has since recovered to{" "}
            <span className="font-bold text-primary">{latest.uRate}%</span>.
          </>
        ),
      },
    ];
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="relative group rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
        >
          {/* Glow border effect */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ring-1 ring-primary/30" />
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 text-primary">
                {insight.icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {insight.title}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {insight.text}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default DataInsightCards;
