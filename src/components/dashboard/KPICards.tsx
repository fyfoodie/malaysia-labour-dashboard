import { TrendingUp, TrendingDown, Minus, Briefcase, UserX, Users, AlertTriangle, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const KPICards = () => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();

  if (loading || !data?.national?.length) {
    return <div className="rounded-2xl bg-card border border-border p-5 h-40 animate-pulse" />;
  }

  const national = [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latest   = national[national.length - 1];
  const previous = national[national.length - 2];
  const yearAgo  = national[national.length - 13] ?? national[0];

  const ur  = latest.u_rate ?? 0;
  const er  = latest.employment_rate ?? +(100 - ur).toFixed(1);
  const pr  = latest.p_rate ?? 0;
  const pur = previous.u_rate ?? 0;
  const per = previous.employment_rate ?? +(100 - pur).toFixed(1);
  const ppr = previous.p_rate ?? 0;

  const urYoY = +(ur - (yearAgo.u_rate ?? 0)).toFixed(1);
  const erYoY = +(er - (yearAgo.employment_rate ?? +(100 - (yearAgo.u_rate ?? 0)))).toFixed(1);
  const prYoY = +(pr - (yearAgo.p_rate ?? 0)).toFixed(1);

  const mismatchSorted = [...(data.mismatch ?? [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latestDate     = mismatchSorted[mismatchSorted.length - 1]?.date;
  const latestMismatch = mismatchSorted.filter((d: any) => d.date === latestDate);
  const prevDate       = mismatchSorted.filter((d: any) => d.date < latestDate).slice(-1)[0]?.date;
  const prevMismatch   = mismatchSorted.filter((d: any) => d.date === prevDate);

  const getOverallRate = (rows: any[]) => {
    const rateRow        = rows.find((d: any) => (d.sex === "overall" || d.sex === "both") && d.variable === "rate_pct");
    const personsOverall = rows.find((d: any) => (d.sex === "overall" || d.sex === "both") && d.variable === "persons");
    const lfRow          = data.national?.[data.national.length - 1];
    if (rateRow)                     return rateRow.sru;
    if (personsOverall && lfRow?.lf) return +((personsOverall.sru / lfRow.lf) * 100).toFixed(1);
    return null;
  };

  const underRate     = getOverallRate(latestMismatch);
  const prevUnderRate = getOverallRate(prevMismatch);
  const underChange   = underRate != null && prevUnderRate != null ? +(underRate - prevUnderRate).toFixed(1) : 0;

  const latestLabel = new Date(latest.date).toLocaleString("en-MY", { month: "short", year: "numeric" });

  const cards = [
    {
      title: t("kpi.employmentRate"), value: er, unit: "%",
      momChange: +(er - per).toFixed(1), yoyChange: erYoY,
      icon: Briefcase, invertTrend: false,
      tooltip: t("kpi.tooltip.employment"),
      gradient: "from-blue-500 to-cyan-400", barColor: "#3b82f6", max: 100,
    },
    {
      title: t("kpi.unemploymentRate"), value: ur, unit: "%",
      momChange: +(ur - pur).toFixed(1), yoyChange: urYoY,
      icon: UserX, invertTrend: true,
      tooltip: t("kpi.tooltip.unemployment"),
      gradient: "from-orange-500 to-red-400", barColor: "#f97316", max: 10,
    },
    {
      title: t("kpi.labourParticipation"), value: pr, unit: "%",
      momChange: +(pr - ppr).toFixed(1), yoyChange: prYoY,
      icon: Users, invertTrend: false,
      tooltip: t("kpi.tooltip.participation"),
      gradient: "from-green-500 to-emerald-400", barColor: "#22c55e", max: 85,
    },
    {
      title: t("kpi.skillsMismatch"), value: underRate ?? 0, unit: "%",
      momChange: underChange, yoyChange: null,
      icon: AlertTriangle, invertTrend: true,
      tooltip: t("kpi.tooltip.mismatch"),
      gradient: "from-purple-500 to-violet-400", barColor: "#a855f7", max: 25,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>{t("kpi.latestData")}: <strong className="text-foreground">{latestLabel}</strong></span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, index) => {
          const momIsPositive = card.invertTrend ? card.momChange < 0 : card.momChange > 0;
          const momIsNegative = card.invertTrend ? card.momChange > 0 : card.momChange < 0;
          const MomIcon = card.momChange > 0 ? TrendingUp : card.momChange < 0 ? TrendingDown : Minus;
          const barWidth = Math.min((card.value / card.max) * 100, 100);
          return (
            <Tooltip key={card.title}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                  className="relative rounded-2xl bg-card border border-border p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-help overflow-hidden group"
                >
                  <div className={`absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-opacity`} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${card.gradient} shadow-sm`}>
                        <card.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        momIsPositive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        momIsNegative ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        <MomIcon className="h-3 w-3" />
                        {card.momChange > 0 ? "+" : ""}{card.momChange}%
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-foreground leading-none">{card.value}{card.unit}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">{card.title}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: card.barColor }}
                        initial={{ width: 0 }} animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 + 0.3 }} />
                    </div>
                    {card.yoyChange !== null && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        YoY{" "}
                        <span className={
                          (card.invertTrend ? card.yoyChange < 0 : card.yoyChange > 0) ? "text-green-500 font-semibold" :
                          (card.invertTrend ? card.yoyChange > 0 : card.yoyChange < 0) ? "text-red-500 font-semibold" :
                          "text-muted-foreground"
                        }>
                          {card.yoyChange > 0 ? "+" : ""}{card.yoyChange}%
                        </span>
                      </p>
                    )}
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs"><p>{card.tooltip}</p></TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default KPICards;
