import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { BarChart3, TrendingUp, PieChart, Users, MapPin, Clock } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useLabourData } from "@/context/LabourDataContext";

interface DashboardHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  activeSection?: string;
  onSectionClick?: (section: string) => void;
}

const DashboardHeader = ({ isDark, toggleTheme, activeSection = "snapshot", onSectionClick }: DashboardHeaderProps) => {
  const { t } = useLanguage();
  const { data } = useLabourData();
  const [now, setNow] = useState(new Date());

  const latestDataMonth = useMemo(() => {
    if (!data?.national?.length) return null;
    const latest = [...data.national].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
    if (!latest?.date) return null;
    return new Date(latest.date).toLocaleString("en-MY", { month: "short", year: "numeric" });
  }, [data]);

  const navItems = [
    { id: "snapshot",        label: t("nav.snapshot"),        icon: BarChart3  },
    { id: "trends",          label: t("nav.trends"),          icon: TrendingUp },
    { id: "sectors",         label: t("nav.sectors"),         icon: PieChart   },
    { id: "underemployment", label: t("nav.underemployment"), icon: Users      },
    { id: "states",          label: t("nav.states"),          icon: MapPin     },
  ];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatter = new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">{t("header.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("header.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {latestDataMonth && (
            <div className="hidden md:flex items-center gap-1.5 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-green-500 font-medium">Live · {latestDataMonth}</span>
            </div>
          )}
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatter.format(now)}</span>
          </div>
          <LanguageToggle />
          <ThemeToggle isDark={isDark} toggle={toggleTheme} />
        </div>
      </div>
      <div className="flex items-center gap-1 px-4 md:px-6 pb-3 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionClick?.(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </motion.header>
  );
};

export default DashboardHeader;
