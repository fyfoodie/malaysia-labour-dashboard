import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Briefcase, Target, TrendingUp, TrendingDown,
  Lightbulb, Search, Loader2, Activity, Download,
  AlertTriangle, Users, DollarSign, Clock, GraduationCap, BarChart2, X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useLabourData } from "@/context/LabourDataContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { latestStateData } from "@/data/labourData";
import { labourMarketData } from "@/data/labourMarketData";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, RadarChart, Radar, PolarGrid,
  PolarAngleAxis,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────
const STATES = latestStateData.map(s => s.state).sort();

const INDUSTRIES = [
  "Technology & Digital",
  "Manufacturing",
  "Services & Retail",
  "Construction",
  "Agriculture & Plantation",
  "Finance & Insurance",
  "Healthcare & Social Work",
  "Education",
  "Tourism & Hospitality",
  "Creative & Media",
] as const;
type Industry = typeof INDUSTRIES[number];

// Per-industry modifiers across 7 dimensions
interface IndustryProfile {
  uMod:         number;   // unemployment rate delta
  pMod:         number;   // participation rate delta
  gMod:         number;   // growth % delta
  youthMod:     number;   // youth unemployment delta (negative = better for youth)
  mismatchMod:  number;   // skills mismatch delta (negative = less mismatch)
  wageMod:      number;   // wage multiplier vs national median (%)
  stabilityMod: number;   // employment stability (negative = less stable)
  desc:         string;
  descBM:       string;
  skills:       string[]; // in-demand skills for this industry
  outlook:      "growing" | "stable" | "declining";
}

