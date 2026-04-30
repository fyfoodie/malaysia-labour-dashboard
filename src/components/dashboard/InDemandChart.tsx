import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Award, Search, X, ChevronDown, GraduationCap, Sparkles,
} from "lucide-react";
import html2canvas from "html2canvas";
import { useLanguage } from "@/context/LanguageContext";
import { myCOL, dataSources } from "@/data/criticalOccupations";

// ─────────────────────────────────────────────────────────────────────────────
// Source constants
// ─────────────────────────────────────────────────────────────────────────────
const SOURCE_URL   = dataSources.myCOL.url;
const SOURCE_LABEL = `${dataSources.myCOL.publisher}, MyCOL ${myCOL.edition}`;

const SOURCE_NOTE_EN = "Malaysia's official Critical Occupations List, jointly compiled by TalentCorp and ILMIA under the Ministry of Human Resources (KESUMA). A role is critical when it meets three criteria: Skilled (MASCO 1 to 8), Sought after (demand exceeds supply), and Strategic (central to economic development). The 2024/2025 edition expanded from 37 to 66 roles. Universal skills data sourced from MOHE Graduate Tracer Study and APCDA Malaysia Career Development Report 2025/2026.";
const SOURCE_NOTE_BM = "Senarai Pekerjaan Kritikal rasmi Malaysia, disediakan bersama oleh TalentCorp dan ILMIA di bawah Kementerian Sumber Manusia (KESUMA). Sesuatu pekerjaan dianggap kritikal apabila memenuhi tiga kriteria: Mahir (MASCO 1 hingga 8), Diperlukan (permintaan melebihi penawaran), dan Strategik (penting untuk pembangunan ekonomi). Edisi 2024/2025 berkembang daripada 37 kepada 66 pekerjaan. Data kemahiran universal bersumber daripada Kajian Pengesanan Graduan MOHE dan Laporan Pembangunan Kerjaya APCDA Malaysia 2025/2026.";

// MASCO chart colors
const MASCO_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220, 14%, 60%)",
];

