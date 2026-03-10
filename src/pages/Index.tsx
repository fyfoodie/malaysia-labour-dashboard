import { useTheme } from "@/hooks/useTheme";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import KPICards from "@/components/dashboard/KPICards";
import TrendCharts from "@/components/dashboard/TrendCharts";
import SectorChart from "@/components/dashboard/SectorChart";
import InDemandChart from "@/components/dashboard/InDemandChart";
import UnderemploymentCharts from "@/components/dashboard/UnderemploymentCharts";
import StateMap from "@/components/dashboard/StateMap";
import RegionalJobsMap from "@/components/dashboard/RegionalJobsMap";
import { motion } from "framer-motion";
import { TrendingUp, Lightbulb, MapPin, Briefcase, Globe } from "lucide-react";

const Index = () => {
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-8 md:space-y-12">
        
        <DashboardHeader isDark={isDark} toggleTheme={toggle} />

        {/* Section 1: KPI Snapshot */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold text-foreground">Key Labour Market Snapshot</h2>
          </div>
          <KPICards />
        </section>

        {/* Section 2: Trends */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <TrendingUp className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">Is the job market improving or worsening?</span>
          </div>
          <TrendCharts />
        </section>

        {/* Section 3: Sector */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-accent" />
            <Lightbulb className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">Where are the job opportunities?</span>
          </div>
          <SectorChart />
        </section>

        {/* Section 3.5: In-Demand Occupations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-secondary" />
            <Briefcase className="h-5 w-5 text-secondary" />
            <span className="text-sm text-muted-foreground">Which occupations pay the most?</span>
          </div>
          <InDemandChart />
        </section>

        {/* Section 4: Underemployment */}
        <section>
          <UnderemploymentCharts />
        </section>

        {/* Section 5: State-Level */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">How does your state compare?</span>
          </div>
          <StateMap />
        </section>

        {/* Section 6: Regional Job Opportunities */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 rounded-full bg-accent" />
            <Globe className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">Where are the best job opportunities by region?</span>
          </div>
          <RegionalJobsMap />
        </section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="rounded-2xl bg-card border border-border p-6 md:p-8 text-center shadow-sm"
        >
          <p className="text-xl md:text-2xl font-bold text-foreground mb-2">
            Data → Insight → Better Decisions
          </p>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Understanding the labour market helps everyone — from students choosing a career path 
            to policymakers designing better programs. Knowledge empowers better employment outcomes for all Malaysians. 🇲🇾
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Source: Department of Statistics Malaysia (DOSM) • Y-Axis Job Outlook Malaysia
          </p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
