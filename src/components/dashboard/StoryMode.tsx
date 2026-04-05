import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play, BookOpen } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmt(n: number, dec = 1) { return n.toFixed(dec); }
function fmtM(n: number)         { return `${(n / 1_000).toFixed(2)}M`; } // n is in thousands

const TOOLTIP = {
  backgroundColor: "hsl(var(--card))",
  border:          "1px solid hsl(var(--border))",
  borderRadius:    "10px",
  fontSize:        "11px",
  color:           "hsl(var(--foreground))",
};

// ─────────────────────────────────────────────────────────────────────────────
// Chapter type
// ─────────────────────────────────────────────────────────────────────────────
interface Chapter {
  emoji:    string;
  tag:      string;     // short label e.g. "Overview"
  title:    string;
  body:     string;
  stat?:    { value: string; label: string; color: string };
  chart:    React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Annotated dot for charts
// ─────────────────────────────────────────────────────────────────────────────
const AnnotatedDot = ({ cx, cy, payload, highlight, color }: any) => {
  if (!highlight || payload?.label !== highlight) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={10} fill={color} fillOpacity={0.2} />
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
const StoryMode = () => {
  const { data }    = useLabourData();
  const { t, lang } = useLanguage();

  const [open, setOpen]   = useState(false);
  const [step, setStep]   = useState(0);
  const [dir,  setDir]    = useState(1); // 1 = forward, -1 = backward

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const go = useCallback((delta: number, total: number) => {
    setDir(delta);
    setStep(s => Math.max(0, Math.min(total - 1, s + delta)));
  }, []);

  // ── Scroll lock — prevents body scroll shifting fixed modal position ──────
  // Pattern: save scroll Y → fix body at that offset → restore on close
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const body    = document.body;

    // Lock scroll without jumping to top
    body.style.position   = "fixed";
    body.style.top        = `-${scrollY}px`;
    body.style.left       = "0";
    body.style.right      = "0";
    body.style.overflowY  = "scroll"; // keep scrollbar width stable

    return () => {
      // Restore scroll position exactly
      body.style.position  = "";
      body.style.top       = "";
      body.style.left      = "";
      body.style.right     = "";
      body.style.overflowY = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1, 5);
      if (e.key === "ArrowLeft")  go(-1, 5);
      if (e.key === "Escape")     setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, go]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const {
    chartData, latest, peakUnemp, peakMonth,
    preCovid, recovery, youthRate, mismatchRate,
    latestWage, latestDate,
  } = useMemo(() => {
    const national = data?.national
      ? [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date))
      : [];

    // DOSM lf/employed fields are in thousands of persons
    // e.g. lf = 17600 means 17,600 thousand = 17.6 million
    const toM = (v: number) => +(v / 1_000).toFixed(3); // thousands → millions
    const chartData = national.map((d: any) => ({
      label:    new Date(d.date).toLocaleDateString("en-MY", { month: "short", year: "2-digit" }),
      lf:       toM(d.lf      ?? 0),
      employed: toM(d.employed ?? 0),
      uRate:    +(d.u_rate ?? 0).toFixed(1),
      pRate:    +(d.p_rate ?? 0).toFixed(1),
    }));

    const latest      = national[national.length - 1] ?? {};
    const latestDate  = latest.date
      ? new Date(latest.date).toLocaleString("en-MY", { month: "long", year: "numeric" })
      : "Latest";

    // Peak unemployment (COVID era)
    const peak      = national.reduce((m: any, d: any) => (d.u_rate ?? 0) > (m?.u_rate ?? 0) ? d : m, national[0]);
    const peakUnemp = peak?.u_rate ?? 5.3;
    const peakMonth = peak?.date
      ? new Date(peak.date).toLocaleString("en-MY", { month: "long", year: "numeric" })
      : "May 2020";

    // Pre-COVID baseline (average Jan 2019 – Dec 2019)
    const preCovid19 = national.filter((d: any) => d.date?.startsWith("2019"));
    const preCovid   = preCovid19.length
      ? +(preCovid19.reduce((s: number, d: any) => s + (d.u_rate ?? 0), 0) / preCovid19.length).toFixed(1)
      : 3.3;

    // Recovery — how many months from peak to below 4%
    const peakIdx  = national.findIndex((d: any) => d.date === peak?.date);
    const recIdx   = national.findIndex((d: any, i: number) => i > peakIdx && (d.u_rate ?? 99) < 4.0);
    const recovery = recIdx > peakIdx ? recIdx - peakIdx : 18;

    // Youth
    const youth = data?.youth
      ? [...data.youth]
          .filter((d: any) => d.u_rate != null)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
      : [];
    const youthRate = youth[youth.length - 1]?.u_rate ?? 11.2;

    // Mismatch
    const mismatch = data?.mismatch
      ? [...data.mismatch]
          .filter((d: any) => d.date)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
      : [];
    const mismatchRate = mismatch[mismatch.length - 1]?.sru_rate
      ?? mismatch[mismatch.length - 1]?.rate
      ?? 11.4;

    // Wages
    const wages = data?.wages
      ? [...data.wages]
          .filter((d: any) => d.income_median)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
      : [];
    const latestWage = wages[wages.length - 1]?.income_median ?? 0;

    return {
      chartData, latest, peakUnemp, peakMonth,
      preCovid, recovery, youthRate, mismatchRate,
      latestWage, latestDate,
    };
  }, [data]);

