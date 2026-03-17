import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { BarChart3, TrendingUp, PieChart, Users, MapPin, Clock } from "lucide-react";

interface DashboardHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  activeSection?: string;
  onSectionClick?: (section: string) => void;
}

const navItems = [
  { id: "snapshot",        label: "Snapshot",        icon: BarChart3  },
  { id: "trends",          label: "Trends",          icon: TrendingUp },
  { id: "sectors",         label: "Sectors",         icon: PieChart   },
  { id: "underemployment", label: "Underemployment", icon: Users      },
  { id: "states",          label: "States",          icon: MapPin     },
];

const DashboardHeader = ({ isDark, toggleTheme, activeSection = "snapshot", onSectionClick }: DashboardHeaderProps) => {
  const [now, setNow] = useState(new Date());

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
            <h1 className="text-sm font-bold text-foreground leading-tight">Malaysia Labour Market</h1>
            <p className="text-xs text-muted-foreground">Employment Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatter.format(now)}</span>
          </div>
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
