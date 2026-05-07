import { useState, useCallback, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { useLabourData } from "@/context/LabourDataContext";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KPICards from "@/components/dashboard/KPICards";
import TrendCharts from "@/components/dashboard/TrendCharts";
import SectorChart from "@/components/dashboard/SectorChart";
import InDemandChart from "@/components/dashboard/InDemandChart";
import UnderemploymentCharts from "@/components/dashboard/UnderemploymentCharts";
import StateMap from "@/components/dashboard/StateMap";
import RegionalJobsMap from "@/components/dashboard/RegionalJobsMap";
import DataInsightCards from "@/components/dashboard/DataInsightCards";
import LabourHealthScore from "@/components/dashboard/LabourHealthScore";
import JobMarketHealth from "@/components/dashboard/JobMarketHealth";
import StoryMode from "@/components/dashboard/StoryMode";
import { motion } from "framer-motion";
import { TrendingUp, MapPin, Briefcase, Globe, Users, Target } from "lucide-react";
import AIAnalyst from "@/components/dashboard/AIAnalyst";
import ForecastSection from "@/components/dashboard/ForecastSection";
import {
  KPICardsSkeleton, LabourHealthSkeleton, DataInsightSkeleton,
  TrendChartsSkeleton, ForecastSkeleton, SectorChartSkeleton,
  UnderemploymentSkeleton, StateMapSkeleton, RegionalJobsSkeleton,
  WagesSkeleton,
} from "@/components/dashboard/Skeletons";

const Index = () => {
  const { isDark, toggle } = useTheme();
  const { t } = useLanguage();
  const { loading } = useLabourData();
  const [activeSection, setActiveSection] = useState("snapshot");

  const handleSectionClick = useCallback((section: string) => {
    setActiveSection(section);
    const el = document.getElementById(`section-${section}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sections = ["snapshot", "trends", "sectors", "underemployment", "states"];
    sections.forEach(id => {
      const el = document.getElementById(`section-${id}`);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0, rootMargin: "-30% 0px -60% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header — full width, flush to top, outside max-w container ── */}
      <DashboardHeader
        isDark={isDark}
        toggleTheme={toggle}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
      />

      {/* ── Hero — full bleed, no rounded corners, no side gaps ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="relative overflow-hidden border-b border-border"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.10) 0%, hsl(var(--card)) 50%, hsl(var(--accent)/0.07) 100%)" }}
      >
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-accent/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

          <div className="relative z-10 px-8 md:px-14 py-12 md:py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-2 mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/8">
                <span className="text-sm">🇲🇾</span>
                <span className="text-xs font-semibold text-primary tracking-widest uppercase">{t("hero.badge")}</span>
              </span>

            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] mb-4 tracking-tight"
            >
              {t("hero.title1")}<br />
              <span className="text-primary">{t("hero.title2")}</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed"
            >
              {t("hero.desc")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="flex justify-center"
            >
              <StoryMode />
            </motion.div>

            <div className="flex justify-center gap-1.5 mt-8">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/30"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
      </motion.div>

      {/* ── Page content — max-width centered, back to original style ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-24 md:pb-0 space-y-6 pt-6">

        <section id="section-snapshot">
          {loading ? <LabourHealthSkeleton /> : <LabourHealthScore />}
        </section>

        <section>
          {loading ? <DataInsightSkeleton /> : <DataInsightCards />}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t("section.kpi")}</span>
          </div>
          {loading ? <KPICardsSkeleton /> : <KPICards />}
        </section>

        <section id="section-trends">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <TrendingUp className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">{t("section.trends")}</span>
          </div>
          {loading ? <TrendChartsSkeleton /> : <TrendCharts />}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Where is the market heading?</span>
          </div>
          {loading ? <ForecastSkeleton /> : <ForecastSection />}
        </section>

        <section id="section-sectors">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-accent" />
            <Globe className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">{t("section.sectors")}</span>
          </div>
          {loading ? <SectorChartSkeleton /> : <SectorChart />}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <Briefcase className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">{t("section.occupations")}</span>
          </div>
          {loading ? <WagesSkeleton /> : <InDemandChart />}
        </section>

        <section id="section-underemployment">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t("section.underemployment")}</span>
          </div>
          {loading ? <UnderemploymentSkeleton /> : <UnderemploymentCharts />}
        </section>

        <section id="section-states">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-accent" />
            <MapPin className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">{t("section.states")}</span>
          </div>
          {loading ? <StateMapSkeleton /> : <StateMap />}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <MapPin className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">{t("section.regional")}</span>
          </div>
          {loading ? <RegionalJobsSkeleton /> : <RegionalJobsMap />}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <Target className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t("section.jobhealth")}</span>
          </div>
          <JobMarketHealth />
        </section>

        <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
          <p>
            {t("footer.text")}{" "}
            <a href="https://open.dosm.gov.my" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-foreground">DOSM Open Data</a>
            {" · "}{t("footer.updated")}{" · "}{t("footer.built")} 🇲🇾
          </p>
        </footer>

        <AIAnalyst />
      </div>
    </div>
  );
};

export default Index;