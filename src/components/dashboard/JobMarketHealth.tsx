import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Briefcase, Target, TrendingUp, TrendingDown,
  Lightbulb, Search, Loader2, Activity, Download,
  AlertTriangle, Users, DollarSign, Clock, GraduationCap, BarChart2, X,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useLabourData } from "@/context/LabourDataContext";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { latestStateData } from "@/data/labourData";
import { labourMarketData } from "@/data/labourMarketData";
import { myCOL } from "@/data/criticalOccupations";
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

const INDUSTRY_LABEL_BM: Record<Industry, string> = {
  "Technology & Digital":     "Teknologi & Digital",
  "Manufacturing":            "Pembuatan",
  "Services & Retail":        "Perkhidmatan & Runcit",
  "Construction":             "Pembinaan",
  "Agriculture & Plantation": "Pertanian & Ladang",
  "Finance & Insurance":      "Kewangan & Insurans",
  "Healthcare & Social Work": "Penjagaan Kesihatan & Kerja Sosial",
  "Education":                "Pendidikan",
  "Tourism & Hospitality":    "Pelancongan & Hospitaliti",
  "Creative & Media":         "Kreatif & Media",
};

interface IndustryProfile {
  uMod:        number;
  pMod:        number;
  gMod:        number;
  youthMod:    number;
  mismatchMod: number;
  wageMod:     number;
  stabilityMod:number;
  desc:        string;
  descBM:      string;
  skills:      string[];
  skillsBM:    string[];
  outlook:     "growing" | "stable" | "declining";
}

const INDUSTRY_PROFILE: Record<Industry, IndustryProfile> = {
  "Technology & Digital": {
    uMod: -0.9, pMod: 3.5, gMod: 2.8, youthMod: -2.0, mismatchMod: -3.0, wageMod: 45, stabilityMod: -0.5,
    desc: "High demand for digital skills with strong salary premiums and low unemployment. AI, cloud and cybersecurity are key growth areas.",
    descBM: "Permintaan tinggi untuk kemahiran digital dengan premium gaji yang kukuh dan pengangguran rendah. AI, pengkomputeran awan dan keselamatan siber adalah bidang pertumbuhan utama.",
    skills:   ["Python / AI",      "Cloud Computing",      "Cybersecurity",  "Data Analytics"],
    skillsBM: ["Python / AI",      "Pengkomputeran Awan",  "Keselamatan Siber", "Analitik Data"],
    outlook: "growing",
  },
  "Manufacturing": {
    uMod: 0.2, pMod: 1.0, gMod: 0.5, youthMod: 1.5, mismatchMod: 1.0, wageMod: -5, stabilityMod: 0.5,
    desc: "Steady industrial output with automation reshaping workforce needs. EV and semiconductor supply chains creating new opportunities.",
    descBM: "Output industri yang stabil dengan automasi membentuk semula keperluan tenaga kerja. Rantaian bekalan EV dan semikonduktor mewujudkan peluang baharu.",
    skills:   ["CNC Operation",    "Quality Control",  "Automation",        "Lean Manufacturing"],
    skillsBM: ["Operasi CNC",      "Kawalan Kualiti",  "Automasi",          "Pengilangan Lean"],
    outlook: "stable",
  },
  "Services & Retail": {
    uMod: -0.2, pMod: 2.0, gMod: 1.2, youthMod: -1.0, mismatchMod: 2.5, wageMod: -15, stabilityMod: 1.5,
    desc: "Broad employment base but high skills mismatch and lower wages. E-commerce growth offsetting traditional retail contraction.",
    descBM: "Asas pekerjaan yang luas tetapi ketidakpadanan kemahiran tinggi dan gaji lebih rendah. Pertumbuhan e-dagang mengimbangi pengurangan runcit tradisional.",
    skills:   ["Customer Service",    "E-Commerce",     "Logistics",         "Digital Marketing"],
    skillsBM: ["Perkhidmatan Pelanggan", "E-Dagang",    "Logistik",          "Pemasaran Digital"],
    outlook: "stable",
  },
  "Construction": {
    uMod: 0.6, pMod: -1.0, gMod: 0.8, youthMod: 2.0, mismatchMod: -1.0, wageMod: -8, stabilityMod: 2.5,
    desc: "Infrastructure projects sustaining demand but seasonal volatility is high. Green building and smart construction creating skilled trades demand.",
    descBM: "Projek infrastruktur mengekalkan permintaan tetapi volatiliti bermusim tinggi. Bangunan hijau mewujudkan permintaan pekerja mahir.",
    skills:   ["Civil Engineering",  "Green Building",  "BIM",                "Project Management"],
    skillsBM: ["Kejuruteraan Awam",  "Bangunan Hijau",  "BIM",                "Pengurusan Projek"],
    outlook: "stable",
  },
  "Agriculture & Plantation": {
    uMod: 0.9, pMod: -2.5, gMod: -0.8, youthMod: 3.0, mismatchMod: -2.0, wageMod: -30, stabilityMod: 1.0,
    desc: "Structural workforce decline as mechanisation displaces traditional roles. Agri-tech and sustainable farming offer niche growth opportunities.",
    descBM: "Penurunan tenaga kerja berstruktur akibat penjantraan. Agri-teknologi menawarkan peluang pertumbuhan khusus.",
    skills:   ["AgriTech",           "Precision Farming",   "Supply Chain",   "Food Processing"],
    skillsBM: ["AgriTech",           "Pertanian Presisi",   "Rantaian Bekalan","Pemprosesan Makanan"],
    outlook: "declining",
  },
  "Finance & Insurance": {
    uMod: -0.7, pMod: 2.5, gMod: 1.8, youthMod: -1.5, mismatchMod: -2.5, wageMod: 35, stabilityMod: -1.0,
    desc: "Fintech expansion and Islamic finance growth driving strong demand. High salary premiums and low unemployment make this a competitive field.",
    descBM: "Pengembangan fintech dan kewangan Islam mendorong permintaan yang kukuh. Premium gaji tinggi menjadikan bidang ini sangat kompetitif.",
    skills:   ["Fintech",            "Risk Management",  "Islamic Finance",   "Data Analysis"],
    skillsBM: ["Fintech",            "Pengurusan Risiko", "Kewangan Islam",    "Analisis Data"],
    outlook: "growing",
  },
  "Healthcare & Social Work": {
    uMod: -1.1, pMod: 3.0, gMod: 2.2, youthMod: -2.5, mismatchMod: -3.5, wageMod: 20, stabilityMod: -1.5,
    desc: "Sustained structural demand driven by ageing population and healthcare expansion. One of Malaysia's most shortage-affected sectors.",
    descBM: "Permintaan berstruktur yang berterusan didorong oleh penuaan penduduk. Sektor yang paling kekurangan tenaga mahir di Malaysia.",
    skills:   ["Clinical Care",     "Mental Health",    "Medical Technology",  "Gerontology"],
    skillsBM: ["Penjagaan Klinikal","Kesihatan Mental",  "Teknologi Perubatan", "Gerontologi"],
    outlook: "growing",
  },
  "Education": {
    uMod: -0.3, pMod: 1.2, gMod: 0.6, youthMod: -1.0, mismatchMod: 1.5, wageMod: 5, stabilityMod: -2.0,
    desc: "Stable public-sector employment with growing EdTech and private tuition demand. Higher education reform creating new curriculum roles.",
    descBM: "Pekerjaan sektor awam yang stabil dengan permintaan EdTech dan tuisyen swasta yang meningkat.",
    skills:   ["EdTech",             "Curriculum Design",  "Special Education", "STEM Teaching"],
    skillsBM: ["EdTech",             "Reka Bentuk Kurikulum","Pendidikan Khas",  "Pengajaran STEM"],
    outlook: "stable",
  },
  "Tourism & Hospitality": {
    uMod: 0.5, pMod: -1.0, gMod: 1.5, youthMod: -0.5, mismatchMod: 1.0, wageMod: -20, stabilityMod: 3.0,
    desc: "Tourism rebound post-pandemic creating roles but seasonal volatility and lower wages remain challenges. ASEAN travel recovery is a tailwind.",
    descBM: "Pemulihan pelancongan selepas pandemik mewujudkan peluang kerja tetapi gaji lebih rendah kekal cabaran.",
    skills:   ["Hospitality Management","Tourism Tech",  "Event Planning",    "Languages"],
    skillsBM: ["Pengurusan Hospitaliti", "Teknologi Pelancongan","Perancangan Acara","Bahasa"],
    outlook: "growing",
  },
  "Creative & Media": {
    uMod: 0.3, pMod: 0.5, gMod: 1.0, youthMod: -2.0, mismatchMod: 2.0, wageMod: -10, stabilityMod: 2.0,
    desc: "Growing demand for content creators, UX designers and digital storytellers. Freelance and gig arrangements are common in this sector.",
    descBM: "Permintaan meningkat untuk pencipta kandungan, pereka UX dan pencerita digital. Kerja bebas dan gig adalah biasa dalam sektor ini.",
    skills:   ["UI/UX Design",      "Content Creation",  "Video Production",  "Branding"],
    skillsBM: ["Reka Bentuk UI/UX", "Penciptaan Kandungan","Produksi Video",   "Penjenamaan"],
    outlook: "growing",
  },
};

