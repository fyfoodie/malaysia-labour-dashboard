import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { BarChart3, TrendingUp, PieChart, Users, MapPin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useLabourData } from "@/context/LabourDataContext";

interface DashboardHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  activeSection?: string;
  onSectionClick?: (section: string) => void;
}

const DashboardHeader = ({
  isDark,
  toggleTheme,
  activeSection = "snapshot",
  onSectionClick,
}: DashboardHeaderProps) => {
  const { t } = useLanguage();
  const { data } = useLabourData();
  const [now, setNow] = useState(new Date());

  const latestDataMonth = useMemo(() => {
    if (!data?.national?.length) return null;
    const latest = [...data.national].sort(
      (a: any, b: any) => b.date.localeCompare(a.date)
    )[0];
    if (!latest?.date) return null;
    return new Date(latest.date).toLocaleString("en-MY", {
      month: "short",
      year: "numeric",
    });
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

  return (
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="sticky top-0 z-50 w-full bg-card/98 backdrop-blur-md border-b border-border shadow-sm"
      >
        {/* Top row: logo + meta + controls */}
        <div className="flex items-center justify-between px-5 md:px-8 pt-3 pb-2">

          {/* Left: logo + title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 flex-shrink-0">
              <BarChart3 className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-extrabold text-foreground tracking-tight">
                {t("header.title")}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {t("header.subtitle")}
              </p>
            </div>
          </div>

          {/* Right: live badge + clock + controls */}
          <div className="flex items-center gap-2.5">
            {/* Live data badge */}
            {latestDataMonth && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  Live · {latestDataMonth}
                </span>
              </div>
            )}

            {/* Clock — hidden on very small screens */}
            <span className="hidden md:block text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
              {now.toLocaleString("en-MY", {
                timeZone: "Asia/Kuala_Lumpur",
                weekday: "short",
                day:     "numeric",
                month:   "short",
                hour:    "2-digit",
                minute:  "2-digit",
                hour12:  true,
              })}
            </span>

            {/* Divider */}
            <div className="hidden md:block w-px h-4 bg-border/60" />

            <LanguageToggle />
            <ThemeToggle isDark={isDark} toggle={toggleTheme} />
          </div>
        </div>

        {/* Bottom row: navigation tabs */}
        <div className="flex items-center gap-1 px-5 md:px-8 pb-2.5 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon    = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionClick?.(item.id)}
                className={`
                  relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                  text-xs font-medium whitespace-nowrap
                  transition-colors duration-150
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }
                `}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {item.label}

                {/* Active indicator underline (subtle, only on active) */}
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-primary"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.header>
  );
};

export default DashboardHeader;