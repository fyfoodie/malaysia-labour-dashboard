import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { BarChart3, Clock } from "lucide-react";

interface DashboardHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const DashboardHeader = ({ isDark, toggleTheme }: DashboardHeaderProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const malaysiaTime = time.toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-accent to-primary/60 p-6 md:p-8 shadow-lg"
    >
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-foreground/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary-foreground/5 rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Top bar: theme toggle */}
        <div className="w-full flex justify-end mb-4">
          <ThemeToggle isDark={isDark} toggle={toggleTheme} />
        </div>

        {/* Center content */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">DOSM Data Dashboard</span>
        </div>

        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-primary-foreground leading-tight">
          Malaysia Labour Market<br />& Employment Dashboard
        </h1>

        <p className="mt-3 text-sm md:text-base text-primary-foreground/80 max-w-xl">
          Explore Malaysia's employment trends, sector opportunities, and regional differences — 
          made simple for everyone. 🇲🇾
        </p>

        {/* Live Malaysia time */}
        <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/15 backdrop-blur-sm">
          <Clock className="h-4 w-4 text-primary-foreground/80" />
          <span className="text-xs md:text-sm font-medium text-primary-foreground/90">
            🇲🇾 Malaysia Time: {malaysiaTime}
          </span>
        </div>
      </div>
    </motion.header>
  );
};

export default DashboardHeader;
