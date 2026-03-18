import { useState, useCallback, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
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
import { TrendingUp, Lightbulb, MapPin, Briefcase, Globe, Users, Target } from "lucide-react";
import AIAnalyst from "@/components/dashboard/AIAnalyst";

const sectionIds = ["snapshot", "trends", "sectors", "underemployment", "states"];

const Index = () => {
  const { isDark, toggle } = useTheme();
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
      ([entry]) => {
        if (entry.isIntersecting) setActiveSection(id);
      },
      { threshold: 0, rootMargin: "-30% 0px -60% 0px" }
    );
    observer.observe(el);
    observers.push(observer);
  });
  
  return () => observers.forEach(o => o.disconnect());
}, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="sticky top-4 z-50">
          <DashboardHeader
            isDark={isDark}
            toggleTheme={toggle}
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
          />
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden border border-border"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, hsl(var(--card)) 50%, hsl(var(--accent)/0.08) 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-accent/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

          <div className="relative z-10 px-8 md:px-14 py-12 md:py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/8 mb-6"
            >
              <span className="text-sm">🇲🇾</span>
              <span className="text-xs font-semibold text-primary tracking-widest uppercase">
                Official DOSM Data · Updated Monthly
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] mb-4 tracking-tight"
            >
              Malaysia's Jobs.<br />
              <span className="text-primary">By the Numbers.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed"
            >
              Employment trends, sector shifts, state disparities and skills mismatch —
              Malaysia's labour market, made clear.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
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

        {/* Labour Health Index */}
        <section id="section-snapshot">
          <LabourHealthScore />
        </section>

        {/* Data Insights */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <Lightbulb className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">What the data is telling us</span>
          </div>
          <DataInsightCards />
        </section>

        {/* KPI Cards */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Key Labour Market Snapshot</span>
          </div>
          <KPICards />
        </section>

        {/* Trend Charts */}
        <section id="section-trends">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <TrendingUp className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">Is the job market improving or worsening?</span>
          </div>
          <TrendCharts />
        </section>

        {/* Sector Chart */}
        <section id="section-sectors">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-accent" />
            <Globe className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">Where are the job opportunities?</span>
          </div>
          <SectorChart />
        </section>

        {/* In-Demand Occupations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <Briefcase className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">Which occupations pay the most?</span>
          </div>
          <InDemandChart />
        </section>

        {/* Underemployment */}
        <section id="section-underemployment">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Are graduates working in the right jobs?</span>
          </div>
          <UnderemploymentCharts />
        </section>

        {/* State Map */}
        <section id="section-states">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-accent" />
            <MapPin className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">How does your state compare?</span>
          </div>
          <StateMap />
        </section>

        {/* Regional Opportunity Index */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <MapPin className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">Which state offers the best opportunities?</span>
          </div>
          <RegionalJobsMap />
        </section>

        {/* Job Market Health Checker */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <Target className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">How good is the job market for you?</span>
          </div>
          <JobMarketHealth />
        </section>

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
          <p>Data sourced from <a href="https://open.dosm.gov.my" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">DOSM Open Data</a> · Updated monthly · Built for Malaysia 🇲🇾</p>
        </footer>

        <AIAnalyst apiKey="AIzaSyCACjsWLrIPBj_27G9lWhYMr9ij197A1U0" />

      </div>
    </div>
  );
};

export default Index;
