import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceDot,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ExternalLink } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SectorChart, public-friendly redesign
//
// Hero visual: a proportional "landscape diorama" SVG. Each sector is its own
// visual world (city / factories / fields), and the horizontal width = its
// share of the workforce. Services dominates the canvas because it physically
// takes up most of the space, the spatial allocation IS the data story.
//
// New in this revision:
//   1. Each sector card is clickable, expanding to show what sub-industries
//      sit inside that sector (e.g. Services contains shops, transport, ICT,
//      finance, healthcare, education, etc.). MSIC 2008 section codes shown.
//   2. One additional external link: KRI's "Work in an Evolving Malaysia"
//      report, the most thematically relevant non-DOSM source for sector
//      employment context.
//   3. Tighter vertical padding throughout.
// ─────────────────────────────────────────────────────────────────────────────

const SECTOR_COLORS = {
  services:    { fill: "#0ea5e9", soft: "#bae6fd", deep: "#0369a1" },  // sky
  industry:    { fill: "#f97316", soft: "#fed7aa", deep: "#9a3412" },  // orange
  agriculture: { fill: "#65a30d", soft: "#bef264", deep: "#3f6212" },  // lime
} as const;

type SectorKey = keyof typeof SECTOR_COLORS;

// Sub-industries inside each sector, grouped by plain language. Inline EN/BM
// labels here so we don't bloat the language file with 20+ near-static keys.
const SUB_INDUSTRIES: Record<SectorKey, { en: string; bm: string }[]> = {
  services: [
    { en: "Shops & retail",         bm: "Kedai & runcit"           },
    { en: "Transport & logistics",  bm: "Pengangkutan & logistik"  },
    { en: "Hotels & restaurants",   bm: "Hotel & restoran"         },
    { en: "ICT & telecoms",         bm: "ICT & telekom"            },
    { en: "Finance & insurance",    bm: "Kewangan & insurans"      },
    { en: "Real estate",            bm: "Hartanah"                 },
    { en: "Professional services",  bm: "Perkhidmatan profesional" },
    { en: "Public administration",  bm: "Pentadbiran awam"         },
    { en: "Education",              bm: "Pendidikan"               },
    { en: "Healthcare",             bm: "Kesihatan"                },
    { en: "Arts & entertainment",   bm: "Seni & hiburan"           },
  ],
  industry: [
    { en: "Manufacturing",          bm: "Pembuatan"                },
    { en: "Construction",           bm: "Pembinaan"                },
    { en: "Electricity & gas",      bm: "Elektrik & gas"           },
    { en: "Water & waste",          bm: "Air & sisa"               },
  ],
  agriculture: [
    { en: "Crops & livestock",      bm: "Tanaman & ternakan"       },
    { en: "Forestry",               bm: "Perhutanan"               },
    { en: "Fishing",                bm: "Perikanan"                },
    { en: "Mining & quarrying",     bm: "Perlombongan & kuari"     },
  ],
};

// MSIC section codes per sector
const MSIC_SECTIONS: Record<SectorKey, string> = {
  services:    "G\u2013Q",
  industry:    "C\u2013F",
  agriculture: "A\u2013B",
};

// Single most-relevant non-DOSM external link
const KRI_REPORT_URL = "https://documents1.worldbank.org/curated/en/498221604428665083/pdf/From-Farms-to-Factories-and-Firms-Structural-Transformation-and-Labor-Productivity-Growth-in-Malaysia.pdf";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

type View = "landscape" | "arc" | "shift";