const INDUSTRY_TO_ROLES: Record<Industry, string[]> = {
  "Technology & Digital":     ["Software Developers","Cybersecurity Professionals","Data Scientists & Analysts","Systems Analysts","Cloud Engineers","ICT Project Managers","AI / Machine Learning Engineers","UI / UX Designers"],
  "Manufacturing":            ["Civil Engineers","Mechanical Engineers","Electrical Engineers","Chemical Engineers","Industrial Engineers","Production Managers","Quality Control Managers","Plant & Machine Operators","Welders","Instrumentation Technicians"],
  "Services & Retail":        ["Sales & Marketing Managers","Supply Chain Managers","Human Resources Managers"],
  "Construction":             ["Civil Engineers","Mechanical Engineers","Electrical Engineers","Draughtspersons","Surveying Technicians","Welders"],
  "Agriculture & Plantation": [],
  "Finance & Insurance":      ["Finance Managers","Actuaries","Managing Directors & Chief Executives","Data Scientists & Analysts"],
  "Healthcare & Social Work": ["Specialist Medical Practitioners","Registered Nurses","Pharmacists","Physiotherapists","Medical Imaging Professionals"],
  "Education":                [],
  "Tourism & Hospitality":    [],
  "Creative & Media":         ["Animators","Visual Effects Artists","Game Designers & Developers","Esports Professionals","UI / UX Designers"],
};

interface CriticalRoleMatch {
  title:       string;
  sector:      string;
  sectorColor: string;
  isNew?:      boolean;
}

function getCriticalRolesForIndustry(industry: Industry): { roles: CriticalRoleMatch[]; sectors: string[] } {
  const wantedTitles = INDUSTRY_TO_ROLES[industry] ?? [];
  if (!wantedTitles.length) return { roles: [], sectors: [] };
  const allRoles = myCOL.sectors.flatMap(s =>
    s.roles.map(r => ({ title: r.title, sector: s.sector, sectorColor: s.color, isNew: r.isNew }))
  );
  const matched = wantedTitles
    .map(title => allRoles.find(r => r.title === title))
    .filter((r) => r != null) as CriticalRoleMatch[];
  const sectors = [...new Set(matched.map(r => r.sector))];
  return { roles: matched, sectors };
}

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

