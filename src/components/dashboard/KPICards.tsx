import { TrendingUp, TrendingDown, Minus, Briefcase, UserX, Users, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { getLatestStats, underemploymentBySex } from "@/data/labourData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const KPICards = () => {
  const { latest, changes } = getLatestStats();
  const latestUnderemployment = underemploymentBySex[underemploymentBySex.length - 1];

  const cards = [
    {
      title: "Employment Rate",
      value: `${latest.employmentRate}%`,
      change: changes.employmentRate,
      icon: Briefcase,
      tooltip: "The percentage of the labour force that is currently employed. A higher rate means more people have jobs.",
      color: "from-primary to-accent",
    },
    {
      title: "Unemployment Rate",
      value: `${latest.unemploymentRate}%`,
      change: changes.unemploymentRate,
      icon: UserX,
      tooltip: "The percentage of people actively looking for work but haven't found a job yet. Lower is better.",
      color: "from-secondary to-primary",
      invertTrend: true,
    },
    {
      title: "Labour Force Participation",
      value: `${latest.lfpr}%`,
      change: changes.lfpr,
      icon: Users,
      tooltip: "The percentage of working-age people who are either employed or actively seeking employment.",
      color: "from-accent to-primary",
    },
    {
      title: "Underemployment Rate",
      value: `${latestUnderemployment.total}%`,
      change: -0.1,
      icon: AlertTriangle,
      tooltip: "People who are employed but working fewer hours than they want, or in jobs below their skill level.",
      color: "from-primary to-secondary",
      invertTrend: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {cards.map((card, index) => {
        const TrendIcon = card.change > 0 ? TrendingUp : card.change < 0 ? TrendingDown : Minus;
        const isPositive = card.invertTrend ? card.change < 0 : card.change > 0;
        const isNegative = card.invertTrend ? card.change > 0 : card.change < 0;

        return (
          <Tooltip key={card.title}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="relative overflow-hidden rounded-2xl bg-card border border-border p-5 md:p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-help group"
              >
                {/* Glow background */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${card.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} shadow-sm`}>
                      <card.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                      isPositive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      isNegative ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <TrendIcon className="h-3 w-3" />
                      {card.change > 0 ? "+" : ""}{card.change}%
                    </div>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px] text-sm">
              <p>{card.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default KPICards;