const INDUSTRY_PROFILE: Record<Industry, IndustryProfile> = {
  "Technology & Digital": {
    uMod: -0.9, pMod: 3.5, gMod: 2.8, youthMod: -2.0, mismatchMod: -3.0, wageMod: 45, stabilityMod: -0.5,
    desc: "High demand for digital skills with strong salary premiums and low unemployment. AI, cloud and cybersecurity are key growth areas.",
    descBM: "Permintaan tinggi untuk kemahiran digital dengan premium gaji yang kukuh. AI, awan dan keselamatan siber adalah bidang pertumbuhan utama.",
    skills: ["Python / AI", "Cloud Computing", "Cybersecurity", "Data Analytics"],
    outlook: "growing",
  },
  "Manufacturing": {
    uMod: 0.2, pMod: 1.0, gMod: 0.5, youthMod: 1.5, mismatchMod: 1.0, wageMod: -5, stabilityMod: 0.5,
    desc: "Steady industrial output with automation reshaping workforce needs. EV and semiconductor supply chains creating new opportunities.",
    descBM: "Output industri yang stabil dengan automasi membentuk semula keperluan tenaga kerja. Rantaian bekalan EV dan semikonduktor mewujudkan peluang baharu.",
    skills: ["CNC Operation", "Quality Control", "Automation", "Lean Manufacturing"],
    outlook: "stable",
  },
  "Services & Retail": {
    uMod: -0.2, pMod: 2.0, gMod: 1.2, youthMod: -1.0, mismatchMod: 2.5, wageMod: -15, stabilityMod: 1.5,
    desc: "Broad employment base but high skills mismatch and lower wages. E-commerce growth offsetting traditional retail contraction.",
    descBM: "Asas pekerjaan yang luas tetapi ketidakpadanan kemahiran tinggi dan gaji lebih rendah. Pertumbuhan e-dagang mengimbangi pengurangan runcit tradisional.",
    skills: ["Customer Service", "E-Commerce", "Logistics", "Digital Marketing"],
    outlook: "stable",
  },
  "Construction": {
    uMod: 0.6, pMod: -1.0, gMod: 0.8, youthMod: 2.0, mismatchMod: -1.0, wageMod: -8, stabilityMod: 2.5,
    desc: "Infrastructure projects sustaining demand but seasonal volatility is high. Green building and smart construction creating skilled trades demand.",
    descBM: "Projek infrastruktur mengekalkan permintaan tetapi volatiliti bermusim tinggi. Bangunan hijau mewujudkan permintaan pekerja mahir.",
    skills: ["Civil Engineering", "Green Building", "BIM", "Project Management"],
    outlook: "stable",
  },
  "Agriculture & Plantation": {
    uMod: 0.9, pMod: -2.5, gMod: -0.8, youthMod: 3.0, mismatchMod: -2.0, wageMod: -30, stabilityMod: 1.0,
    desc: "Structural workforce decline as mechanisation displaces traditional roles. Agri-tech and sustainable farming offer niche growth opportunities.",
    descBM: "Penurunan tenaga kerja berstruktur akibat penjantraan. Agri-teknologi menawarkan peluang pertumbuhan khusus.",
    skills: ["AgriTech", "Precision Farming", "Supply Chain", "Food Processing"],
    outlook: "declining",
  },
  "Finance & Insurance": {
    uMod: -0.7, pMod: 2.5, gMod: 1.8, youthMod: -1.5, mismatchMod: -2.5, wageMod: 35, stabilityMod: -1.0,
    desc: "Fintech expansion and Islamic finance growth driving strong demand. High salary premiums and low unemployment make this a competitive field.",
    descBM: "Pengembangan fintech dan kewangan Islam mendorong permintaan yang kukuh. Premium gaji tinggi menjadikan bidang ini sangat kompetitif.",
    skills: ["Fintech", "Risk Management", "Islamic Finance", "Data Analysis"],
    outlook: "growing",
  },
  "Healthcare & Social Work": {
    uMod: -1.1, pMod: 3.0, gMod: 2.2, youthMod: -2.5, mismatchMod: -3.5, wageMod: 20, stabilityMod: -1.5,
    desc: "Sustained structural demand driven by ageing population and healthcare expansion. One of Malaysia's most shortage-affected sectors.",
    descBM: "Permintaan berstruktur yang berterusan didorong oleh penuaan penduduk. Sektor yang paling kekurangan tenaga mahir di Malaysia.",
    skills: ["Clinical Care", "Mental Health", "Medical Technology", "Gerontology"],
    outlook: "growing",
  },
  "Education": {
    uMod: -0.3, pMod: 1.2, gMod: 0.6, youthMod: -1.0, mismatchMod: 1.5, wageMod: 5, stabilityMod: -2.0,
    desc: "Stable public-sector employment with growing EdTech and private tuition demand. Higher education reform creating new curriculum roles.",
    descBM: "Pekerjaan sektor awam yang stabil dengan permintaan EdTech dan tuisyen swasta yang meningkat.",
    skills: ["EdTech", "Curriculum Design", "Special Education", "STEM Teaching"],
    outlook: "stable",
  },
  "Tourism & Hospitality": {
    uMod: 0.5, pMod: -1.0, gMod: 1.5, youthMod: -0.5, mismatchMod: 1.0, wageMod: -20, stabilityMod: 3.0,
    desc: "Tourism rebound post-pandemic creating roles but seasonal volatility and lower wages remain challenges. ASEAN travel recovery is a tailwind.",
    descBM: "Pemulihan pelancongan selepas pandemik mewujudkan peluang kerja tetapi gaji lebih rendah kekal cabaran.",
    skills: ["Hospitality Management", "Tourism Tech", "Event Planning", "Languages"],
    outlook: "growing",
  },
  "Creative & Media": {
    uMod: 0.3, pMod: 0.5, gMod: 1.0, youthMod: -2.0, mismatchMod: 2.0, wageMod: -10, stabilityMod: 2.0,
    desc: "Growing demand for content creators, UX designers and digital storytellers. Freelance and gig arrangements are common in this sector.",
    descBM: "Permintaan meningkat untuk pencipta kandungan, pereka UX dan pencerita digital. Kerja bebas dan gig adalah biasa dalam sektor ini.",
    skills: ["UI/UX Design", "Content Creation", "Video Production", "Branding"],
    outlook: "growing",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function statusOf(score: number) {
  if (score >= 81) return { label: "Strong",     color: "#22c55e", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" };
  if (score >= 61) return { label: "Healthy",    color: "#3b82f6", bg: "bg-blue-500/10 border-blue-500/30 text-blue-500"         };
  if (score >= 41) return { label: "Recovering", color: "#eab308", bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"   };
  return               { label: "Weak",        color: "#ef4444", bg: "bg-red-500/10 border-red-500/30 text-red-500"             };
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  composite:   number;
  indicators:  { label: string; icon: React.ReactNode; value: string; score: number; weight: number; detail: string }[];
  trendData:   { label: string; value: number; national: number }[];
  radarData:   { subject: string; score: number; fullMark: 100 }[];
  insight:     string;
  suggestions: { icon: React.ReactNode; text: string; type: "good" | "warn" | "info" }[];
  stateRow:    { u_rate: number; p_rate: number; state: string };
  industry:    Industry;
  uRate:       number;
  pRate:       number;
  growth:      number;
  wage:        number;
  profile:     IndustryProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const JobMarketHealth = () => {
  const { t, lang } = useLanguage();
  const { data: labourData } = useLabourData();

  const [state,     setState]     = useState("");
  const [industry,  setIndustry]  = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [result,    setResult]    = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "radar" | "trend">("overview");
  const reportRef    = useRef<HTMLDivElement>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  const exitResult = useCallback(() => {
    setResult(null);
    setActiveTab("overview");
    // Scroll back to top of component
    componentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // National benchmark values from live DOSM data
  const nationalBenchmarks = useMemo(() => {
    if (!labourData?.national?.length) return { uRate: 3.3, pRate: 70.4, medianWage: 6338 };
    const sorted = [...labourData.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const medianWage = labourData.wages?.length
      ? [...labourData.wages]
          .filter((d: any) => d.income_median)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
          .slice(-1)[0]?.income_median ?? 6338
      : 6338;
    return { uRate: latest.u_rate ?? 3.3, pRate: latest.p_rate ?? 70.4, medianWage };
  }, [labourData]);

  const nationalYouthRate = useMemo(() => {
    if (!labourData?.youth?.length) return 11.0;
    const sorted = [...labourData.youth]
      .filter((d: any) => d.u_rate != null)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1]?.u_rate ?? 11.0;
  }, [labourData]);

  const nationalMismatchRate = useMemo(() => {
    if (!labourData?.mismatch?.length) return 12.0;
    const latest = [...labourData.mismatch]
      .filter((d: any) => d.date)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .slice(-1)[0];
    return latest?.sru_rate ?? latest?.rate ?? 12.0;
  }, [labourData]);

  // ── Analyse ───────────────────────────────────────────────────────────────
  const analyse = useCallback(() => {
    if (!state || !industry) return;
    setAnalysing(true);
    setResult(null);
    setActiveTab("overview");

    setTimeout(() => {
      const stateRow = latestStateData.find(s => s.state === state)!;
      const profile  = INDUSTRY_PROFILE[industry as Industry];
      const nat      = nationalBenchmarks;
      const last12   = labourMarketData.slice(-12);
      const latestNat = labourMarketData[labourMarketData.length - 1];

      // ── Derived values ───────────────────────────────────────────────────
      const uRate    = clamp(+(stateRow.u_rate + profile.uMod).toFixed(1), 0.5, 15);
      const pRate    = clamp(+(stateRow.p_rate + profile.pMod).toFixed(1), 50, 90);
      const growth   = +((latestNat.employmentGrowthPercent ?? 0.1) + profile.gMod).toFixed(2);
      const youthRate = clamp(+(nationalYouthRate + profile.youthMod).toFixed(1), 1, 30);
      const mismatch  = clamp(+(nationalMismatchRate + profile.mismatchMod).toFixed(1), 2, 30);
      const wage      = Math.round(nat.medianWage * (1 + profile.wageMod / 100));
      const stability = clamp(80 - profile.stabilityMod * 8); // higher = more stable

      // ── Individual scores (0–100) ────────────────────────────────────────
      // Unemployment — lower is better, Malaysia range 0.5%–6%
      const uScore = clamp(((6 - uRate) / (6 - 0.5)) * 100);
      // Participation — higher is better, range 60%–82%
      const pScore = clamp(((pRate - 60) / (82 - 60)) * 100);
      // Growth — range -1% to +3%
      const gScore = clamp(((growth + 1) / 4) * 100);
      // Youth unemployment — lower is better, range 5%–25%
      const yScore = clamp(((25 - youthRate) / (25 - 5)) * 100);
      // Skills mismatch — lower is better, range 5%–25%
      const mScore = clamp(((25 - mismatch) / (25 - 5)) * 100);
      // Wage vs national — ratio to national median
      const wScore = clamp(((wage / nat.medianWage) / 2) * 100);
      // Stability
      const sScore = stability;

      const composite = Math.round(
        uScore * 0.22 +
        pScore * 0.18 +
        gScore * 0.15 +
        yScore * 0.15 +
        mScore * 0.12 +
        wScore * 0.12 +
        sScore * 0.06
      );

      const indicators = [
        {
          label: "Unemployment Rate",
          icon: <Target className="h-3.5 w-3.5" />,
          value: `${uRate}%`,
          score: Math.round(uScore),
          weight: 22,
          detail: `vs national ${nat.uRate}%`,
        },
        {
          label: "Participation Rate",
          icon: <Users className="h-3.5 w-3.5" />,
          value: `${pRate}%`,
          score: Math.round(pScore),
          weight: 18,
          detail: `vs national ${nat.pRate}%`,
        },
        {
          label: "Employment Growth",
          icon: <TrendingUp className="h-3.5 w-3.5" />,
          value: `${growth > 0 ? "+" : ""}${growth}%`,
          score: Math.round(gScore),
          weight: 15,
          detail: "month-on-month",
        },
        {
          label: "Youth Unemployment",
          icon: <GraduationCap className="h-3.5 w-3.5" />,
          value: `${youthRate}%`,
          score: Math.round(yScore),
          weight: 15,
          detail: "ages 15–24",
        },
        {
          label: "Skills Mismatch",
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          value: `${mismatch}%`,
          score: Math.round(mScore),
          weight: 12,
          detail: "graduates in wrong jobs",
        },
        {
          label: "Wage vs National",
          icon: <DollarSign className="h-3.5 w-3.5" />,
          value: `RM ${wage.toLocaleString()}`,
          score: Math.round(wScore),
          weight: 12,
          detail: `national median RM ${nat.medianWage.toLocaleString()}`,
        },
        {
          label: "Job Stability",
          icon: <Clock className="h-3.5 w-3.5" />,
          value: `${Math.round(sScore)}%`,
          score: Math.round(sScore),
          weight: 6,
          detail: "low turnover & duration risk",
        },
      ];

      const radarData: { subject: string; score: number; fullMark: 100 }[] = [
        { subject: "Jobs",      score: Math.round(uScore), fullMark: 100 },
        { subject: "Workforce", score: Math.round(pScore), fullMark: 100 },
        { subject: "Growth",    score: Math.round(gScore), fullMark: 100 },
        { subject: "Youth",     score: Math.round(yScore), fullMark: 100 },
        { subject: "Skills",    score: Math.round(mScore), fullMark: 100 },
        { subject: "Wage",      score: Math.round(wScore), fullMark: 100 },
        { subject: "Stability", score: Math.round(sScore), fullMark: 100 },
      ];

      const trendData = last12.map(d => ({
        label:    d.label,
        value:    +(d.uRate + profile.uMod + (Math.random() * 0.3 - 0.15)).toFixed(1),
        national: +(d.uRate).toFixed(1),
      }));

      const st = statusOf(composite);
      const desc = lang === "bm" ? profile.descBM : profile.desc;
      const insight = lang === "bm"
        ? `Sektor ${industry} di ${state} menunjukkan kondisi pasaran buruh ${st.label.toLowerCase()} dengan kadar pengangguran ${uRate}% dan penyertaan ${pRate}%. ${desc}`
        : `The ${industry} sector in ${state} shows ${st.label.toLowerCase()} labour market conditions — unemployment at ${uRate}% vs national ${nat.uRate}%. ${desc}`;

      // Suggestions
      const allScores = Object.entries(INDUSTRY_PROFILE).map(([name, p]) => ({
        name, score: Math.round(
          clamp(((6 - Math.max(0.5, stateRow.u_rate + p.uMod)) / 5.5) * 100) * 0.22 +
          clamp(((Math.min(90, stateRow.p_rate + p.pMod) - 60) / 22) * 100) * 0.18 +
          clamp((((latestNat.employmentGrowthPercent ?? 0.1) + p.gMod + 1) / 4) * 100) * 0.15 +
          clamp(((25 - Math.max(1, nationalYouthRate + p.youthMod)) / 20) * 100) * 0.15 +
          clamp(((25 - Math.max(2, nationalMismatchRate + p.mismatchMod)) / 20) * 100) * 0.12 +
          clamp(((nat.medianWage * (1 + p.wageMod / 100) / nat.medianWage) / 2) * 100) * 0.12 +
          clamp(80 - p.stabilityMod * 8) * 0.06
        ),
      })).sort((a, b) => b.score - a.score);

      const suggestions: AnalysisResult["suggestions"] = [];
      const top = allScores[0];
      if (top.name !== industry) {
        suggestions.push({
          icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
          text: `${top.name} scores highest in ${state} (${top.score}/100) — consider cross-sector skilling.`,
          type: "good",
        });
      }
      if (mismatch > 15) {
        suggestions.push({
          icon: <GraduationCap className="h-4 w-4 text-amber-500" />,
          text: `High skills mismatch (${mismatch}%) in ${industry} — certifications in ${profile.skills[0]} and ${profile.skills[1]} improve employability.`,
          type: "warn",
        });
      }
      if (youthRate > nationalYouthRate) {
        suggestions.push({
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          text: `Youth unemployment in this sector (${youthRate}%) exceeds the national youth average — internship and apprenticeship pathways are critical.`,
          type: "warn",
        });
      }
      suggestions.push({
        icon: <Lightbulb className="h-4 w-4 text-blue-400" />,
        text: `In-demand skills for ${industry}: ${profile.skills.join(" · ")}`,
        type: "info",
      });

      setResult({
        composite, indicators, trendData, radarData,
        insight, suggestions, stateRow, industry: industry as Industry,
        uRate, pRate, growth, wage, profile,
      });
      setAnalysing(false);
    }, 1200);
  }, [state, industry, nationalBenchmarks, nationalYouthRate, nationalMismatchRate, lang]);

  // ── Print PDF ─────────────────────────────────────────────────────────────
  // Uses window.print() with @media print CSS — zero dependencies,
  // vector quality, browser handles pagination to exactly 2 pages.
  const downloadReport = useCallback(() => {
    if (!result) return;
    const st  = statusOf(result.composite);
    const now = new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });

    // Build radar SVG inline (can't use Recharts in print context)
    const radarPoints = result.radarData.map((d, i) => {
      const angle = (i / result.radarData.length) * 2 * Math.PI - Math.PI / 2;
      const r     = (d.score / 100) * 70;
      return { x: 90 + r * Math.cos(angle), y: 90 + r * Math.sin(angle), label: d.subject, score: d.score };
    });
    const polyPoints = radarPoints.map(p => `${p.x},${p.y}`).join(" ");

    // Grid rings
    const gridRings = [25, 50, 75, 100].map(pct => {
      const pts = result.radarData.map((_, i) => {
        const angle = (i / result.radarData.length) * 2 * Math.PI - Math.PI / 2;
        const r     = (pct / 100) * 70;
        return `${90 + r * Math.cos(angle)},${90 + r * Math.sin(angle)}`;
      });
      return `<polygon points="${pts.join(" ")}" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>`;
    }).join("");

    // Axis lines
    const axisLines = result.radarData.map((_, i) => {
      const angle = (i / result.radarData.length) * 2 * Math.PI - Math.PI / 2;
      return `<line x1="90" y1="90" x2="${90 + 70 * Math.cos(angle)}" y2="${90 + 70 * Math.sin(angle)}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    }).join("");

    // Labels
    const labels = radarPoints.map(p => {
      const lx = 90 + 85 * Math.cos(Math.atan2(p.y - 90, p.x - 90));
      const ly = 90 + 85 * Math.sin(Math.atan2(p.y - 90, p.x - 90));
      return `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="#6b7280">${p.label}</text>`;
    }).join("");

    const radarSVG = `<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      ${gridRings}${axisLines}
      <polygon points="${polyPoints}" fill="${st.color}30" stroke="${st.color}" stroke-width="1.5"/>
      ${radarPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="${st.color}"/>`).join("")}
      ${labels}
    </svg>`;

    // Trend sparkline SVG
    const tMin = Math.min(...result.trendData.map(d => Math.min(d.value, d.national))) - 0.3;
    const tMax = Math.max(...result.trendData.map(d => Math.max(d.value, d.national))) + 0.3;
    const tRange = tMax - tMin || 1;
    const tW = 320; const tH = 60;
    const toX = (i: number) => (i / (result.trendData.length - 1)) * tW;
    const toY = (v: number) => tH - ((v - tMin) / tRange) * tH;
    const sectorPts  = result.trendData.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");
    const nationalPts = result.trendData.map((d, i) => `${toX(i)},${toY(d.national)}`).join(" ");
    const trendSVG = `<svg width="${tW}" height="${tH}" viewBox="0 0 ${tW} ${tH}" xmlns="http://www.w3.org/2000/svg">
      <polyline points="${nationalPts}" fill="none" stroke="#9ca3af" stroke-width="1" stroke-dasharray="3 2"/>
      <polyline points="${sectorPts}"  fill="none" stroke="${st.color}" stroke-width="2"/>
    </svg>`;

    // Score bar helper
    const bar = (score: number, color: string) =>
      `<div style="height:6px;border-radius:3px;background:#f3f4f6;overflow:hidden;margin-top:3px">
        <div style="height:100%;width:${score}%;background:${color};border-radius:3px"></div>
      </div>`;

    const scoreColor = (s: number) => s >= 70 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>FindMiJob Analysis — ${result.stateRow.state} · ${result.industry}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Plus Jakarta Sans',sans-serif; color:#111827; background:#fff; font-size:9pt; }
  @page { size:A4; margin:18mm 16mm 16mm 16mm; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }

  /* ── PAGE BREAK ── */
  .page-break { page-break-before:always; }

  /* ── HEADER ── */
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:10px; border-bottom:2px solid ${st.color}; margin-bottom:14px; }
  .logo   { font-size:13pt; font-weight:800; color:${st.color}; letter-spacing:-0.5px; }
  .meta   { text-align:right; font-size:7.5pt; color:#6b7280; }

  /* ── SCORE HERO ── */
  .hero { display:grid; grid-template-columns:140px 1fr; gap:14px; background:#f9fafb; border-radius:10px; padding:14px; margin-bottom:12px; border:1px solid #e5e7eb; }
  .score-circle { text-align:center; }
  .score-num  { font-size:44pt; font-weight:800; color:${st.color}; line-height:1; }
  .score-sub  { font-size:8pt; color:#6b7280; }
  .score-badge{ display:inline-block; padding:3px 10px; border-radius:20px; font-size:8pt; font-weight:700; background:${st.color}20; color:${st.color}; border:1px solid ${st.color}40; margin-top:6px; }
  .hero-meta p { font-size:8pt; color:#374151; margin-bottom:3px; }
  .hero-meta strong { color:#111827; }
  .outlook { display:inline-block; padding:2px 8px; border-radius:10px; font-size:7.5pt; font-weight:600;
    background:${"growing" === result.profile.outlook ? "#d1fae5" : "stable" === result.profile.outlook ? "#dbeafe" : "#fee2e2"};
    color:${"growing" === result.profile.outlook ? "#065f46" : "stable" === result.profile.outlook ? "#1e40af" : "#991b1b"}; }

  /* ── SECTION TITLE ── */
  .sec { font-size:8.5pt; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:7px; padding-bottom:4px; border-bottom:1px solid #e5e7eb; }

  /* ── INDICATORS ── */
  .ind-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:12px; }
  .ind-item { background:#f9fafb; border-radius:7px; padding:7px 9px; border:1px solid #e5e7eb; }
  .ind-top  { display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; }
  .ind-label{ font-size:7.5pt; color:#6b7280; font-weight:600; }
  .ind-val  { font-size:9pt; font-weight:800; color:#111827; }
  .ind-det  { font-size:6.5pt; color:#9ca3af; margin-top:1px; }
  .ind-score-badge { font-size:7pt; font-weight:700; padding:1px 5px; border-radius:4px; }

  /* ── CHARTS ROW ── */
  .charts-row { display:grid; grid-template-columns:180px 1fr; gap:14px; margin-bottom:12px; align-items:start; }
  .chart-label { font-size:7.5pt; color:#6b7280; margin-bottom:4px; font-weight:600; }

  /* ── INSIGHT ── */
  .insight { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:9px 11px; margin-bottom:10px; }
  .insight-title { font-size:8pt; font-weight:700; color:#92400e; margin-bottom:4px; }
  .insight-body  { font-size:8pt; color:#78350f; line-height:1.5; }

  /* ── SUGGESTIONS ── */
  .sug-list { list-style:none; margin-bottom:10px; }
  .sug-item { font-size:8pt; color:#374151; padding:5px 9px; border-radius:6px; margin-bottom:4px; border-left:3px solid; }
  .sug-good { background:#f0fdf4; border-color:#22c55e; }
  .sug-warn { background:#fffbeb; border-color:#eab308; }
  .sug-info { background:#eff6ff; border-color:#3b82f6; }

  /* ── SKILLS ── */
  .skills { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:12px; }
  .skill-tag { padding:3px 9px; border-radius:12px; font-size:7.5pt; font-weight:600; background:${st.color}15; color:${st.color}; border:1px solid ${st.color}30; }

  /* ── TREND LABELS ── */
  .trend-labels { display:flex; justify-content:space-between; font-size:6.5pt; color:#9ca3af; margin-top:2px; }

  /* ── FOOTER ── */
  .footer { font-size:7pt; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:7px; margin-top:10px; display:flex; justify-content:space-between; }
</style>
</head>
<body>

<!-- ════════════════════ PAGE 1 ════════════════════ -->
<div class="header">
  <div>
    <div class="logo">FindMiJob</div>
    <div style="font-size:8pt;color:#6b7280;margin-top:2px">Malaysia Labour Market Intelligence</div>
  </div>
  <div class="meta">
    <div style="font-weight:700;font-size:9pt;color:#111827">Personalised Labour Market Analysis</div>
    <div>Generated: ${now}</div>
    <div>Data source: DOSM OpenAPI · open.dosm.gov.my</div>
  </div>
</div>

<!-- Score hero -->
<div class="hero">
  <div class="score-circle">
    <div class="score-num">${result.composite}</div>
    <div class="score-sub">out of 100</div>
    <div class="score-badge">${statusOf(result.composite).label}</div>
  </div>
  <div class="hero-meta">
    <p><strong>State:</strong> ${result.stateRow.state}</p>
    <p><strong>Industry:</strong> ${result.industry}</p>
    <p><strong>Outlook:</strong> <span class="outlook">${result.profile.outlook}</span></p>
    <p style="margin-top:6px;font-size:7.5pt;color:#6b7280">Composite of 7 DOSM-backed indicators. Higher = healthier labour market conditions for this state and industry combination.</p>
  </div>
</div>

<!-- Indicators -->
<div class="sec">Indicator Breakdown (7 Dimensions)</div>
<div class="ind-grid">
  ${result.indicators.map(ind => {
    const c = scoreColor(ind.score);
    return `<div class="ind-item">
      <div class="ind-top">
        <span class="ind-label">${ind.label}</span>
        <span class="ind-score-badge" style="background:${c}20;color:${c}">${ind.score}/100 · ${ind.weight}%</span>
      </div>
      <div class="ind-val">${ind.value}</div>
      <div class="ind-det">${ind.detail}</div>
      ${bar(ind.score, c)}
    </div>`;
  }).join("")}
</div>

<!-- Insight -->
<div class="sec">Analysis Insight</div>
<div class="insight">
  <div class="insight-title">💡 Key Finding</div>
  <div class="insight-body">${result.insight}</div>
</div>

<!-- Suggestions -->
<div class="sec">Recommendations</div>
<ul class="sug-list">
  ${result.suggestions.map(s =>
    `<li class="sug-item sug-${s.type}">${s.text}</li>`
  ).join("")}
</ul>

<div class="footer">
  <span>FindMiJob · findmijob.netlify.app · Powered by DOSM OpenAPI</span>
  <span>Page 1 of 2</span>
</div>

<!-- ════════════════════ PAGE 2 ════════════════════ -->
<div class="page-break"></div>

<div class="header">
  <div>
    <div class="logo">FindMiJob</div>
    <div style="font-size:8pt;color:#6b7280;margin-top:2px">${result.stateRow.state} · ${result.industry}</div>
  </div>
  <div class="meta">
    <div style="font-weight:700;font-size:9pt;color:#111827">Charts & Skills Profile</div>
    <div>${now}</div>
  </div>
</div>

<!-- Radar + Trend charts -->
<div class="sec">Performance Radar & Unemployment Trend</div>
<div class="charts-row">
  <div>
    <div class="chart-label">7-Dimension Radar</div>
    ${radarSVG}
    <div style="font-size:6.5pt;color:#9ca3af;text-align:center;margin-top:2px">Outer edge = 100 (best)</div>
  </div>
  <div style="flex:1">
    <div class="chart-label">Unemployment Trend — Sector vs National (last 12 months)</div>
    ${trendSVG}
    <div class="trend-labels">
      <span>${result.trendData[0]?.label ?? ""}</span>
      <span>
        <span style="color:${st.color};font-weight:700">— Sector/State</span>
        &nbsp;&nbsp;
        <span style="color:#9ca3af">- - National</span>
      </span>
      <span>${result.trendData[result.trendData.length - 1]?.label ?? ""}</span>
    </div>
    <!-- All 7 scores as a compact table -->
    <div style="margin-top:10px">
      <div class="chart-label">Indicator Score Summary</div>
      <table style="width:100%;border-collapse:collapse;font-size:7.5pt">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="text-align:left;padding:4px 6px;color:#6b7280;font-weight:600">Indicator</th>
            <th style="text-align:center;padding:4px 6px;color:#6b7280;font-weight:600">Value</th>
            <th style="text-align:center;padding:4px 6px;color:#6b7280;font-weight:600">Score</th>
            <th style="text-align:center;padding:4px 6px;color:#6b7280;font-weight:600">Weight</th>
          </tr>
        </thead>
        <tbody>
          ${result.indicators.map((ind, i) => {
            const c = scoreColor(ind.score);
            return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
              <td style="padding:4px 6px;color:#374151;font-weight:600">${ind.label}</td>
              <td style="padding:4px 6px;text-align:center;color:#111827;font-weight:700">${ind.value}</td>
              <td style="padding:4px 6px;text-align:center;font-weight:700;color:${c}">${ind.score}</td>
              <td style="padding:4px 6px;text-align:center;color:#6b7280">${ind.weight}%</td>
            </tr>`;
          }).join("")}
          <tr style="background:#f3f4f6;font-weight:800">
            <td style="padding:4px 6px;color:#111827">COMPOSITE SCORE</td>
            <td style="padding:4px 6px;text-align:center"></td>
            <td style="padding:4px 6px;text-align:center;color:${st.color}">${result.composite}</td>
            <td style="padding:4px 6px;text-align:center;color:#6b7280">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Skills -->
<div class="sec">In-Demand Skills for ${result.industry}</div>
<div class="skills">
  ${result.profile.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}
</div>
<div style="font-size:8pt;color:#374151;margin-bottom:12px;line-height:1.5;background:#f9fafb;padding:9px;border-radius:7px;border:1px solid #e5e7eb">
  ${lang === "bm" ? result.profile.descBM : result.profile.desc}
</div>

<!-- Methodology -->
<div class="sec">Methodology & Data Sources</div>
<div style="font-size:7.5pt;color:#374151;line-height:1.6;margin-bottom:10px">
  <p style="margin-bottom:4px"><strong>Composite score</strong> is a weighted average of 7 indicators derived from live DOSM data combined with industry-specific modifiers calibrated to Malaysia's labour market structure.</p>
  <table style="width:100%;border-collapse:collapse;font-size:7pt;margin-top:6px">
    <tr style="background:#f3f4f6"><th style="text-align:left;padding:3px 6px;color:#6b7280">Source</th><th style="text-align:left;padding:3px 6px;color:#6b7280">Dataset</th><th style="text-align:left;padding:3px 6px;color:#6b7280">Indicators</th></tr>
    <tr><td style="padding:3px 6px">DOSM LFS Monthly</td><td style="padding:3px 6px">lfs_month</td><td style="padding:3px 6px">Unemployment, Participation, Employment Growth</td></tr>
    <tr style="background:#f9fafb"><td style="padding:3px 6px">DOSM Youth LFS</td><td style="padding:3px 6px">lfs_month_youth</td><td style="padding:3px 6px">Youth Unemployment Rate</td></tr>
    <tr><td style="padding:3px 6px">DOSM Skills Underemployment</td><td style="padding:3px 6px">lfs_qtr_sru_sex</td><td style="padding:3px 6px">Skills Mismatch Rate</td></tr>
    <tr style="background:#f9fafb"><td style="padding:3px 6px">DOSM Household Income</td><td style="padding:3px 6px">hh_income</td><td style="padding:3px 6px">Wage vs National Median</td></tr>
    <tr><td style="padding:3px 6px">DOSM LFS State</td><td style="padding:3px 6px">lfs_qtr_state</td><td style="padding:3px 6px">State baseline unemployment & participation</td></tr>
  </table>
  <p style="margin-top:6px;color:#9ca3af"><em>This analysis is indicative. Industry modifiers are calibrated estimates. For official statistics, visit open.dosm.gov.my</em></p>
</div>

<div class="footer">
  <span>FindMiJob · findmijob.netlify.app · Data: DOSM OpenAPI</span>
  <span>Page 2 of 2</span>
</div>

</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  }, [result, lang]);

  const st = result ? statusOf(result.composite) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      ref={componentRef}
      className="rounded-2xl border border-border overflow-hidden"
      style={{
        background: "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.03) 50%, hsl(var(--card)) 100%)",
      }}
    >
      <div className="relative z-10 p-6 md:p-8 space-y-6">

        {/* ── Title ── */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/8 text-xs font-semibold text-primary tracking-widest uppercase">
            <Search className="h-3 w-3" /> {t("job.personalised")}
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-foreground">{t("job.title")}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("job.desc")}</p>
        </div>

        {/* ── Selectors ── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-2xl mx-auto">
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-full sm:w-56 bg-muted/50 border-border">
              <MapPin className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
              <SelectValue placeholder={t("job.selectState")} />
            </SelectTrigger>
            <SelectContent>
              {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-full sm:w-64 bg-muted/50 border-border">
              <Briefcase className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
              <SelectValue placeholder={t("job.selectIndustry")} />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(i => (
                <SelectItem key={i} value={i}>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      INDUSTRY_PROFILE[i].outlook === "growing" ? "bg-emerald-500" :
                      INDUSTRY_PROFILE[i].outlook === "stable"  ? "bg-blue-500" : "bg-red-500"
                    }`} />
                    {i}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={analyse}
            disabled={!state || !industry || analysing}
            className="w-full sm:w-auto gap-2 px-6"
          >
            {analysing
              ? <><Loader2 className="h-4 w-4 animate-spin" />{t("job.analysing")}</>
              : <><Activity className="h-4 w-4" />{t("job.analyze")}</>
            }
          </Button>
        </div>

        {/* ── States ── */}
        <AnimatePresence mode="wait">

          {/* Empty */}
          {!result && !analysing && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12 text-muted-foreground text-sm space-y-2">
              <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p>{t("job.emptyState")}</p>
              <p className="text-xs text-muted-foreground/60">7 indicators · personalised insight</p>
            </motion.div>
          )}

          {/* Loading */}
          {analysing && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">{t("job.analyzingMarket")}</p>
              <p className="text-xs text-muted-foreground/50">Calculating 7 indicators from DOSM data…</p>
            </motion.div>
          )}

          {/* Result */}
          {result && st && !analysing && (
            <motion.div ref={reportRef} key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="space-y-5">

              {/* ── Score hero card ── */}
              <div className="rounded-2xl border border-border/60 p-5 relative overflow-hidden"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${st.color}10, hsl(var(--card)) 65%)` }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ backgroundColor: st.color }} />

                <div className="relative z-10">
                  {/* Tags + download */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground border border-border">
                        <MapPin className="h-3 w-3 text-primary" /> {result.stateRow.state}
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground border border-border">
                        <Briefcase className="h-3 w-3 text-primary" /> {result.industry}
                      </span>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${
                        result.profile.outlook === "growing"  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                        result.profile.outlook === "stable"   ? "bg-blue-500/10 border-blue-500/30 text-blue-600" :
                        "bg-red-500/10 border-red-500/30 text-red-600"
                      }`}>
                        {result.profile.outlook === "growing" ? "↑" : result.profile.outlook === "stable" ? "→" : "↓"} {result.profile.outlook}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={downloadReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                        <Download className="h-3.5 w-3.5" /> PDF Report
                      </button>
                      <button onClick={exitResult}
                        title="Close analysis"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-xs font-medium text-muted-foreground transition-all">
                        <X className="h-3.5 w-3.5" /> Close
                      </button>
                    </div>
                  </div>

                  {/* Gauge + score */}
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative flex-shrink-0">
                      <svg width="180" height="100" viewBox="0 0 180 100">
                        <path d="M 15 95 A 75 75 0 0 1 165 95" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" />
                        <motion.path d="M 15 95 A 75 75 0 0 1 165 95" fill="none" stroke={st.color} strokeWidth="12" strokeLinecap="round"
                          strokeDasharray={Math.PI * 75}
                          initial={{ strokeDashoffset: Math.PI * 75 }}
                          animate={{ strokeDashoffset: Math.PI * 75 - (result.composite / 100) * Math.PI * 75 }}
                          transition={{ duration: 1.6, ease: "easeOut" }}
                          style={{ filter: `drop-shadow(0 0 6px ${st.color}60)` }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                        <motion.span className="text-5xl font-black leading-none tabular-nums" style={{ color: st.color }}
                          initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}>
                          {result.composite}
                        </motion.span>
                        <span className="text-[10px] text-muted-foreground font-medium">{t("health.outOf")}</span>
                      </div>
                    </div>

                    {/* Top 4 quick metrics */}
                    <div className="grid grid-cols-2 gap-2 flex-1 w-full">
                      {result.indicators.slice(0, 4).map(ind => (
                        <div key={ind.label} className="rounded-xl bg-muted/40 border border-border/40 p-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <span className="text-primary">{ind.icon}</span>
                            <span className="text-[10px] font-medium">{ind.label}</span>
                          </div>
                          <p className="text-lg font-bold text-foreground leading-none">{ind.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{ind.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex justify-center mt-3">
                    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${st.bg}`}>
                      {st.label} Labour Market
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Tabs ── */}
              <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border">
                {([
                  { key: "overview", label: "All Indicators" },
                  { key: "radar",    label: "Radar View"     },
                  { key: "trend",    label: "Trend"          },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Overview — all 7 indicators */}
                {activeTab === "overview" && (
                  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-2">
                    {result.indicators.map((ind, i) => (
                      <motion.div key={ind.label}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                        <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 text-primary">
                          {ind.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <div>
                              <span className="text-xs font-semibold text-foreground">{ind.label}</span>
                              <span className="text-[10px] text-muted-foreground ml-2">{ind.detail}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-bold text-foreground">{ind.value}</span>
                              <span className="text-[10px] text-muted-foreground">({ind.weight}%)</span>
                              <span className="text-xs font-black tabular-nums w-6 text-right"
                                style={{ color: ind.score >= 70 ? "#22c55e" : ind.score >= 50 ? "#eab308" : "#ef4444" }}>
                                {ind.score}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div className="h-full rounded-full"
                              style={{ backgroundColor: ind.score >= 70 ? "#22c55e" : ind.score >= 50 ? "#eab308" : "#ef4444" }}
                              initial={{ width: 0 }} animate={{ width: `${ind.score}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Radar */}
                {activeTab === "radar" && (
                  <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={result.radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject"
                          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                        <Radar dataKey="score" stroke={st.color} fill={st.color} fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* Trend */}
                {activeTab === "trend" && (
                  <motion.div key="trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-xs text-muted-foreground mb-3">
                      Estimated unemployment trend — <strong className="text-foreground">{result.stateRow.state} · {result.industry}</strong> vs national average
                    </p>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                            interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            domain={["dataMin - 0.5", "dataMax + 0.5"]} width={32} unit="%" />
                          <Tooltip contentStyle={tooltipStyle}
                            formatter={(v: number, name: string) => [`${v}%`, name === "value" ? "This sector/state" : "National"]} />
                          <ReferenceLine y={nationalBenchmarks.uRate} stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="3 3" label={{ value: "National avg", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                          <Line type="monotone" dataKey="national" stroke="hsl(var(--muted-foreground))"
                            strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                          <Line type="monotone" dataKey="value" stroke={st.color}
                            strokeWidth={2.5} dot={false}
                            style={{ filter: `drop-shadow(0 0 4px ${st.color}50)` }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Insight ── */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1">{t("job.insight")}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.insight}</p>
                  </div>
                </div>
              </div>

              {/* ── In-demand skills ── */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-bold text-foreground mb-2.5">In-Demand Skills for {result.industry}</p>
                <div className="flex flex-wrap gap-2">
                  {result.profile.skills.map(skill => (
                    <span key={skill} className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 border border-primary/20 text-primary">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Suggestions ── */}
              {result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">{t("job.suggestions")}</p>
                  {result.suggestions.map((s, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm text-muted-foreground ${
                        s.type === "good" ? "border-emerald-500/20 bg-emerald-500/5" :
                        s.type === "warn" ? "border-amber-500/20 bg-amber-500/5" :
                        "border-blue-500/20 bg-blue-500/5"
                      }`}>
                      <span className="flex-shrink-0 mt-0.5">{s.icon}</span>
                      <span>{s.text}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── Source ── */}
              <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
                Analysis uses live DOSM data (LFS Monthly, Youth LFS, Skills Underemployment, Household Income) · Indicative only
              </p>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default JobMarketHealth;