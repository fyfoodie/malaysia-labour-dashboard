import { useMemo } from "react";
import { motion } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { Lightbulb, TrendingUp, BarChart2, AlertTriangle } from "lucide-react";

const DataInsightCards = () => {
  const { data, loading } = useLabourData();

  const insights = useMemo(() => {
    if (!data?.national?.length || !data?.state?.length) return [];

    const national = [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latest   = national[national.length - 1];
    const first    = national[0];

    // State with highest and lowest unemployment
    const stateLatest = data.state
      .filter((d: any) => d.date === data.state[data.state.length - 1]?.date)
      .sort((a: any, b: any) => b.u_rate - a.u_rate);
    const highestState = stateLatest[0];
    const lowestState  = stateLatest[stateLatest.length - 1];

    // LFPR peak
    const peakLFPR = national.reduce((m: any, d: any) => d.p_rate > m.p_rate ? d : m, national[0]);
    const peakLFPRDate = new Date(peakLFPR.date).toLocaleString("en-MY", { month: "short", year: "numeric" });

    // Employment growth
    const growthPct = (((latest.employed - first.employed) / first.employed) * 100).toFixed(1);
    const firstEmp  = (first.employed / 1000).toFixed(1);
    const latestEmp = (latest.employed / 1000).toFixed(1);
    const latestDate = new Date(latest.date).toLocaleString("en-MY", { month: "short", year: "numeric" });

    // COVID peak unemployment
    const covidPeak = national.reduce((m: any, d: any) => d.u_rate > m.u_rate ? d : m, national[0]);
    const covidDate = new Date(covidPeak.date).toLocaleString("en-MY", { month: "short", year: "numeric" });

    return [
      {
        icon: Lightbulb,
        tag: "DID YOU KNOW?",
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        content: (
          <p className="text-sm text-foreground leading-relaxed">
            <strong className="text-primary">{highestState?.state}</strong> recorded the highest
            unemployment at <strong className="text-primary">{highestState?.u_rate}%</strong>, while{" "}
            <strong className="text-primary">{lowestState?.state}</strong> has the lowest at{" "}
            <strong className="text-primary">{lowestState?.u_rate}%</strong>.
          </p>
        ),
      },
      {
        icon: TrendingUp,
        tag: "INTERESTING TREND",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        content: (
          <p className="text-sm text-foreground leading-relaxed">
            Malaysia's LFPR reached its highest level of{" "}
            <strong className="text-primary">{peakLFPR.p_rate}%</strong> in{" "}
            <strong className="text-primary">{peakLFPRDate}</strong>, showing more people
            entering the workforce than ever.
          </p>
        ),
      },
      {
        icon: BarChart2,
        tag: "JOB MARKET INSIGHT",
        color: "text-green-500",
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        content: (
          <p className="text-sm text-foreground leading-relaxed">
            Employment has grown by{" "}
            <strong className="text-primary">+{growthPct}%</strong> since the first recorded month,
            expanding from <strong className="text-primary">{firstEmp}M</strong> to{" "}
            <strong className="text-primary">{latestEmp}M</strong> workers.
          </p>
        ),
      },
      {
        icon: AlertTriangle,
        tag: "PANDEMIC IMPACT",
        color: "text-red-500",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        content: (
          <p className="text-sm text-foreground leading-relaxed">
            Unemployment peaked at{" "}
            <strong className="text-primary">{covidPeak.u_rate}%</strong> in{" "}
            <strong className="text-primary">{covidDate}</strong> during the pandemic, but has
            since recovered to{" "}
            <strong className="text-primary">{latest.u_rate}%</strong> as of {latestDate}.
          </p>
        ),
      },
    ];
  }, [data]);

  if (loading || !insights.length) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-card border border-border p-5 h-36 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {insights.map((insight, index) => (
        <motion.div
          key={insight.tag}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className={`rounded-2xl bg-card border ${insight.border} p-5 shadow-sm hover:shadow-md transition-all duration-300`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${insight.bg}`}>
              <insight.icon className={`h-3.5 w-3.5 ${insight.color}`} />
            </div>
            <span className={`text-xs font-bold tracking-wider ${insight.color}`}>
              {insight.tag}
            </span>
          </div>
          {insight.content}
        </motion.div>
      ))}
    </div>
  );
};

export default DataInsightCards;