function statusOf(score: number) {
  if (score >= 81) return { key: "health.strong",     color: "#22c55e", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" };
  if (score >= 61) return { key: "health.healthy",    color: "#3b82f6", bg: "bg-blue-500/10 border-blue-500/30 text-blue-500"         };
  if (score >= 41) return { key: "health.recovering", color: "#eab308", bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"   };
  return               { key: "health.weak",         color: "#ef4444", bg: "bg-red-500/10 border-red-500/30 text-red-500"             };
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

interface AnalysisResult {
  composite:      number;
  indicators:     { labelKey: string; icon: React.ReactNode; value: string; score: number; weight: number; detailKey: string; detailVal: string }[];
  trendData:      { label: string; value: number; national: number }[];
  radarData:      { subject: string; score: number; fullMark: 100 }[];
  insight:        string;
  suggestions:    { icon: React.ReactNode; text: string; type: "good" | "warn" | "info" }[];
  stateRow:       { u_rate: number; p_rate: number; state: string };
  industry:       Industry;
  uRate:          number;
  pRate:          number;
  growth:         number;
  wage:           number;
  profile:        IndustryProfile;
  criticalRoles:  CriticalRoleMatch[];
  matchedSectors: string[];
}

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
    componentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const nationalBenchmarks = useMemo(() => {
    if (!labourData?.national?.length) return { uRate: 3.3, pRate: 70.4, medianWage: 6338 };
    const sorted = [...labourData.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const medianWage = labourData.wages?.length
      ? [...labourData.wages].filter((d: any) => d.income_median)
          .sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-1)[0]?.income_median ?? 6338
      : 6338;
    return { uRate: latest.u_rate ?? 3.3, pRate: latest.p_rate ?? 70.4, medianWage };
  }, [labourData]);

  const nationalYouthRate = useMemo(() => {
    if (!labourData?.youth?.length) return 11.0;
    const sorted = [...labourData.youth].filter((d: any) => d.u_rate != null)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    return sorted[sorted.length - 1]?.u_rate ?? 11.0;
  }, [labourData]);

  const nationalMismatchRate = useMemo(() => {
    if (!labourData?.mismatch?.length) return 12.0;
    const latest = [...labourData.mismatch].filter((d: any) => d.date)
      .sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(-1)[0];
    return latest?.sru_rate ?? latest?.rate ?? 12.0;
  }, [labourData]);

  const analyse = useCallback(() => {
    if (!state || !industry) return;
    setAnalysing(true);
    setResult(null);
    setActiveTab("overview");

    setTimeout(() => {
      const stateRow  = latestStateData.find(s => s.state === state)!;
      const profile   = INDUSTRY_PROFILE[industry as Industry];
      const nat       = nationalBenchmarks;
      const last12    = labourMarketData.slice(-12);
      const latestNat = labourMarketData[labourMarketData.length - 1];

      const { roles: criticalRoles, sectors: matchedSectors } =
        getCriticalRolesForIndustry(industry as Industry);

      const uRate     = clamp(+(stateRow.u_rate + profile.uMod).toFixed(1), 0.5, 15);
      const pRate     = clamp(+(stateRow.p_rate + profile.pMod).toFixed(1), 50, 90);
      const growth    = +((latestNat.employmentGrowthPercent ?? 0.1) + profile.gMod).toFixed(2);
      const youthRate = clamp(+(nationalYouthRate + profile.youthMod).toFixed(1), 1, 30);
      const mismatch  = clamp(+(nationalMismatchRate + profile.mismatchMod).toFixed(1), 2, 30);
      const wage      = Math.round(nat.medianWage * (1 + profile.wageMod / 100));
      const stability = clamp(80 - profile.stabilityMod * 8);

      const uScore = clamp(((6 - uRate) / 5.5) * 100);
      const pScore = clamp(((pRate - 60) / 22) * 100);
      const gScore = clamp(((growth + 1) / 4) * 100);
      const yScore = clamp(((25 - youthRate) / 20) * 100);
      const mScore = clamp(((25 - mismatch) / 20) * 100);
      const wScore = clamp(((wage / nat.medianWage) / 2) * 100);
      const sScore = stability;

      const composite = Math.round(
        uScore * 0.22 + pScore * 0.18 + gScore * 0.15 +
        yScore * 0.15 + mScore * 0.12 + wScore * 0.12 + sScore * 0.06
      );

      const indicators = [
        { labelKey: "job.ind.unemploymentRate",  icon: <Target className="h-3.5 w-3.5" />,    value: `${uRate}%`,                    score: Math.round(uScore), weight: 22, detailKey: "job.ind.vsNational",    detailVal: `${nat.uRate}%`   },
        { labelKey: "job.ind.participationRate", icon: <Users className="h-3.5 w-3.5" />,     value: `${pRate}%`,                    score: Math.round(pScore), weight: 18, detailKey: "job.ind.vsNational",    detailVal: `${nat.pRate}%`   },
        { labelKey: "job.ind.empGrowth",         icon: <TrendingUp className="h-3.5 w-3.5" />,value: `${growth > 0 ? "+" : ""}${growth}%`, score: Math.round(gScore), weight: 15, detailKey: "job.ind.monthOnMonth", detailVal: "" },
        { labelKey: "job.ind.youthUnemp",        icon: <GraduationCap className="h-3.5 w-3.5" />, value: `${youthRate}%`,           score: Math.round(yScore), weight: 15, detailKey: "job.ind.ages1524",      detailVal: ""                },
        { labelKey: "job.ind.skillsMismatch",    icon: <AlertTriangle className="h-3.5 w-3.5" />, value: `${mismatch}%`,            score: Math.round(mScore), weight: 12, detailKey: "job.ind.gradsWrongJobs",detailVal: ""                },
        { labelKey: "job.ind.wageNational",      icon: <DollarSign className="h-3.5 w-3.5" />,value: `RM ${wage.toLocaleString()}`, score: Math.round(wScore), weight: 12, detailKey: "job.ind.nationalMedian", detailVal: `RM ${nat.medianWage.toLocaleString()}` },
        { labelKey: "job.ind.jobStability",      icon: <Clock className="h-3.5 w-3.5" />,     value: `${Math.round(sScore)}%`,       score: Math.round(sScore), weight: 6,  detailKey: "job.ind.lowTurnover",   detailVal: ""                },
      ];

      const radarData: { subject: string; score: number; fullMark: 100 }[] = [
        { subject: lang === "bm" ? "Kerja" : "Jobs",      score: Math.round(uScore), fullMark: 100 },
        { subject: lang === "bm" ? "Guna Tenaga" : "Workforce", score: Math.round(pScore), fullMark: 100 },
        { subject: lang === "bm" ? "Pertumbuhan" : "Growth", score: Math.round(gScore), fullMark: 100 },
        { subject: lang === "bm" ? "Belia" : "Youth",     score: Math.round(yScore), fullMark: 100 },
        { subject: lang === "bm" ? "Kemahiran" : "Skills",score: Math.round(mScore), fullMark: 100 },
        { subject: lang === "bm" ? "Gaji" : "Wage",       score: Math.round(wScore), fullMark: 100 },
        { subject: lang === "bm" ? "Kestabilan" : "Stability", score: Math.round(sScore), fullMark: 100 },
      ];

      const trendData = last12.map(d => ({
        label:    d.label,
        value:    +(d.uRate + profile.uMod + (Math.random() * 0.3 - 0.15)).toFixed(1),
        national: +(d.uRate).toFixed(1),
      }));

      const st        = statusOf(composite);
      const statusLbl = lang === "bm"
        ? { "health.strong": "Kukuh", "health.healthy": "Sihat", "health.recovering": "Sedang Pulih", "health.weak": "Lemah" }[st.key] ?? st.key
        : { "health.strong": "Strong", "health.healthy": "Healthy", "health.recovering": "Recovering", "health.weak": "Weak" }[st.key] ?? st.key;
      const desc      = lang === "bm" ? profile.descBM : profile.desc;

      const industryLabel = lang === "bm" ? (INDUSTRY_LABEL_BM[industry as Industry] ?? industry) : industry;

      const insight = lang === "bm"
        ? `Sektor ${industryLabel} di ${state} menunjukkan keadaan pasaran buruh yang ${statusLbl.toLowerCase()} dengan kadar pengangguran ${uRate}% berbanding kebangsaan ${nat.uRate}%. ${desc}`
        : `The ${industry} sector in ${state} shows ${statusLbl.toLowerCase()} labour market conditions, unemployment at ${uRate}% vs national ${nat.uRate}%. ${desc}`;

      const allScores = Object.entries(INDUSTRY_PROFILE).map(([name, p]) => ({
        name,
        score: Math.round(
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
      const topLabel = lang === "bm" ? (INDUSTRY_LABEL_BM[top.name as Industry] ?? top.name) : top.name;
      if (top.name !== industry) {
        suggestions.push({
          icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
          text: lang === "bm"
            ? `${topLabel} mendapat skor tertinggi di ${state} (${top.score}/100), pertimbangkan kemahiran silang sektor.`
            : `${top.name} scores highest in ${state} (${top.score}/100), consider cross-sector skilling.`,
          type: "good",
        });
      }
      if (criticalRoles.length > 0) {
        const newCount = criticalRoles.filter(r => r.isNew).length;
        const topThree = criticalRoles.slice(0, 3).map(r => r.title).join(", ");
        suggestions.push({
          icon: <Sparkles className="h-4 w-4 text-violet-500" />,
          text: lang === "bm"
            ? `${criticalRoles.length} pekerjaan kritikal MyCOL sepadan dengan ${industryLabel}${newCount > 0 ? ` (${newCount} baharu dalam ${myCOL.edition})` : ""}. Sasaran utama: ${topThree}. Status kekurangan bermakna leverage gaji yang lebih kukuh.`
            : `${criticalRoles.length} MyCOL critical roles match ${industry}${newCount > 0 ? ` (${newCount} new in ${myCOL.edition})` : ""}. Top targets: ${topThree}. Shortage status means stronger salary leverage.`,
          type: "good",
        });
      }
      if (mismatch > 15) {
        const skill0 = lang === "bm" ? profile.skillsBM[0] : profile.skills[0];
        const skill1 = lang === "bm" ? profile.skillsBM[1] : profile.skills[1];
        suggestions.push({
          icon: <GraduationCap className="h-4 w-4 text-amber-500" />,
          text: lang === "bm"
            ? `Ketidakpadanan kemahiran tinggi (${mismatch}%) dalam ${industryLabel}, sijil ${skill0} dan ${skill1} meningkatkan kebolehpasaran.`
            : `High skills mismatch (${mismatch}%) in ${industry}, certifications in ${skill0} and ${skill1} improve employability.`,
          type: "warn",
        });
      }
      if (youthRate > nationalYouthRate) {
        suggestions.push({
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          text: lang === "bm"
            ? `Pengangguran belia dalam sektor ini (${youthRate}%) melebihi purata belia kebangsaan, laluan latihan dan perantisan sangat penting.`
            : `Youth unemployment in this sector (${youthRate}%) exceeds the national youth average, internship and apprenticeship pathways are critical.`,
          type: "warn",
        });
      }
      const skillsList = (lang === "bm" ? profile.skillsBM : profile.skills).join(" · ");
      suggestions.push({
        icon: <Lightbulb className="h-4 w-4 text-blue-400" />,
        text: lang === "bm"
          ? `Kemahiran dalam permintaan untuk ${industryLabel}: ${skillsList}`
          : `In-demand skills for ${industry}: ${skillsList}`,
        type: "info",
      });

      setResult({
        composite, indicators, trendData, radarData,
        insight, suggestions, stateRow, industry: industry as Industry,
        uRate, pRate, growth, wage, profile,
        criticalRoles, matchedSectors,
      });
      setAnalysing(false);
    }, 1200);
  }, [state, industry, nationalBenchmarks, nationalYouthRate, nationalMismatchRate, lang]);

  // ── PDF report ─────────────────────────────────────────────────────────────
  const downloadReport = useCallback(() => {
    if (!result) return;
    const st           = statusOf(result.composite);
    const now          = new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
    const isBM         = lang === "bm";
    const statusLabel  = isBM
      ? ({ "health.strong": "Kukuh", "health.healthy": "Sihat", "health.recovering": "Sedang Pulih", "health.weak": "Lemah" } as Record<string,string>)[st.key] ?? ""
      : ({ "health.strong": "Strong", "health.healthy": "Healthy", "health.recovering": "Recovering", "health.weak": "Weak" } as Record<string,string>)[st.key] ?? "";
    const industryLabel = isBM ? (INDUSTRY_LABEL_BM[result.industry] ?? result.industry) : result.industry;

    const radarPoints = result.radarData.map((d, i) => {
      const angle = (i / result.radarData.length) * 2 * Math.PI - Math.PI / 2;
      const r     = (d.score / 100) * 70;
      return { x: 90 + r * Math.cos(angle), y: 90 + r * Math.sin(angle), label: d.subject, score: d.score };
    });
    const polyPoints  = radarPoints.map(p => `${p.x},${p.y}`).join(" ");
    const gridRings   = [25, 50, 75, 100].map(pct => {
      const pts = result.radarData.map((_, i) => {
        const angle = (i / result.radarData.length) * 2 * Math.PI - Math.PI / 2;
        const r     = (pct / 100) * 70;
        return `${90 + r * Math.cos(angle)},${90 + r * Math.sin(angle)}`;
      });
      return `<polygon points="${pts.join(" ")}" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>`;
    }).join("");
    const axisLines  = result.radarData.map((_, i) => {
      const angle = (i / result.radarData.length) * 2 * Math.PI - Math.PI / 2;
      return `<line x1="90" y1="90" x2="${90 + 70 * Math.cos(angle)}" y2="${90 + 70 * Math.sin(angle)}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    }).join("");
    const radarLabels = radarPoints.map(p => {
      const lx = 90 + 85 * Math.cos(Math.atan2(p.y - 90, p.x - 90));
      const ly = 90 + 85 * Math.sin(Math.atan2(p.y - 90, p.x - 90));
      return `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="7" fill="#6b7280">${p.label}</text>`;
    }).join("");
    const radarSVG = `<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      ${gridRings}${axisLines}
      <polygon points="${polyPoints}" fill="${st.color}30" stroke="${st.color}" stroke-width="1.5"/>
      ${radarPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="${st.color}"/>`).join("")}
      ${radarLabels}
    </svg>`;

    const tMin = Math.min(...result.trendData.map(d => Math.min(d.value, d.national))) - 0.3;
    const tMax = Math.max(...result.trendData.map(d => Math.max(d.value, d.national))) + 0.3;
    const tRange = tMax - tMin || 1;
    const tW = 320; const tH = 60;
    const toX = (i: number) => (i / (result.trendData.length - 1)) * tW;
    const toY = (v: number) => tH - ((v - tMin) / tRange) * tH;
    const sectorPts   = result.trendData.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");
    const nationalPts = result.trendData.map((d, i) => `${toX(i)},${toY(d.national)}`).join(" ");
    const trendSVG = `<svg width="${tW}" height="${tH}" viewBox="0 0 ${tW} ${tH}" xmlns="http://www.w3.org/2000/svg">
      <polyline points="${nationalPts}" fill="none" stroke="#9ca3af" stroke-width="1" stroke-dasharray="3 2"/>
      <polyline points="${sectorPts}"  fill="none" stroke="${st.color}" stroke-width="2"/>
    </svg>`;

    // ── Helpers ────────────────────────────────────────────────────────────
    const sc = (s: number) => s >= 70 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444";
    const bar = (score: number, color: string) =>
      `<div style="height:5px;border-radius:3px;background:#f3f4f6;overflow:hidden;margin-top:2px"><div style="height:100%;width:${score}%;background:${color};border-radius:3px"></div></div>`;
    const L = (en: string, bm: string) => isBM ? bm : en;

    // ── Critical roles block (page 2) ──────────────────────────────────────
    const criticalRolesSection = result.criticalRoles.length > 0 ? `
      <div class="sec">${L("MyCOL Critical Occupations","Pekerjaan Kritikal MyCOL")} (${result.criticalRoles.length})</div>
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:7px;padding:7px 9px;margin-bottom:7px">
        <p style="font-size:6.5pt;color:#6b21a8;margin-bottom:5px;line-height:1.4">${
          L(`Roles in <strong>${result.industry}</strong> flagged as critical by TalentCorp & ILMIA in MyCOL ${myCOL.edition}. Shortage = stronger demand and salary leverage.`,
            `Pekerjaan dalam <strong>${industryLabel}</strong> yang ditandakan kritikal oleh TalentCorp & ILMIA dalam MyCOL ${myCOL.edition}. Kekurangan = permintaan dan leverage gaji lebih kukuh.`)
        }</p>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px">
          ${result.criticalRoles.slice(0, 12).map(r =>
            `<div style="font-size:6.5pt;padding:3px 6px;background:#fff;border-radius:4px;border-left:2px solid ${r.sectorColor};display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title}</span>
              ${r.isNew ? `<span style="font-size:5.5pt;font-weight:700;background:#fef3c7;color:#92400e;padding:1px 3px;border-radius:2px;flex-shrink:0;margin-left:3px">${L("NEW","BAHARU")}</span>` : ""}
            </div>`
          ).join("")}
        </div>
        ${result.criticalRoles.length > 12 ? `<p style="font-size:6pt;color:#9ca3af;text-align:center;margin-top:4px;font-style:italic">+ ${result.criticalRoles.length - 12} ${L("more","lagi")}</p>` : ""}
      </div>` : "";

    // ── Indicator score summary table (page 2) ─────────────────────────────
    const indSummaryTable = `
      <div class="sec">${L("Indicator Score Summary","Ringkasan Skor Petunjuk")}</div>
      <table style="margin-bottom:7px">
        <thead><tr>
          <th style="width:40%">${L("Indicator","Petunjuk")}</th>
          <th style="text-align:center;width:20%">${L("Value","Nilai")}</th>
          <th style="text-align:center;width:15%">${L("Score","Skor")}</th>
          <th style="text-align:center;width:15%">${L("Weight","Berat")}</th>
        </tr></thead>
        <tbody>
          ${result.indicators.map((ind, i) => {
            const c = sc(ind.score);
            return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
              <td style="font-weight:600">${t(ind.labelKey)}</td>
              <td style="text-align:center;font-weight:700">${ind.value}</td>
              <td style="text-align:center;font-weight:700;color:${c}">${ind.score}</td>
              <td style="text-align:center;color:#6b7280">${ind.weight}%</td>
            </tr>`;
          }).join("")}
          <tr style="background:#f3f4f6">
            <td style="font-weight:800">${L("COMPOSITE SCORE","SKOR KOMPOSIT")}</td>
            <td></td>
            <td style="text-align:center;font-weight:800;color:${st.color}">${result.composite}</td>
            <td style="text-align:center;color:#6b7280;font-weight:700">100%</td>
          </tr>
        </tbody>
      </table>`;

    // ── Methodology table (page 2) ─────────────────────────────────────────
    const methodologyTable = `
      <div class="sec">${L("Methodology & Data Sources","Metodologi & Sumber Data")}</div>
      <p style="font-size:6.5pt;color:#374151;line-height:1.5;margin-bottom:5px">${
        L(`Composite score is a weighted average of 7 DOSM-backed indicators with industry-specific calibrated modifiers. Critical role matching uses MyCOL ${myCOL.edition} from TalentCorp & ILMIA.`,
          `Skor komposit adalah purata berwajaran 7 petunjuk DOSM dengan pengubah yang dikalibrasi mengikut industri. Pemetaan pekerjaan kritikal menggunakan MyCOL ${myCOL.edition} daripada TalentCorp & ILMIA.`)
      }</p>
      <table style="margin-bottom:7px">
        <thead><tr>
          <th>${L("Source","Sumber")}</th>
          <th>${L("Dataset","Dataset")}</th>
          <th>${L("Used For","Digunakan Untuk")}</th>
        </tr></thead>
        <tbody>
          <tr><td>DOSM LFS ${L("Monthly","Bulanan")}</td><td>lfs_month</td><td>${L("Unemployment, Participation, Employment Growth","Pengangguran, Penyertaan, Pertumbuhan Pekerjaan")}</td></tr>
          <tr style="background:#f9fafb"><td>DOSM ${L("Youth LFS","LFS Belia")}</td><td>lfs_month_youth</td><td>${L("Youth Unemployment Rate","Kadar Pengangguran Belia")}</td></tr>
          <tr><td>DOSM ${L("Skills Underemployment","Guna Tenaga Tidak Penuh")}</td><td>lfs_qtr_sru_sex</td><td>${L("Skills Mismatch Rate","Kadar Ketidakpadanan Kemahiran")}</td></tr>
          <tr style="background:#f9fafb"><td>DOSM ${L("Household Income","Pendapatan Isi Rumah")}</td><td>hh_income</td><td>${L("Wage vs National Median","Gaji berbanding Median Kebangsaan")}</td></tr>
          <tr><td>DOSM LFS ${L("State","Negeri")}</td><td>lfs_qtr_state</td><td>${L("State baseline unemployment & participation","Asas pengangguran & penyertaan negeri")}</td></tr>
          <tr style="background:#f9fafb"><td>TalentCorp MyCOL</td><td>${myCOL.edition}</td><td>${L("Critical occupations and shortage roles","Pekerjaan kritikal dan pekerjaan berkekurangan")}</td></tr>
        </tbody>
      </table>
      <p style="font-size:6pt;color:#9ca3af;font-style:italic">${L("Indicative only. For official statistics visit open.dosm.gov.my and talentcorp.com.my/mycol","Anggaran sahaja. Untuk statistik rasmi layari open.dosm.gov.my dan talentcorp.com.my/mycol")}</p>`;

    // ── Assemble HTML ──────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>FindMiJob · ${result.stateRow.state} · ${industryLabel}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Plus Jakarta Sans',sans-serif; color:#111827; font-size:8pt; line-height:1.35; }
@page { size:A4; margin:13mm 13mm 11mm 13mm; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
.page-break { page-break-before:always; }
.header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:7px; border-bottom:2px solid ${st.color}; margin-bottom:10px; }
.logo { font-size:11pt; font-weight:800; color:${st.color}; }
.meta { text-align:right; font-size:6.5pt; color:#6b7280; }
.hero { display:grid; grid-template-columns:105px 1fr; gap:10px; background:#f9fafb; border-radius:8px; padding:10px; margin-bottom:9px; border:1px solid #e5e7eb; }
.hero-meta p { font-size:7.5pt; color:#374151; margin-bottom:2px; }
.sec { font-size:6.5pt; font-weight:800; color:#374151; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:5px; padding-bottom:3px; border-bottom:1px solid #e5e7eb; margin-top:7px; }
.sec:first-child { margin-top:0; }
.ind-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:9px; }
.ind-item { background:#f9fafb; border-radius:6px; padding:5px 7px; border:1px solid #e5e7eb; }
.ind-label { font-size:6.5pt; color:#6b7280; font-weight:600; }
.ind-val { font-size:8.5pt; font-weight:800; color:#111827; margin-top:1px; }
.ind-score { font-size:6.5pt; font-weight:700; }
.insight { background:#fffbeb; border:1px solid #fde68a; border-radius:7px; padding:7px 9px; margin-bottom:8px; font-size:7.5pt; color:#78350f; line-height:1.5; }
.insight-title { font-size:7pt; font-weight:700; color:#92400e; margin-bottom:3px; }
.sug-item { font-size:7pt; padding:4px 7px; border-radius:5px; margin-bottom:3px; border-left:2.5px solid; line-height:1.4; }
.sug-good { background:#f0fdf4; border-color:#22c55e; color:#374151; }
.sug-warn { background:#fffbeb; border-color:#eab308; color:#374151; }
.sug-info { background:#eff6ff; border-color:#3b82f6; color:#374151; }
table { width:100%; border-collapse:collapse; font-size:6.5pt; }
th { padding:3px 5px; text-align:left; color:#6b7280; font-weight:700; background:#f3f4f6; }
td { padding:3px 5px; color:#374151; }
.footer { font-size:6pt; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:6px; margin-top:8px; display:flex; justify-content:space-between; }
</style>
</head><body>

<!-- ════ PAGE 1 ════ -->
<div class="header">
  <div>
    <div class="logo">FindMiJob</div>
    <div style="font-size:7pt;color:#6b7280;margin-top:1px">Malaysia Labour Market Intelligence</div>
  </div>
  <div class="meta">
    <div style="font-weight:700;font-size:8pt;color:#111827">${L("Personalised Labour Market Analysis","Analisis Pasaran Buruh Peribadi")}</div>
    <div>${now}</div>
    <div>DOSM OpenAPI · TalentCorp MyCOL ${myCOL.edition}</div>
  </div>
</div>

<div class="hero">
  <div style="text-align:center">
    <div style="font-size:38pt;font-weight:800;color:${st.color};line-height:1">${result.composite}</div>
    <div style="font-size:7pt;color:#6b7280">${L("out of 100","daripada 100")}</div>
    <div style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:7.5pt;font-weight:700;background:${st.color}20;color:${st.color};border:1px solid ${st.color}40;margin-top:5px">${statusLabel}</div>
  </div>
  <div class="hero-meta">
    <p><strong>${L("State","Negeri")}:</strong> ${result.stateRow.state}</p>
    <p><strong>${L("Industry","Industri")}:</strong> ${industryLabel}</p>
    <p><strong>${L("Outlook","Prospek")}:</strong> ${
      result.profile.outlook === "growing"
        ? L("Growing","Berkembang")
        : result.profile.outlook === "stable"
          ? L("Stable","Stabil")
          : L("Declining","Menurun")
    }${result.criticalRoles.length > 0 ? ` &nbsp;·&nbsp; <span style="color:#7c3aed;font-weight:700">${result.criticalRoles.length} ${L("MyCOL critical roles","pekerjaan kritikal MyCOL")}</span>` : ""}</p>
    <p style="margin-top:5px;font-size:6.5pt;color:#6b7280;line-height:1.4">${L("Composite of 7 DOSM-backed indicators with industry-specific modifiers. Higher score = healthier labour market conditions for this state and industry.","Gabungan 7 petunjuk DOSM dengan pengubah khusus industri. Skor lebih tinggi = keadaan pasaran buruh lebih baik untuk negeri dan industri ini.")}</p>
  </div>
</div>

<div class="sec">${L("Indicator Breakdown","Pecahan Petunjuk")} (7)</div>
<div class="ind-grid">
  ${result.indicators.map(ind => {
    const c = sc(ind.score);
    return `<div class="ind-item">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="ind-label">${t(ind.labelKey)}</span>
        <span class="ind-score" style="color:${c}">${ind.score}/100 · ${ind.weight}%</span>
      </div>
      <div class="ind-val">${ind.value}</div>
      <div style="font-size:6pt;color:#9ca3af;margin-top:1px">${t(ind.detailKey)}${ind.detailVal ? " " + ind.detailVal : ""}</div>
      ${bar(ind.score, c)}
    </div>`;
  }).join("")}
</div>

<div class="sec">${L("Analysis Insight","Pandangan Analisis")}</div>
<div class="insight">
  <div class="insight-title">💡 ${L("Key Finding","Dapatan Utama")}</div>
  ${result.insight}
</div>

<div class="sec">${L("Recommendations","Cadangan")}</div>
${result.suggestions.map(s => `<div class="sug-item sug-${s.type}">${s.text}</div>`).join("")}

<div class="footer">
  <span>FindMiJob · findmijob.netlify.app · ${L("Powered by DOSM OpenAPI + TalentCorp MyCOL","Dikuasakan oleh DOSM OpenAPI + TalentCorp MyCOL")} ${myCOL.edition}</span>
  <span>${L("Page","Halaman")} 1 ${L("of","daripada")} 2</span>
</div>

<!-- ════ PAGE 2 ════ -->
<div class="page-break"></div>
<div class="header">
  <div>
    <div class="logo">FindMiJob</div>
    <div style="font-size:7pt;color:#6b7280;margin-top:1px">${result.stateRow.state} · ${industryLabel}</div>
  </div>
  <div class="meta">
    <div style="font-weight:700;font-size:8pt;color:#111827">${L("Charts, Roles & Methodology","Carta, Pekerjaan & Metodologi")}</div>
    <div>${now}</div>
  </div>
</div>

<!-- Charts row: radar left, trend + score table right -->
<div class="sec">${L("Performance Radar & Unemployment Trend","Radar Prestasi & Trend Pengangguran")}</div>
<div style="display:grid;grid-template-columns:155px 1fr;gap:12px;margin-bottom:8px;align-items:start">
  <div>
    <div style="font-size:6.5pt;font-weight:600;color:#6b7280;margin-bottom:3px">${L("7-Dimension Radar","Radar 7 Dimensi")}</div>
    ${radarSVG}
    <div style="font-size:6pt;color:#9ca3af;text-align:center;margin-top:2px">${L("Outer = 100 (best)","Luar = 100 (terbaik)")}</div>
  </div>
  <div>
    <div style="font-size:6.5pt;font-weight:600;color:#6b7280;margin-bottom:3px">${L("Unemployment trend, sector vs national (last 12 months)","Trend pengangguran, sektor vs kebangsaan (12 bulan lepas)")}</div>
    ${trendSVG}
    <div style="display:flex;gap:12px;font-size:6pt;color:#9ca3af;margin-top:3px">
      <span style="color:${st.color};font-weight:700">"\u2014 ${L("Sector/State","Sektor/Negeri")}</span>
      <span>- - ${L("National","Kebangsaan")}</span>
    </div>
  </div>
</div>

${indSummaryTable}

<div class="sec">${L(`In-Demand Skills for ${result.industry}`,`Kemahiran Dalam Permintaan untuk ${industryLabel}`)}</div>
<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px">
  ${(isBM ? result.profile.skillsBM : result.profile.skills).map(s =>
    `<span style="padding:2px 7px;border-radius:10px;font-size:6.5pt;font-weight:600;background:${st.color}15;color:${st.color};border:1px solid ${st.color}30">${s}</span>`
  ).join("")}
  <span style="font-size:6.5pt;color:#6b7280;padding:2px 0;align-self:center">${isBM ? result.profile.descBM : result.profile.desc}</span>
</div>

${criticalRolesSection}

${methodologyTable}

<div class="footer">
  <span>FindMiJob · findmijob.netlify.app · DOSM OpenAPI + TalentCorp MyCOL ${myCOL.edition}</span>
  <span>${L("Page","Halaman")} 2 ${L("of","daripada")} 2</span>
</div>

</body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  }, [result, lang, t]);

  const st = result ? statusOf(result.composite) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      ref={componentRef}
      className="rounded-2xl border border-border overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.03) 50%, hsl(var(--card)) 100%)" }}
    >
      <div className="relative z-10 p-6 md:p-8 space-y-6">

        {/* Title */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/8 text-xs font-semibold text-primary tracking-widest uppercase">
            <Search className="h-3 w-3" /> {t("job.personalised")}
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-foreground">{t("job.title")}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("job.desc")}</p>
        </div>

        {/* Selectors */}
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
                    {lang === "bm" ? INDUSTRY_LABEL_BM[i] : i}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={analyse} disabled={!state || !industry || analysing} className="w-full sm:w-auto gap-2 px-6">
            {analysing
              ? <><Loader2 className="h-4 w-4 animate-spin" />{t("job.analysing")}</>
              : <><Activity className="h-4 w-4" />{t("job.analyze")}</>
            }
          </Button>
        </div>

        <AnimatePresence mode="wait">

          {/* Empty */}
          {!result && !analysing && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12 text-muted-foreground text-sm space-y-2">
              <BarChart2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p>{t("job.emptyState")}</p>
              <p className="text-xs text-muted-foreground/60">{t("job.emptySubtitle")}</p>
            </motion.div>
          )}

          {/* Loading */}
          {analysing && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">{t("job.analyzingMarket")}</p>
              <p className="text-xs text-muted-foreground/50">{t("job.analyzingSubtitle")}</p>
            </motion.div>
          )}

          {/* Result */}
          {result && st && !analysing && (
            <motion.div ref={reportRef} key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="space-y-5">

              {/* Score hero */}
              <div className="rounded-2xl border border-border/60 p-5 relative overflow-hidden"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${st.color}10, hsl(var(--card)) 65%)` }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ backgroundColor: st.color }} />
                <div className="relative z-10">
                  {/* Tags + buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground border border-border">
                        <MapPin className="h-3 w-3 text-primary" /> {result.stateRow.state}
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground border border-border">
                        <Briefcase className="h-3 w-3 text-primary" />
                        {lang === "bm" ? INDUSTRY_LABEL_BM[result.industry] : result.industry}
                      </span>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${
                        result.profile.outlook === "growing" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" :
                        result.profile.outlook === "stable"  ? "bg-blue-500/10 border-blue-500/30 text-blue-600" :
                        "bg-red-500/10 border-red-500/30 text-red-600"
                      }`}>
                        {result.profile.outlook === "growing" ? "↑" : result.profile.outlook === "stable" ? "→" : "↓"}{" "}
                        {lang === "bm"
                          ? result.profile.outlook === "growing" ? "Berkembang" : result.profile.outlook === "stable" ? "Stabil" : "Menurun"
                          : result.profile.outlook}
                      </span>
                      {result.criticalRoles.length > 0 && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-xs font-bold text-violet-600 dark:text-violet-400">
                          <Sparkles className="h-3 w-3" /> {result.criticalRoles.length} {lang === "bm" ? "Kritikal MyCOL" : "MyCOL Critical"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={downloadReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                        <Download className="h-3.5 w-3.5" /> {t("job.pdfReport")}
                      </button>
                      <button onClick={exitResult}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-xs font-medium text-muted-foreground transition-all">
                        <X className="h-3.5 w-3.5" /> {t("job.close")}
                      </button>
                    </div>
                  </div>

                  {/* Gauge + quick metrics */}
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
                        <span className="text-[10px] text-muted-foreground font-medium">{t("job.outOf")}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 flex-1 w-full">
                      {result.indicators.slice(0, 4).map(ind => (
                        <div key={ind.labelKey} className="rounded-xl bg-muted/40 border border-border/40 p-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                            <span className="text-primary">{ind.icon}</span>
                            <span className="text-[10px] font-medium">{t(ind.labelKey)}</span>
                          </div>
                          <p className="text-lg font-bold text-foreground leading-none">{ind.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {t(ind.detailKey)}{ind.detailVal ? ` ${ind.detailVal}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-center mt-3">
                    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${st.bg}`}>
                      {t(st.key)} {t("job.labourMarket")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border">
                {([
                  { key: "overview", labelKey: "job.tabAll"   },
                  { key: "radar",    labelKey: "job.tabRadar" },
                  { key: "trend",    labelKey: "job.tabTrend" },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                    {result.indicators.map((ind, i) => (
                      <motion.div key={ind.labelKey}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                        <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 text-primary">{ind.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <div>
                              <span className="text-xs font-semibold text-foreground">{t(ind.labelKey)}</span>
                              <span className="text-[10px] text-muted-foreground ml-2">
                                {t(ind.detailKey)}{ind.detailVal ? ` ${ind.detailVal}` : ""}
                              </span>
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
                {activeTab === "radar" && (
                  <motion.div key="radar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={result.radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                        <Radar dataKey="score" stroke={st.color} fill={st.color} fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
                {activeTab === "trend" && (
                  <motion.div key="trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("job.trendNote")}{" "}
                      <strong className="text-foreground">
                        {result.stateRow.state} · {lang === "bm" ? INDUSTRY_LABEL_BM[result.industry] : result.industry}
                      </strong>{" "}
                      {t("job.vsNationalAvg")}
                    </p>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={["dataMin - 0.5", "dataMax + 0.5"]} width={32} unit="%" />
                          <Tooltip contentStyle={tooltipStyle}
                            formatter={(v: number, name: string) => [`${v}%`, name === "value" ? t("job.thisSectorState") : t("job.national")]} />
                          <ReferenceLine y={nationalBenchmarks.uRate} stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="3 3" label={{ value: t("job.national"), fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                          <Line type="monotone" dataKey="national" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                          <Line type="monotone" dataKey="value" stroke={st.color} strokeWidth={2.5} dot={false}
                            style={{ filter: `drop-shadow(0 0 4px ${st.color}50)` }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Insight */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground mb-1">{t("job.insight")}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.insight}</p>
                  </div>
                </div>
              </div>

              {/* In-demand skills */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-bold text-foreground mb-2.5">
                  {t("job.inDemandSkills")} {lang === "bm" ? INDUSTRY_LABEL_BM[result.industry] : result.industry}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(lang === "bm" ? result.profile.skillsBM : result.profile.skills).map(skill => (
                    <span key={skill} className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 border border-primary/20 text-primary">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* MyCOL critical roles */}
              {result.criticalRoles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-4">
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">
                          {t("job.criticalTitle")} {lang === "bm" ? INDUSTRY_LABEL_BM[result.industry] : result.industry}
                        </p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-violet-500/15 text-violet-700 dark:text-violet-400 tracking-wider">
                          MyCOL {myCOL.edition}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {t("job.criticalDesc")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.criticalRoles.slice(0, 8).map((r, i) => (
                      <motion.div key={r.title}
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.04 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/80 border border-border/60 hover:border-violet-500/40 hover:bg-background transition-all">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.sectorColor }} />
                        <span className="text-xs text-foreground flex-1 truncate font-medium">{r.title}</span>
                        {r.isNew && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-700 dark:text-amber-400 tracking-wide flex-shrink-0">
                            {lang === "bm" ? "BAHARU" : "NEW"}
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  {result.criticalRoles.length > 8 && (
                    <p className="text-[10px] text-muted-foreground/60 italic mt-2 text-center">
                      + {result.criticalRoles.length - 8} {t("job.moreCritical")}
                    </p>
                  )}
                  {result.matchedSectors.length > 0 && (
                    <p className="text-[10px] text-violet-600/70 dark:text-violet-400/70 mt-3 text-center font-medium">
                      {t("job.criticalClusters")}: {result.matchedSectors.join(" · ")}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">{t("job.suggestions")}</p>
                  {result.suggestions.map((s, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.1 }}
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

              {/* Source note */}
              <p className="text-[10px] text-muted-foreground/50 text-center pt-2">
                {t("job.sourceNote")} {myCOL.edition} · {t("job.indicative")}
              </p>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default JobMarketHealth;