  // ── Chapter definitions — data-driven ─────────────────────────────────────
  const chapters: Chapter[] = useMemo(() => {
    const uRate     = latest.u_rate ?? 0;
    const pRate     = latest.p_rate ?? 0;
    const lfSize    = latest.lf     ?? 0;
    const empSize   = latest.employed ?? 0;
    const empRate   = latest.employment_rate ?? +(100 - uRate).toFixed(1);

    // Slice helpers
    const last36  = chartData.slice(-36);
    const covidEra = chartData.filter(d => {
      const yr = parseInt(d.label.split(" ")[1]);
      return yr >= 19 && yr <= 23;
    });
    const peakLabel = chartData.find(d =>
      Math.abs(d.uRate - peakUnemp) < 0.05
    )?.label ?? "";

    return [
      // ── Chapter 1: Today ──────────────────────────────────────────────────
      {
        emoji: "🇲🇾",
        tag:   "Overview",
        title: lang === "bm"
          ? "Pasaran Kerja Malaysia Hari Ini"
          : "Malaysia's Job Market Today",
        body: lang === "bm"
          ? `Setakat ${latestDate}, Malaysia mempunyai ${fmtM(lfSize)} orang dalam tenaga kerja dengan kadar pekerjaan ${fmt(empRate)}%. ${fmtM(empSize)} rakyat Malaysia bekerja aktif. Kadar pengangguran kini pada ${fmt(uRate)}%, hampir paras terendah bersejarah. Pasaran buruh Malaysia adalah antara yang paling resiliens di Asia Tenggara.`
          : `As of ${latestDate}, Malaysia has ${fmtM(lfSize)} people in its labour force with an employment rate of ${fmt(empRate)}%. ${fmtM(empSize)} Malaysians actively working. The unemployment rate sits at ${fmt(uRate)}%, near a historic low. Malaysia's labour market ranks among the most resilient in Southeast Asia.`,
        stat: {
          value: `${fmt(empRate)}%`,
          label: lang === "bm" ? "Kadar Pekerjaan" : "Employment Rate",
          color: "#22c55e",
        },
        chart: (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData.slice(-60)}>
              <defs>
                <linearGradient id="sg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={11} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}M`} width={38} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}M`, ""]} />
              <Area type="monotone" dataKey="lf"       name={lang === "bm" ? "Tenaga Kerja" : "Labour Force"} stroke="#22c55e"  strokeWidth={2} fill="url(#sg1)" dot={false} />
              <Area type="monotone" dataKey="employed" name={lang === "bm" ? "Bekerja" : "Employed"}          stroke="#3b82f6"  strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        ),
      },

      // ── Chapter 2: COVID Shock ─────────────────────────────────────────────
      {
        emoji: "😷",
        tag:   "The Shock",
        title: lang === "bm"
          ? "Kejutan Pandemik COVID-19"
          : "When COVID-19 Hit",
        body: lang === "bm"
          ? `Pada ${peakMonth}, pengangguran melonjak ke ${fmt(peakUnemp)}%, tertinggi dalam beberapa dekad. Perintah Kawalan Pergerakan menghentikan keseluruhan industri dalam masa semalam. Ratusan ribu orang kehilangan pekerjaan dalam tempoh beberapa bulan. Sebelum pandemik, kadar pengangguran purata hanya ${fmt(preCovid)}% pada 2019.`
          : `In ${peakMonth}, unemployment surged to ${fmt(peakUnemp)}%, the highest in decades. Movement Control Orders shut down entire industries overnight. Hundreds of thousands lost their jobs within months. Before the pandemic, Malaysia's unemployment averaged just ${fmt(preCovid)}% in 2019.`,
        stat: {
          value: `${fmt(peakUnemp)}%`,
          label: lang === "bm" ? "Puncak Pengangguran" : "Peak Unemployment",
          color: "#ef4444",
        },
        chart: (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={covidEra}>
              <defs>
                <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} width={34} domain={[2.5, 6]} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}%`, lang === "bm" ? "Kadar Pengangguran" : "Unemployment Rate"]} />
              <ReferenceLine y={preCovid} stroke="#22c55e" strokeDasharray="4 2"
                label={{ value: `Pre-COVID ${preCovid}%`, fontSize: 9, fill: "#22c55e", position: "insideTopRight" }} />
              <Area type="monotone" dataKey="uRate" stroke="#ef4444" strokeWidth={2.5} fill="url(#sg2)" dot={false}
                activeDot={{ r: 4, fill: "#ef4444" }} />
              {peakLabel && (
                <ReferenceLine x={peakLabel} stroke="#ef4444" strokeDasharray="2 2"
                  label={{ value: `Peak ${peakUnemp}%`, fontSize: 9, fill: "#ef4444", position: "insideTopLeft" }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ),
      },

      // ── Chapter 3: Recovery ───────────────────────────────────────────────
      {
        emoji: "💪",
        tag:   "Recovery",
        title: lang === "bm"
          ? "Pemulihan yang Mengagumkan"
          : "The Remarkable Recovery",
        body: lang === "bm"
          ? `Malaysia mencatatkan pemulihan pasaran buruh yang mengagumkan. Daripada ${fmt(peakUnemp)}% kembali ke bawah 4% dalam masa kira-kira ${recovery} bulan. Pembukaan semula ekonomi, pelancaran vaksin dan inisiatif kerajaan seperti PEMERKASA dan PRIHATIN membantu mengembalikan pekerjaan kepada rakyat Malaysia.`
          : `Malaysia staged a remarkable labour market comeback, falling from ${fmt(peakUnemp)}% back below 4% in roughly ${recovery} months. Economic reopening, vaccine rollouts and government initiatives like PEMERKASA and PRIHATIN helped bring jobs back to Malaysians.`,
        stat: {
          value: `${recovery}mo`,
          label: lang === "bm" ? "Masa Pemulihan" : "Recovery Time",
          color: "#3b82f6",
        },
        chart: (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={covidEra}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} width={34} domain={[2.5, 6]} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}%`, ""]} />
              <ReferenceLine y={4} stroke="#22c55e" strokeDasharray="3 2"
                label={{ value: "4% threshold", fontSize: 9, fill: "#22c55e", position: "insideTopRight" }} />
              <Line type="monotone" dataKey="uRate" stroke="#3b82f6" strokeWidth={2.5} dot={false}
                activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ),
      },

      // ── Chapter 4: Now ────────────────────────────────────────────────────
      {
        emoji: "📊",
        tag:   "Right Now",
        title: lang === "bm"
          ? "Di Mana Malaysia Sekarang"
          : "Where Malaysia Stands Now",
        body: lang === "bm"
          ? `Pengangguran kini ${fmt(latest.u_rate ?? 0)}%, jauh lebih baik daripada puncak ${fmt(peakUnemp)}% pada waktu pandemik dan lebih rendah berbanding purata pra-COVID ${fmt(preCovid)}%. Penyertaan tenaga kerja pada ${fmt(pRate)}%, menghampiri sasaran 70% kerajaan. ${latestWage > 0 ? `Pendapatan isi rumah median kebangsaan mencecah RM ${Math.round(latestWage).toLocaleString()} sebulan.` : ""}`
          : `Unemployment now sits at ${fmt(latest.u_rate ?? 0)}%, well below the ${fmt(peakUnemp)}% pandemic peak and lower than the pre-COVID average of ${fmt(preCovid)}%. Labour force participation is at ${fmt(pRate)}%, approaching the government's 70% target. ${latestWage > 0 ? `The national median household income has reached RM ${Math.round(latestWage).toLocaleString()} per month.` : ""}`,
        stat: {
          value: `${fmt(latest.u_rate ?? 0)}%`,
          label: lang === "bm" ? "Pengangguran Semasa" : "Current Unemployment",
          color: "#10b981",
        },
        chart: (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={last36}>
              <defs>
                <linearGradient id="sg4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={5} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} width={34} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}%`, lang === "bm" ? "Kadar Pengangguran" : "Unemployment"]} />
              <ReferenceLine y={preCovid} stroke="#6b7280" strokeDasharray="3 2"
                label={{ value: `Pre-COVID ${preCovid}%`, fontSize: 9, fill: "#6b7280", position: "insideTopRight" }} />
              <Area type="monotone" dataKey="uRate" stroke="#10b981" strokeWidth={2.5} fill="url(#sg4)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ),
      },

      // ── Chapter 5: The Challenge ──────────────────────────────────────────
      {
        emoji: "🎯",
        tag:   "The Challenge",
        title: lang === "bm"
          ? "Cabaran yang Masih Ada"
          : "The Challenge Ahead",
        body: lang === "bm"
          ? `Walaupun angka keseluruhan positif, dua cabaran berstruktur kekal: (1) Pengangguran belia pada ${fmt(youthRate)}% — kira-kira ${(youthRate / (latest.u_rate ?? 3)).toFixed(1)} kali kadar kebangsaan, menunjukkan jurang antara pendidikan dan industri. (2) ${fmt(mismatchRate)}% daripada graduan berpendidikan tinggi bekerja dalam pekerjaan di bawah tahap kelayakan mereka, membazirkan potensi modal insan Malaysia.`
          : `Despite strong headline numbers, two structural challenges remain: (1) Youth unemployment at ${fmt(youthRate)}%, roughly ${(youthRate / (latest.u_rate ?? 3)).toFixed(1)} times the national rate, signals a gap between education and industry. (2) ${fmt(mismatchRate)}% of tertiary-educated graduates work in jobs below their qualification level, a significant waste of Malaysia's human capital potential.`,
        stat: {
          value: `${fmt(youthRate)}%`,
          label: lang === "bm" ? "Pengangguran Belia" : "Youth Unemployment",
          color: "#f59e0b",
        },
        chart: (() => {
          // Side-by-side comparison bars rendered as SVG
          const items = [
            { label: lang === "bm" ? "Kadar Kebangsaan" : "National Rate", value: latest.u_rate ?? 3, color: "#22c55e", max: 15 },
            { label: lang === "bm" ? "Belia (15-24)" : "Youth (15-24)",   value: youthRate,           color: "#f59e0b", max: 15 },
            { label: lang === "bm" ? "Ketidakpadanan Kemahiran" : "Skills Mismatch", value: mismatchRate, color: "#ef4444", max: 30 },
          ];
          return (
            <div className="space-y-3 mt-2">
              {items.map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-bold" style={{ color: item.color }}>{fmt(item.value)}%</span>
                  </div>
                  <div className="h-5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full flex items-center justify-end pr-2"
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / item.max) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    >
                      <span className="text-[10px] font-bold text-white">{fmt(item.value)}%</span>
                    </motion.div>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">
                {lang === "bm"
                  ? "Sumber: DOSM — LFS Bulanan, LFS Belia, Guna Tenaga Tidak Penuh Berkemahiran"
                  : "Source: DOSM — LFS Monthly, Youth LFS, Skills-Related Underemployment"}
              </p>
            </div>
          );
        })(),
      },
    ];
  }, [data, chartData, latest, peakUnemp, peakMonth, preCovid, recovery,
      youthRate, mismatchRate, latestWage, latestDate, lang]);

  const total  = chapters.length;
  const chapter = chapters[step];

  return (
    <>
      {/* ── Trigger button ── */}
      <motion.button
        onClick={() => { setOpen(true); setStep(0); setDir(1); }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <BookOpen className="h-4 w-4" />
        {t("story.button")}
      </motion.button>

      {/* ── Modal — rendered via portal at document.body to bypass all stacking contexts ── */}
      {open && createPortal(
        <AnimatePresence>
          {open && (
            <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1  }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, margin: "auto", zIndex: 9999, width: "min(92vw, 520px)", height: "fit-content", maxHeight: "90vh", overflowY: "auto", backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "16px", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}
            >
              {/* Progress bar */}
              <div className="h-1 bg-muted w-full">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={false}
                  animate={{ width: `${((step + 1) / total) * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">{t("story.title")}</span>
                  <div className="flex items-center gap-0.5">
                    {chapters.map((ch, i) => (
                      <button
                        key={i}
                        onClick={() => { setDir(i > step ? 1 : -1); setStep(i); }}
                        title={ch.tag}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {step + 1}/{total}
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 min-h-[380px] flex flex-col">
                <AnimatePresence mode="wait" custom={dir}>
                  <motion.div
                    key={step}
                    custom={dir}
                    variants={{
                      enter: (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
                      center: { opacity: 1, x: 0 },
                      exit:  (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col gap-3 flex-1"
                  >
                    {/* Tag + title */}
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
                        {chapter.tag}
                      </span>
                      <h3 className="text-lg font-extrabold text-foreground leading-tight">
                        {chapter.emoji} {chapter.title}
                      </h3>
                    </div>

                    {/* Stat hero */}
                    {chapter.stat && (
                      <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40 border border-border">
                        <motion.span
                          key={`${step}-stat`}
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1,   opacity: 1 }}
                          transition={{ delay: 0.15, type: "spring", stiffness: 250 }}
                          className="text-3xl font-black tabular-nums"
                          style={{ color: chapter.stat.color }}
                        >
                          {chapter.stat.value}
                        </motion.span>
                        <span className="text-xs text-muted-foreground font-medium">{chapter.stat.label}</span>
                      </div>
                    )}

                    {/* Body */}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {chapter.body}
                    </p>

                    {/* Chart */}
                    <div className="flex-1 min-h-0">
                      {chapter.chart}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer nav */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20">
                <button
                  onClick={() => go(-1, total)}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("story.previous")}
                </button>

                <span className="text-[10px] text-muted-foreground/50 hidden sm:block">
                  ← → to navigate · Esc to close
                </span>

                {step < total - 1 ? (
                  <button
                    onClick={() => go(1, total)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
                  >
                    {t("story.next")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
                  >
                    {t("story.done")}
                  </button>
                )}
              </div>
            </motion.div>
          </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default StoryMode;