const SectorChart = () => {
  const { data, loading } = useLabourData();
  const { t, lang } = useLanguage();
  const [view, setView] = useState<View>("landscape");
  const [expanded, setExpanded] = useState<Set<SectorKey>>(new Set());

  const toggleExpand = (key: SectorKey) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const bothSex = useMemo(() =>
    (data?.sectors ?? [])
      .filter((d: any) => {
        const sex = (d.sex ?? "").toLowerCase();
        return sex === "both" || sex === "overall" || sex === "";
      })
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
  , [data]);

  const byYear = useMemo(() => {
    const map: Record<number, any> = {};
    bothSex.forEach((d: any) => {
      const year   = new Date(d.date).getFullYear();
      const sector = (d.sector ?? "").toLowerCase().trim();
      if (!map[year]) map[year] = { year, date: d.date };
      if (sector === "agriculture") map[year].agriculture = +(d.proportion ?? 0);
      if (sector === "industry")    map[year].industry    = +(d.proportion ?? 0);
      if (sector === "services")    map[year].services    = +(d.proportion ?? 0);
    });
    return Object.values(map)
      .filter((d: any) => d.agriculture != null && d.industry != null && d.services != null)
      .sort((a: any, b: any) => a.year - b.year);
  }, [bothSex]);

  const latest       = byYear[byYear.length - 1];
  const latestYear   = latest?.year ?? "";
  const tenYrAgo     = byYear.find((d: any) => d.year === (latestYear as number) - 10) ?? byYear[0];
  const tenYrAgoYear = tenYrAgo?.year ?? "";

  const arcData = useMemo(() =>
    byYear.filter((d: any) => d.year >= ((latestYear as number) - 10))
  , [byYear, latestYear]);

  const sectorOrder: SectorKey[] = ["services", "industry", "agriculture"];
  const sectors = useMemo(() =>
    sectorOrder.map(key => {
      const value  = latest?.[key] ?? 0;
      const before = tenYrAgo?.[key] ?? 0;
      const change = +(value - before).toFixed(1);
      return { key, value, before, change };
    })
  , [latest, tenYrAgo]);

  if (loading || !bothSex.length) {
    return <div className="rounded-2xl bg-card border border-border h-96 animate-pulse" />;
  }

  const labelOf = (k: SectorKey) => t(`sectors.${k}`);
  const shortOf = (k: SectorKey) =>
    t(k === "services" ? "sectors.servicesShort" : k === "industry" ? "sectors.industryShort" : "sectors.agriShort");
  const plainOf = (k: SectorKey) =>
    t(k === "services" ? "sectors.servicesPlain" : k === "industry" ? "sectors.industryPlain" : "sectors.agriPlain");

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
    >
      {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
      <div className="px-6 pt-4 pb-3">
        <h2 className="text-2xl md:text-[26px] font-extrabold text-foreground leading-tight">
          {t("sectors.title")}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug max-w-2xl">
          {t("sectors.desc")}
        </p>
      </div>

      {/* ═══ HERO: PROPORTIONAL LANDSCAPE DIORAMA ════════════════════════ */}
      <div className="px-4 sm:px-6 pb-1.5">
        <div className="rounded-xl border border-border bg-gradient-to-b from-sky-50/50 to-background dark:from-sky-950/10 dark:to-background overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground/70 uppercase">
              {t("sectors.outOf100")}
            </span>
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              DOSM {latestYear}
            </span>
          </div>

          <LandscapeDiorama sectors={sectors} />

          <div className="flex h-6 px-0.5">
            {sectors.map(({ key, value }) => {
              const c = SECTOR_COLORS[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-center gap-1.5 border-t-2 transition-colors"
                  style={{ width: `${value}%`, borderColor: c.fill }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.fill }}>
                    {labelOf(key)}
                  </span>
                  <span className="text-[10px] font-black tabular-nums text-foreground/80">
                    {value}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ THREE ILLUSTRATED CARDS, click to expand ═════════════════════ */}
      <div className="px-4 sm:px-6 pt-3 pb-2">
        {/* Tap hint */}
        <p className="text-[9px] text-muted-foreground/50 italic mb-1.5">
          {t("sectors.tapToSeeInside")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-start">
          {sectors.map(({ key, value, change }, i) => {
            const c        = SECTOR_COLORS[key];
            const Trend    = change > 0.1 ? ArrowUpRight : change < -0.1 ? ArrowDownRight : Minus;
            const tColor   = change > 0.1 ? "#10b981" : change < -0.1 ? "#ef4444" : "#94a3b8";
            const tBg      = change > 0.1 ? "rgba(16,185,129,0.10)" : change < -0.1 ? "rgba(239,68,68,0.10)" : "rgba(148,163,184,0.10)";
            const trendKey = change > 0.1 ? "sectors.growing" : change < -0.1 ? "sectors.shrinking" : "sectors.stable";
            const isOpen   = expanded.has(key);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                onClick={() => toggleExpand(key)}
                role="button"
                aria-expanded={isOpen}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(key); }
                }}
                className="sector-clickable rounded-xl border border-border bg-background overflow-hidden cursor-pointer transition-all"
                style={{ "--sc": c.fill } as React.CSSProperties}
              >
                {/* Illustration band, slimmer */}
                <div
                  className="h-16 flex items-end justify-center relative overflow-hidden"
                  style={{ background: c.soft + "55" }}
                >
                  <SectorIllustration sectorKey={key} color={c.fill} />
                </div>

                {/* Content */}
                <div className="p-2.5">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-foreground">{labelOf(key)}</h3>
                    <span className="text-[10px] font-semibold text-muted-foreground/70">{shortOf(key)}</span>
                  </div>

                  <div className="flex items-baseline gap-1 leading-none mb-1.5">
                    <span className="text-[36px] font-black tabular-nums" style={{ color: c.fill }}>
                      {value}
                    </span>
                    <span className="text-base font-bold" style={{ color: c.fill, opacity: 0.6 }}>%</span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-snug mb-2 min-h-[2.5rem]">
                    {plainOf(key)}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums"
                      style={{ backgroundColor: tBg, color: tColor }}
                    >
                      <Trend className="h-2.5 w-2.5" strokeWidth={3} />
                      <span>{change > 0 ? "+" : ""}{change}pp</span>
                      <span className="opacity-70 font-medium">·</span>
                      <span className="font-medium">{t(trendKey)}</span>
                    </div>
                    <ChevronDown
                      className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>

                {/* Expansion: sub-industries */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 pb-2.5 pt-2 border-t border-border/40 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: c.fill }}>
                            {t("sectors.whatsInside")}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground/60">
                            {t("sectors.msicLabel")} {MSIC_SECTIONS[key]}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {SUB_INDUSTRIES[key].map(item => (
                            <span
                              key={item.en}
                              className="text-[10px] px-1.5 py-0.5 rounded border"
                              style={{
                                background: c.fill + "10",
                                borderColor: c.fill + "30",
                                color: c.deep,
                              }}
                            >
                              {lang === "bm" ? item.bm : item.en}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ═══ HOW THIS HAS CHANGED ═══════════════════════════════════════ */}
      <div className="px-4 sm:px-6 py-3 border-t border-border mt-2 bg-muted/15">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <h4 className="text-sm font-bold text-foreground">{t("sectors.howChanged")}</h4>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background border border-border">
            {([
              { key: "landscape", labelKey: "sectors.viewLandscape" },
              { key: "arc",       labelKey: "sectors.viewArc"       },
              { key: "shift",     labelKey: "sectors.viewShift"     },
            ] as { key: View; labelKey: string }[]).map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  view === v.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(v.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === "landscape" && (
            <motion.div key="landscape" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {lang === "bm"
                  ? "Selama bertahun-tahun, perkhidmatan terus berkembang sebagai pemberi kerja terbesar Malaysia. Pertanian terus mengecil. Industri kekal stabil di sekitar suku."
                  : "Over time, services keeps growing as Malaysia's biggest employer. Agriculture keeps shrinking. Industry stays steady at around a quarter."}
              </p>
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {sectors.map(({ key, before, value }) => {
                  const c = SECTOR_COLORS[key];
                  return (
                    <div key={key} className="rounded-lg bg-background border border-border p-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c.fill }} />
                        <span className="text-[10px] font-bold text-foreground">{labelOf(key)}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground tabular-nums">{tenYrAgoYear}</span>
                        <span className="text-sm font-bold tabular-nums text-muted-foreground/70">{before}%</span>
                        <span className="text-[10px] text-muted-foreground/50">{"\u2192"}</span>
                        <span className="text-[10px] text-foreground tabular-nums font-medium">{latestYear}</span>
                        <span className="text-base font-black tabular-nums" style={{ color: c.fill }}>{value}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === "arc" && (
            <motion.div key="arc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-[11px] text-muted-foreground mb-2">
                {lang === "bm"
                  ? `Bahagian setiap sektor sejak ${(latestYear as number) - 10}`
                  : `Each sector's share since ${(latestYear as number) - 10}`}
              </p>
              <div className="h-[180px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={arcData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 75]} width={36} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number, name: string) => [`${v}%`, labelOf(name as SectorKey)]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend
                      formatter={(value) => labelOf(value as SectorKey)}
                      wrapperStyle={{ fontSize: 10, color: "hsl(var(--foreground))" }}
                    />
                    {sectorOrder.map(key => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key}
                        stroke={SECTOR_COLORS[key].fill}
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: SECTOR_COLORS[key].fill, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                      />
                    ))}
                    {sectorOrder.map(key => latest && (
                      <ReferenceDot
                        key={`ref-${key}`}
                        x={latest.year}
                        y={latest[key]}
                        r={4}
                        fill={SECTOR_COLORS[key].fill}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {view === "shift" && (
            <motion.div key="shift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-[11px] text-muted-foreground mb-2.5">
                {t("sectors.tenYearsAgo")} <strong className="text-foreground tabular-nums">{tenYrAgoYear}</strong> {"\u2192"} {t("sectors.today")} <strong className="text-foreground tabular-nums">{latestYear}</strong>
              </p>
              <div className="space-y-2">
                {sectors
                  .slice()
                  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                  .map(({ key, before, value, change }) => {
                    const c      = SECTOR_COLORS[key];
                    const isUp   = change > 0.1;
                    const isDown = change < -0.1;
                    const tColor = isUp ? "#10b981" : isDown ? "#ef4444" : "#94a3b8";
                    const Trend  = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
                    return (
                      <div key={key} className="rounded-lg bg-background border border-border p-2.5">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.fill }} />
                            <span className="text-xs font-bold text-foreground">{labelOf(key)}</span>
                          </div>
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold tabular-nums" style={{ color: tColor }}>
                            <Trend className="h-2.5 w-2.5" strokeWidth={3} />
                            {change > 0 ? "+" : ""}{change}pp
                          </div>
                        </div>
                        <div className="grid grid-cols-[36px_1fr] gap-x-2 gap-y-1 items-center">
                          <span className="text-[10px] text-muted-foreground/60 tabular-nums">{tenYrAgoYear}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 rounded-sm bg-muted overflow-hidden">
                              <motion.div
                                className="h-full"
                                style={{ backgroundColor: c.fill, opacity: 0.4 }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(before / 70) * 100}%` }}
                                transition={{ duration: 0.7 }}
                              />
                            </div>
                            <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-9 text-right">{before}%</span>
                          </div>
                          <span className="text-[10px] text-foreground font-bold tabular-nums">{latestYear}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 rounded-sm bg-muted overflow-hidden">
                              <motion.div
                                className="h-full"
                                style={{ backgroundColor: c.fill }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(value / 70) * 100}%` }}
                                transition={{ duration: 0.7, delay: 0.15 }}
                              />
                            </div>
                            <span className="text-[10px] font-black tabular-nums text-foreground w-9 text-right">{value}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ BRIDGE NOTE ═══════════════════════════════════════════════════ */}
      <div className="px-4 sm:px-6 py-2 border-t border-border/60">
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed text-center">
          {t("sectors.bridgeNote")}
          <span className="font-bold text-violet-600 dark:text-violet-400">
            {t("sectors.bridgeLink")}
          </span>
        </p>
      </div>

      {/* ═══ SOURCE FOOTER, with KRI external link ═══════════════════════ */}
      <div className="px-4 sm:px-6 py-2 border-t border-border bg-muted/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="https://open.dosm.gov.my/data-catalogue/employment_sector"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground/60 underline hover:text-foreground transition-colors"
            >
              DOSM · Labour Force Survey · {latestYear}
            </a>
            <span className="text-[10px] text-muted-foreground/30">·</span>
            <a
              href={KRI_REPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors inline-flex items-center gap-0.5"
            >
              {t("sectors.kriLink")} <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          <div className="group relative flex items-center flex-shrink-0">
            <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[10px] font-bold select-none">
              i
            </div>
            <div className="absolute bottom-6 right-0 w-72 bg-card border border-border rounded-xl p-3 shadow-lg text-[11px] text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 space-y-1.5">
              <p className="font-bold text-foreground">MSIC 2008 Sector Groupings</p>
              <p><strong className="text-foreground">Agriculture:</strong>{" Sections A (Agriculture, Forestry & Fishing) + B (Mining & Quarrying)"}</p>
              <p><strong className="text-foreground">Industry:</strong>{" Sections C (Manufacturing) + D (Electricity & Gas) + E (Water & Waste) + F (Construction)"}</p>
              <p><strong className="text-foreground">Services:</strong>{" Sections G\u2013Q: wholesale & retail, transport, accommodation, ICT, finance, real estate, professional services, public admin, education, health."}</p>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
          Sector classification follows MSIC 2008 Ver. 1.0
        </p>
      </div>

      <style>{`
        .sector-clickable { box-shadow: 0 0 0 1px hsl(var(--border) / 0.7); }
        .sector-clickable:hover {
          box-shadow: 0 0 0 1.5px var(--sc, hsl(var(--border))), 0 4px 16px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
      `}</style>
    </motion.section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LandscapeDiorama, unchanged
// ─────────────────────────────────────────────────────────────────────────────
interface DioramaProps {
  sectors: { key: SectorKey; value: number }[];
}

const LandscapeDiorama = ({ sectors }: DioramaProps) => {
  const W = 700;
  const H = 140;

  const zones = useMemo(() => {
    let cursor = 0;
    return sectors.map(({ key, value }) => {
      const w = (value / 100) * W;
      const z = { key, x: cursor, w, value };
      cursor += w;
      return z;
    });
  }, [sectors]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", height: "auto" }}
      role="img"
      aria-label="Proportional landscape showing services, industry, and agriculture sectors"
    >
      <defs>
        <linearGradient id="diorama-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#e0f2fe" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0"   />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#diorama-sky)" />
      <line x1="0" y1={H - 20} x2={W} y2={H - 20} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />

      {zones.map(zone => {
        if (zone.key === "services")    return <ServicesScene    key={zone.key} x={zone.x} w={zone.w} h={H} />;
        if (zone.key === "industry")    return <IndustryScene    key={zone.key} x={zone.x} w={zone.w} h={H} />;
        if (zone.key === "agriculture") return <AgricultureScene key={zone.key} x={zone.x} w={zone.w} h={H} />;
        return null;
      })}

      {zones.slice(0, -1).map((z, i) => (
        <line
          key={i}
          x1={z.x + z.w}
          y1="10"
          x2={z.x + z.w}
          y2={H - 5}
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.4"
        />
      ))}

      <line x1="0" y1={H - 5} x2={W} y2={H - 5} stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES, INDUSTRY, AGRICULTURE scenes, unchanged
// ─────────────────────────────────────────────────────────────────────────────
const ServicesScene = ({ x, w, h }: { x: number; w: number; h: number }) => {
  const c = SECTOR_COLORS.services;
  const ground = h - 5;

  const buildings = useMemo(() => {
    const list: { bx: number; bw: number; bh: number; tone: number; windows: number }[] = [];
    let cursor = 4;
    const seed = Math.floor(w * 1000) % 1000;
    let s = seed || 7;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    while (cursor < w - 8) {
      const bw = 14 + Math.floor(rnd() * 14);
      const bh = 35 + Math.floor(rnd() * 60);
      if (cursor + bw > w - 4) break;
      list.push({ bx: cursor, bw, bh, tone: rnd(), windows: Math.floor(bh / 14) });
      cursor += bw + 1 + Math.floor(rnd() * 2);
    }
    return list;
  }, [w]);

  return (
    <g transform={`translate(${x}, 0)`}>
      <rect x="0" y="0" width={w} height={h} fill={c.soft} opacity="0.18" />
      {buildings.map((b, i) => {
        const bgFill = b.tone < 0.5 ? c.fill : c.deep;
        const opacity = 0.7 + b.tone * 0.3;
        return (
          <g key={i}>
            <rect x={b.bx} y={ground - b.bh} width={b.bw} height={b.bh} fill={bgFill} opacity={opacity} />
            {Array.from({ length: b.windows }).map((_, wi) => (
              <g key={wi}>
                <rect x={b.bx + 3} y={ground - b.bh + 6 + wi * 11} width={b.bw / 2 - 4} height={4} fill="#fef3c7" opacity={wi % 2 === 0 ? 0.7 : 0.5} />
                <rect x={b.bx + b.bw / 2 + 1} y={ground - b.bh + 6 + wi * 11} width={b.bw / 2 - 4} height={4} fill="#fef3c7" opacity={wi % 2 === 1 ? 0.7 : 0.5} />
              </g>
            ))}
            <rect x={b.bx} y={ground - b.bh} width={b.bw} height="2" fill={c.deep} opacity="0.4" />
          </g>
        );
      })}
      {w > 200 && (
        <g opacity="0.4">
          <ellipse cx={w * 0.3}  cy="22" rx="14" ry="4" fill="#fff" />
          <ellipse cx={w * 0.65} cy="15" rx="10" ry="3" fill="#fff" />
        </g>
      )}
    </g>
  );
};

const IndustryScene = ({ x, w, h }: { x: number; w: number; h: number }) => {
  const c = SECTOR_COLORS.industry;
  const ground = h - 5;
  const units = w > 180 ? 3 : w > 100 ? 2 : 1;
  const unitW = w / units;

  return (
    <g transform={`translate(${x}, 0)`}>
      <rect x="0" y="0" width={w} height={h} fill={c.soft} opacity="0.18" />
      {Array.from({ length: units }).map((_, i) => {
        const ux  = i * unitW + unitW * 0.1;
        const uw  = unitW * 0.8;
        const fbH = 50 + (i % 2) * 14;
        const fbY = ground - fbH;
        const chH = 30 + (i % 2) * 15;
        const teeth = Math.max(2, Math.floor(uw / 12));
        return (
          <g key={i}>
            <rect x={ux} y={fbY} width={uw} height={fbH} fill={c.fill} opacity="0.85" />
            {Array.from({ length: teeth }).map((_, si) => {
              const sx = ux + si * (uw / teeth);
              const sw = uw / teeth;
              return <polygon key={si} points={`${sx},${fbY} ${sx + sw / 2},${fbY - 7} ${sx + sw},${fbY}`} fill={c.deep} opacity="0.7" />;
            })}
            <rect x={ux + uw / 2 - 4} y={ground - 16} width="8" height="11" fill={c.deep} opacity="0.5" />
            {Array.from({ length: 3 }).map((_, wi) => (
              <rect key={wi} x={ux + 4 + wi * (uw / 3)} y={fbY + 12} width={Math.min(8, uw / 4 - 4)} height="6" fill="#fef3c7" opacity="0.55" />
            ))}
            <rect x={ux + uw - 8} y={fbY - chH} width="5" height={chH + 3} fill={c.deep} />
            <rect x={ux + uw - 8} y={fbY - chH + 5}  width="5" height="3" fill="#fff" opacity="0.6" />
            <rect x={ux + uw - 8} y={fbY - chH + 13} width="5" height="3" fill="#fff" opacity="0.6" />
            <ellipse cx={ux + uw - 5} cy={fbY - chH - 4} rx="6" ry="4" fill="#94a3b8" opacity="0.45" />
            <ellipse cx={ux + uw}     cy={fbY - chH - 8} rx="4" ry="3" fill="#94a3b8" opacity="0.30" />
          </g>
        );
      })}
    </g>
  );
};

const AgricultureScene = ({ x, w, h }: { x: number; w: number; h: number }) => {
  const c = SECTOR_COLORS.agriculture;
  const ground = h - 5;
  const palmCount = Math.max(2, Math.floor(w / 22));
  const spacing = w / (palmCount + 1);

  return (
    <g transform={`translate(${x}, 0)`}>
      <rect x="0" y="0" width={w} height={h} fill={c.soft} opacity="0.2" />
      <path
        d={`M 0 ${ground - 22} Q ${w / 3} ${ground - 36} ${w / 2} ${ground - 26} T ${w} ${ground - 22} L ${w} ${ground} L 0 ${ground} Z`}
        fill={c.deep}
        opacity="0.25"
      />
      {Array.from({ length: palmCount }).map((_, i) => {
        const px = spacing * (i + 1);
        const trunkH = 36 + (i % 2) * 8;
        const trunkY = ground - trunkH;
        return (
          <g key={i} transform={`translate(${px}, 0)`}>
            <rect x="-1" y={trunkY} width="2.5" height={trunkH} fill={c.deep} opacity="0.7" />
            {Array.from({ length: 4 }).map((_, ti) => (
              <line
                key={ti}
                x1="-1.5"
                y1={trunkY + 5 + ti * (trunkH / 4)}
                x2="1.5"
                y2={trunkY + 5 + ti * (trunkH / 4)}
                stroke={c.deep}
                strokeWidth="0.4"
                opacity="0.5"
              />
            ))}
            {[-90, -50, -30, 30, 50, 90].map((angle, fi) => (
              <path
                key={fi}
                d={`M 0 ${trunkY} Q ${Math.cos((angle * Math.PI) / 180) * 8} ${trunkY - 6} ${Math.cos((angle * Math.PI) / 180) * 14} ${trunkY - Math.abs(Math.sin((angle * Math.PI) / 180)) * 4 - 2}`}
                stroke={c.fill}
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                opacity={0.7 + (fi % 2) * 0.2}
              />
            ))}
            <circle cx="-1.5" cy={trunkY + 1} r="1.4" fill={c.deep} opacity="0.6" />
            <circle cx="2"    cy={trunkY + 2} r="1.2" fill={c.deep} opacity="0.6" />
          </g>
        );
      })}
      <g opacity="0.5">
        {Array.from({ length: 3 }).map((_, ri) => (
          <line
            key={ri}
            x1="0"
            y1={ground - 2 + ri * 1.2}
            x2={w}
            y2={ground - 2 + ri * 1.2}
            stroke={c.deep}
            strokeWidth="0.4"
            strokeDasharray="3 2"
          />
        ))}
      </g>
    </g>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectorIllustration, unchanged
// ─────────────────────────────────────────────────────────────────────────────
interface IllustrationProps {
  sectorKey: SectorKey;
  color:     string;
}

const SectorIllustration = ({ sectorKey, color }: IllustrationProps) => {
  if (sectorKey === "services") {
    return (
      <svg viewBox="0 0 100 60" width="160" height="60" style={{ display: "block" }}>
        <rect x="10" y="22" width="14" height="33" fill={color} opacity="0.85" />
        <rect x="26" y="14" width="16" height="41" fill={color} />
        <rect x="44" y="8"  width="18" height="47" fill={color} opacity="0.95" />
        <rect x="64" y="18" width="14" height="37" fill={color} opacity="0.85" />
        <rect x="80" y="28" width="12" height="27" fill={color} opacity="0.7" />
        {[12, 28, 46, 66, 82].map((bx, i) => (
          <g key={i}>
            <rect x={bx}     y={[26, 18, 12, 22, 32][i]} width="3" height="2.5" fill="#fef3c7" opacity="0.9" />
            <rect x={bx + 4} y={[26, 18, 12, 22, 32][i]} width="3" height="2.5" fill="#fef3c7" opacity="0.7" />
            <rect x={bx}     y={[34, 26, 20, 30, 40][i]} width="3" height="2.5" fill="#fef3c7" opacity="0.6" />
            <rect x={bx + 4} y={[34, 26, 20, 30, 40][i]} width="3" height="2.5" fill="#fef3c7" opacity="0.85" />
          </g>
        ))}
        <line x1="0" y1="55" x2="100" y2="55" stroke={color} strokeWidth="0.8" opacity="0.5" />
      </svg>
    );
  }

  if (sectorKey === "industry") {
    return (
      <svg viewBox="0 0 100 60" width="160" height="60" style={{ display: "block" }}>
        <rect x="20" y="30" width="60" height="25" fill={color} opacity="0.85" />
        {[20, 30, 40, 50, 60, 70].map((sx, i) => (
          <polygon key={i} points={`${sx},30 ${sx + 5},22 ${sx + 10},30`} fill={color} />
        ))}
        <rect x="46" y="42" width="8" height="13" fill={color} opacity="0.5" />
        <rect x="26" y="35" width="6" height="4" fill="#fef3c7" opacity="0.7" />
        <rect x="36" y="35" width="6" height="4" fill="#fef3c7" opacity="0.7" />
        <rect x="58" y="35" width="6" height="4" fill="#fef3c7" opacity="0.7" />
        <rect x="68" y="35" width="6" height="4" fill="#fef3c7" opacity="0.7" />
        <rect x="72" y="8"  width="6" height="22" fill={color} />
        <rect x="72" y="14" width="6" height="3"  fill="#fff" opacity="0.6" />
        <ellipse cx="76" cy="6" rx="5" ry="3" fill="#94a3b8" opacity="0.5" />
        <ellipse cx="83" cy="3" rx="4" ry="2.5" fill="#94a3b8" opacity="0.35" />
        <line x1="0" y1="55" x2="100" y2="55" stroke={color} strokeWidth="0.8" opacity="0.5" />
      </svg>
    );
  }

  // Agriculture
  return (
    <svg viewBox="0 0 100 60" width="160" height="60" style={{ display: "block" }}>
      <path d="M 0 42 Q 30 32 50 38 T 100 42 L 100 55 L 0 55 Z" fill={color} opacity="0.25" />
      {[20, 50, 78].map((px, i) => {
        const trunkH = [22, 28, 24][i];
        const trunkY = 55 - trunkH;
        return (
          <g key={i} transform={`translate(${px}, 0)`}>
            <rect x="-1" y={trunkY} width="2" height={trunkH} fill={color} opacity="0.8" />
            {[-90, -55, -25, 25, 55, 90].map((angle, fi) => (
              <path
                key={fi}
                d={`M 0 ${trunkY} Q ${Math.cos((angle * Math.PI) / 180) * 5} ${trunkY - 4} ${Math.cos((angle * Math.PI) / 180) * 9} ${trunkY - Math.abs(Math.sin((angle * Math.PI) / 180)) * 3 - 1}`}
                stroke={color}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                opacity={0.75 + (fi % 2) * 0.2}
              />
            ))}
            <circle cx="-1"  cy={trunkY + 1} r="1"   fill={color} opacity="0.6" />
            <circle cx="1.5" cy={trunkY + 2} r="0.9" fill={color} opacity="0.6" />
          </g>
        );
      })}
      <g opacity="0.4">
        {[52, 53.5].map((y, i) => (
          <line key={i} x1="0" y1={y} x2="100" y2={y} stroke={color} strokeWidth="0.4" strokeDasharray="3 2" />
        ))}
      </g>
      <circle cx="85" cy="14" r="4" fill={color} opacity="0.5" />
    </svg>
  );
};

export default SectorChart;