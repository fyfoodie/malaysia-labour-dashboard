import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { labourMarketData } from "@/data/labourMarketData";
import { latestStateData } from "@/data/labourData";
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();

  const alerts = useMemo<Alert[]>(() => {
    const latest = labourMarketData[labourMarketData.length - 1];
    const threeMonthsAgo = labourMarketData[labourMarketData.length - 4];
    const result: Alert[] = [];

    // Unemployment trend (3-month)
    if (latest.uRate > threeMonthsAgo.uRate) {
      result.push({
        type: "warning",
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `${t("alert.uRateRose")} ${threeMonthsAgo.uRate}% ${t("alert.rateConnector")} ${latest.uRate}% ${t("alert.overPast3Months")}`,
      });
    } else if (latest.uRate < threeMonthsAgo.uRate) {
      result.push({
        type: "positive",
        icon: <TrendingDown className="h-4 w-4" />,
        text: `${t("alert.uRateDropped")} ${threeMonthsAgo.uRate}% ${t("alert.rateConnector")} ${latest.uRate}% ${t("alert.overPast3Months")}`,
      });
    }

    // States with high unemployment
    const highUnempStates = latestStateData.filter(s => s.u_rate > 4);
    if (highUnempStates.length > 0) {
      result.push({
        type: "warning",
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `${highUnempStates.length} ${t("alert.statesHighUnemp")} ${highUnempStates.map(s => s.state).join(", ")}.`,
      });
    }

    // LFPR trend
    if (latest.pRate > threeMonthsAgo.pRate) {
      result.push({
        type: "positive",
        icon: <TrendingUp className="h-4 w-4" />,
        text: `${t("alert.lfprTrendingUp")} ${latest.pRate}%.`,
      });
    }

    // Employment growth
    if (latest.employmentChange > 0) {
      result.push({
        type: "positive",
        icon: <BarChart3 className="h-4 w-4" />,
        text: `${t("alert.empGrew")} ${latest.employmentChange.toFixed(1)}k ${t("alert.jobsLastMonth")} (${latest.label}).`,
      });
    } else if (latest.employmentChange < 0) {
      result.push({
        type: "warning",
        icon: <BarChart3 className="h-4 w-4" />,
        text: `${t("alert.empDeclined")} ${Math.abs(latest.employmentChange).toFixed(1)}k ${t("alert.jobsLastMonth")}.`,
      });
    }

    // Labour force milestone
    if (latest.lfMillion > 17) {
      result.push({
        type: "info",
        icon: <TrendingUp className="h-4 w-4" />,
        text: `${t("alert.lfSurpassed")} (${latest.lfMillion}M).`,
      });
    }

    return result;
  }, [t]);

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