// ─────────────────────────────────────────────────────────────────────────────
// Universal skills demanded across critical roles
// Source: MOHE Graduate Tracer Study + APCDA Malaysia 2025/2026
// ─────────────────────────────────────────────────────────────────────────────
const UNIVERSAL_SKILLS = [
  { name_en: "Digital literacy",  name_bm: "Celik digital",    percent: 65, color: "hsl(var(--chart-1))" },
  { name_en: "Critical thinking", name_bm: "Pemikiran kritis", percent: 58, color: "hsl(var(--chart-2))" },
  { name_en: "Communication",     name_bm: "Komunikasi",       percent: 56, color: "hsl(var(--chart-4))" },
  { name_en: "Leadership",        name_bm: "Kepimpinan",       percent: 42, color: "hsl(var(--chart-5))" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MASCO entry route — returns the t() key so the component can call t()
// ─────────────────────────────────────────────────────────────────────────────
function entryRouteKey(mascoGroup: string): string {
  if (!mascoGroup) return "";
  const m = mascoGroup.toLowerCase();
  if (m.includes("manager")      || m.includes("masco 1")) return "indemand.route.manager";
  if (m.includes("professional") || m.includes("masco 2")) return "indemand.route.professional";
  if (m.includes("technician")   || m.includes("associate") || m.includes("masco 3")) return "indemand.route.technician";
  if (m.includes("clerical")     || m.includes("masco 4")) return "indemand.route.clerical";
  if (m.includes("trade")        || m.includes("craft") || m.includes("masco 7")) return "indemand.route.trades";
  if (m.includes("operator")     || m.includes("plant") || m.includes("masco 8")) return "indemand.route.operator";
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Highlight matched search text in role names
// ─────────────────────────────────────────────────────────────────────────────
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-300/40 dark:bg-amber-400/30 text-foreground px-0.5 rounded-sm font-bold">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
const InDemandChart = () => {
  const { t, lang } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showDiff,    setShowDiff]    = useState(false);

  const sourceNote = lang === "bm" ? SOURCE_NOTE_BM : SOURCE_NOTE_EN;

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filteredSectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return myCOL.sectors.map(sector => {
      const filteredRoles = sector.roles.filter(r => {
        const matchesQuery = !q || r.title.toLowerCase().includes(q);
        const matchesNew   = !showNewOnly || r.isNew === true;
        return matchesQuery && matchesNew;
      });
      return { ...sector, filteredRoles };
    });
  }, [searchQuery, showNewOnly]);

  const totalShown = filteredSectors.reduce((sum, s) => sum + s.filteredRoles.length, 0);
  const hasFilter  = searchQuery.length > 0 || showNewOnly;

  // ── Diff: new roles by cluster ────────────────────────────────────────────
  const newRolesByCluster = useMemo(() => (
    myCOL.sectors
      .map(s => ({
        sector:   s.sector,
        color:    s.color,
        emoji:    s.emoji,
        newRoles: s.roles.filter(r => r.isNew === true).map(r => r.title),
      }))
      .filter(s => s.newRoles.length > 0)
      .sort((a, b) => b.newRoles.length - a.newRoles.length)
  ), []);

  const totalNew = newRolesByCluster.reduce((sum, s) => sum + s.newRoles.length, 0);

  const handleExport = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = "in-demand-occupations.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const resetFilters = () => {
    setSearchQuery("");
    setShowNewOnly(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {t("indemand.title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("indemand.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide whitespace-nowrap">
              <Award className="h-3 w-3" />
              MyCOL {myCOL.edition}
            </span>
            <button
              onClick={handleExport}
              title={t("indemand.export")}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="p-5">
        <div className="space-y-4">

          {/* Hero stat strip */}
          <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap pb-3 border-b border-border/50">
            <span className="text-4xl font-extrabold tabular-nums text-foreground leading-none">
              {myCOL.totalRoles}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {t("indemand.roles")}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
              +{myCOL.growthPercent}% vs {myCOL.previousTotal} 2023
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/70 tracking-wide">
              {myCOL.publishedBy}
            </span>
          </div>

          {/* MASCO horizontal strip */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {t("indemand.mascoTitle")}
              </h3>
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                {t("indemand.of")} {myCOL.totalRoles} {t("indemand.roles")}
              </span>
            </div>
            <div className="flex h-5 rounded-md overflow-hidden border border-border">
              {myCOL.mascoComposition.map((m, i) => (
                <div
                  key={m.code}
                  className="relative flex items-center justify-center transition-all hover:brightness-110"
                  style={{ width: `${m.percent}%`, background: MASCO_COLORS[i] }}
                  title={`${m.category}: ${m.percent}%`}
                >
                  {m.percent >= 12 && (
                    <span className="text-[10px] font-bold text-white/95 tabular-nums">
                      {m.percent}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {myCOL.mascoComposition.map((m, i) => (
                <div key={m.code} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: MASCO_COLORS[i] }} />
                  <span className="text-foreground/80">
                    {m.category}{" "}
                    <span className="text-muted-foreground/60 tabular-nums">{m.percent}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Universal skills strip ────────────────────────────────── */}
          <div className="rounded-lg border border-violet-500/20 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-violet-500/5 px-3 py-2.5">
            <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="h-3 w-3 text-violet-500" />
                <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest">
                  {t("indemand.skillsLabel")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {UNIVERSAL_SKILLS.map(s => (
                  <div
                    key={s.name_en}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background/80 border border-border/40 text-[11px]"
                  >
                    <span className="font-medium text-foreground">
                      {lang === "bm" ? s.name_bm : s.name_en}
                    </span>
                    <span className="font-bold tabular-nums" style={{ color: s.color }}>
                      {s.percent}%
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground/60 italic whitespace-nowrap">
                {t("indemand.skillsSource")}
              </span>
            </div>
          </div>

          {/* ── Search and filter bar ─────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("indemand.searchPlaceholder")}
                className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-muted/30 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-muted/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowNewOnly(!showNewOnly)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all border ${
                showNewOnly
                  ? "bg-amber-400/20 text-amber-700 dark:text-amber-400 border-amber-400/40"
                  : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {t("indemand.newOnly")}
            </button>
            <span className="text-[10px] text-muted-foreground/70 tabular-nums whitespace-nowrap">
              {hasFilter ? (
                <><span className="font-bold text-foreground">{totalShown}</span> / {myCOL.totalRoles}</>
              ) : (
                <>{myCOL.totalRoles} {t("indemand.roles")}</>
              )}
            </span>
            {hasFilter && (
              <button
                onClick={resetFilters}
                className="text-[10px] text-muted-foreground/60 hover:text-foreground underline"
              >
                {t("indemand.reset")}
              </button>
            )}
          </div>

          {/* ── Sector cards or empty state ───────────────────────────── */}
          {totalShown === 0 && hasFilter ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
              <Search className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {t("indemand.noMatchMsg")}{" "}
                {searchQuery && (
                  <>"<strong className="text-foreground">{searchQuery}</strong>"</>
                )}
                {showNewOnly && searchQuery && ` ${t("indemand.withNewFilter")}`}
                {showNewOnly && !searchQuery && t("indemand.newOnly").toLowerCase()}
              </p>
              <button
                onClick={resetFilters}
                className="mt-2 text-[11px] text-primary font-medium hover:underline"
              >
                {t("indemand.resetFilters")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredSectors.map((s, i) => (
                <SectorCard
                  key={s.sector}
                  sector={s}
                  index={i}
                  hasFilter={hasFilter}
                  searchQuery={searchQuery}
                  t={t}
                  lang={lang}
                />
              ))}
            </div>
          )}

          {/* ── "What's new since 2023?" expander ────────────────────── */}
          <div className="rounded-xl border border-border bg-muted/10 overflow-hidden">
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-muted/20 transition-all"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-700 dark:text-amber-400 tracking-wider">
                  +{totalNew} {lang === "bm" ? "BAHARU" : "NEW"}
                </span>
                <span className="text-xs font-bold text-foreground">
                  {t("indemand.addedSince")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t("indemand.seeChanged")}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showDiff ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence initial={false}>
              {showDiff && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0 space-y-2 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-3">
                      {t("indemand.diffIntro")}{" "}
                      <strong className="text-foreground">{myCOL.previousTotal}</strong>{" "}
                      {t("indemand.diffRolesIn")}{" "}
                      <strong className="text-foreground">{myCOL.totalRoles}</strong>{" "}
                      {lang === "bm" ? "dalam" : "in"} {myCOL.edition}.{" "}
                      {t("indemand.diffLanded")}
                    </p>
                    {newRolesByCluster.map((cluster, idx) => (
                      <motion.div
                        key={cluster.sector}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="rounded-lg bg-background border border-border/50 p-2.5"
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm flex-shrink-0">{cluster.emoji}</span>
                          <span className="text-[11px] font-bold text-foreground">
                            {cluster.sector}
                          </span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto tabular-nums"
                            style={{ background: cluster.color + "1a", color: cluster.color }}
                          >
                            +{cluster.newRoles.length} {t("indemand.diffNew")}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cluster.newRoles.map(role => (
                            <span
                              key={role}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-700 dark:text-amber-400 border border-amber-400/20"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Source footer ─────────────────────────────────────────────── */}
        <div className="mt-4 space-y-2.5">
          <p className="text-[10px] text-muted-foreground/60 italic text-center leading-relaxed">
            <Sparkles className="inline h-2.5 w-2.5 mr-0.5 text-violet-500/60" />
            {t("indemand.repNote")}
          </p>
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-border/40">
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground/60 underline hover:text-foreground transition-colors"
            >
              {SOURCE_LABEL}
            </a>
            <div className="group relative flex items-center">
              <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[10px] font-bold select-none">
                i
              </div>
              <div className="absolute bottom-6 right-0 w-72 bg-card border border-border rounded-xl p-3 shadow-lg text-xs text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                {sourceNote}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sector card — uses t() for all text, searchQuery for highlights
// ─────────────────────────────────────────────────────────────────────────────
interface SectorCardProps {
  sector:      typeof myCOL.sectors[0] & { filteredRoles: typeof myCOL.sectors[0]["roles"] };
  index:       number;
  hasFilter:   boolean;
  searchQuery: string;
  t:           (key: string) => string;
  lang:        string;
}

const SectorCard = ({ sector, index, hasFilter, searchQuery, t, lang }: SectorCardProps) => {
  const newCount    = sector.roles.filter(r => r.isNew === true).length;
  const routeKey    = entryRouteKey(sector.mascoGroup);
  const entryRoute  = routeKey ? t(routeKey) : "";
  const noMatches   = hasFilter && sector.filteredRoles.length === 0;
  const rolesToShow = hasFilter ? sector.filteredRoles : sector.roles.slice(0, 5);
  const overflowCount = !hasFilter && sector.roles.length > 5 ? sector.roles.length - 5 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={`sector-card relative rounded-xl border border-border p-3 bg-background transition-all ${
        noMatches ? "opacity-40" : ""
      }`}
      style={{ "--sc": sector.color } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base flex-shrink-0">{sector.emoji}</span>
          <div className="min-w-0">
            <h4 className="text-[12px] font-bold text-foreground leading-tight truncate">
              {sector.sector}
            </h4>
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mt-0.5">
              {sector.mascoGroup}
            </p>
            {entryRoute && (
              <p className="text-[9px] text-muted-foreground/60 italic mt-0.5 flex items-center gap-1">
                <GraduationCap className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{entryRoute}</span>
              </p>
            )}
          </div>
        </div>
        <span
          className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-sm flex-shrink-0"
          style={{ background: sector.color + "1a", color: sector.color }}
        >
          {hasFilter
            ? `${sector.filteredRoles.length}/${sector.roles.length}`
            : sector.roles.length}
        </span>
      </div>

      {/* Roles list */}
      {noMatches ? (
        <p className="text-[10px] text-muted-foreground/50 italic text-center py-3">
          {t("indemand.noMatchCard")}
        </p>
      ) : (
        <ul className="space-y-1">
          {rolesToShow.map(r => (
            <li key={r.title} className="text-[11px] text-foreground/80 flex items-center gap-1.5 leading-snug">
              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: sector.color }} />
              <span className="truncate flex-1">
                {highlightMatch(r.title, searchQuery)}
              </span>
              {r.isNew && (
                <span className="text-[8px] font-bold px-1 py-px rounded bg-amber-400/20 text-amber-700 dark:text-amber-400 tracking-wide flex-shrink-0">
                  {lang === "bm" ? "BAHARU" : "NEW"}
                </span>
              )}
            </li>
          ))}
          {overflowCount > 0 && (
            <li className="text-[10px] text-muted-foreground/60 italic pl-2.5">
              + {overflowCount} {t("indemand.moreRoles")}
            </li>
          )}
        </ul>
      )}

      {newCount > 0 && !hasFilter && (
        <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-2 font-semibold tracking-wide">
          {newCount} {t("indemand.newInEdition")} {myCOL.edition}
        </p>
      )}

      <style>{`
        .sector-card { box-shadow: 0 0 0 1px hsl(var(--border) / 0.7); }
        .sector-card:hover {
          box-shadow: 0 0 0 1.5px var(--sc, hsl(var(--border))), 0 4px 16px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
      `}</style>
    </motion.div>
  );
};

export default InDemandChart;