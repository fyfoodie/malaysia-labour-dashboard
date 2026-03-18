import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { labourMarketData } from "@/data/labourMarketData";
import { latestStateData } from "@/data/labourData";

interface Alert {
  type: "warning" | "positive" | "info";
  icon: React.ReactNode;
  text: string;
}

const alertStyles = {
  warning: "border-red-500/30 bg-red-500/10 text-red-400",
  positive: "border-green-500/30 bg-green-500/10 text-green-400",
  info: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
};

const TrendAlerts = () => {
  const alerts = useMemo<Alert[]>(() => {
    const latest = labourMarketData[labourMarketData.length - 1];
    const prev = labourMarketData[labourMarketData.length - 2];
    const threeMonthsAgo = labourMarketData[labourMarketData.length - 4];
    const result: Alert[] = [];

    // Unemployment trend (3-month)
    if (latest.uRate > threeMonthsAgo.uRate) {
      result.push({
        type: "warning",
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `Unemployment rate rose from ${threeMonthsAgo.uRate}% to ${latest.uRate}% over the past 3 months.`,
      });
    } else if (latest.uRate < threeMonthsAgo.uRate) {
      result.push({
        type: "positive",
        icon: <TrendingDown className="h-4 w-4" />,
        text: `Unemployment rate dropped from ${threeMonthsAgo.uRate}% to ${latest.uRate}% over the past 3 months.`,
      });
    }

    // States with high unemployment
    const highUnempStates = latestStateData.filter(s => s.u_rate > 4);
    if (highUnempStates.length > 0) {
      result.push({
        type: "warning",
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `${highUnempStates.length} state${highUnempStates.length > 1 ? "s" : ""} ha${highUnempStates.length > 1 ? "ve" : "s"} unemployment above 4%: ${highUnempStates.map(s => s.state).join(", ")}.`,
      });
    }

    // LFPR trend
    if (latest.pRate > threeMonthsAgo.pRate) {
      result.push({
        type: "positive",
        icon: <TrendingUp className="h-4 w-4" />,
        text: `Labour force participation is trending upward at ${latest.pRate}%.`,
      });
    }

    // Employment growth
    if (latest.employmentChange > 0) {
      result.push({
        type: "positive",
        icon: <BarChart3 className="h-4 w-4" />,
        text: `Employment grew by ${latest.employmentChange.toFixed(1)}k jobs last month (${latest.label}).`,
      });
    } else if (latest.employmentChange < 0) {
      result.push({
        type: "warning",
        icon: <BarChart3 className="h-4 w-4" />,
        text: `Employment declined by ${Math.abs(latest.employmentChange).toFixed(1)}k jobs last month.`,
      });
    }

    // Labour force milestone
    if (latest.lfMillion > 17) {
      result.push({
        type: "info",
        icon: <TrendingUp className="h-4 w-4" />,
        text: `Malaysia's labour force has surpassed 17 million workers (${latest.lfMillion}M).`,
      });
    }

    return result;
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      {alerts.map((alert, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium ${alertStyles[alert.type]}`}
        >
          {alert.icon}
          <span>{alert.text}</span>
        </motion.div>
      ))}
    </div>
  );
};

export default TrendAlerts;
