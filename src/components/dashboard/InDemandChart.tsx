import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Award, Search, X, GraduationCap, Sparkles,
  ArrowLeft, ChevronDown,
} from "lucide-react";
import html2canvas from "html2canvas";
import { useLanguage } from "@/context/LanguageContext";
import {
  myCOL, dataSources, persistenceTier,
  editionTotals, editionRoleCodes, editionPublishedBy,
  type CriticalRole, type PersistenceTier, type EditionLabel,
} from "@/data/criticalOccupations";

// ─────────────────────────────────────────────────────────────────────────────
// Source constants
// ─────────────────────────────────────────────────────────────────────────────
const SOURCE_URL   = dataSources.myCOL.url;
const SOURCE_LABEL = `${dataSources.myCOL.publisher}, MyCOL ${myCOL.edition}`;

const SOURCE_NOTE_EN = "Malaysia's official Critical Occupations List, jointly compiled by TalentCorp and ILMIA under the Ministry of Human Resources (KESUMA). A role is critical when it meets three criteria: skilled, sought-after (demand exceeds supply), and strategic (central to economic development). The 2024/2025 edition expanded from 37 to 66 roles. Persistence tiers track how many editions each MASCO 4-digit code has appeared on, across 2019/2020, 2020/2021, 2022/2023 and 2024/2025.";
const SOURCE_NOTE_BM = "Senarai Pekerjaan Kritikal rasmi Malaysia, disediakan bersama oleh TalentCorp dan ILMIA di bawah Kementerian Sumber Manusia (KESUMA). Sesuatu pekerjaan dianggap kritikal apabila memenuhi tiga kriteria: mahir, diperlukan (permintaan melebihi penawaran), dan strategik (penting untuk pembangunan ekonomi). Edisi 2024/2025 berkembang daripada 37 kepada 66 pekerjaan.";

// ─────────────────────────────────────────────────────────────────────────────
// Tier visuals
// ─────────────────────────────────────────────────────────────────────────────
const TIER_VISUAL: Record<PersistenceTier, { color: string; labelKey: string; tipKey: string }> = {
  persistent: { color: "#ea580c", labelKey: "indemand.persistent", tipKey: "indemand.tipPersistent" },
  recurring:  { color: "#f59e0b", labelKey: "indemand.recurring",  tipKey: "indemand.tipRecurring"  },
  new:        { color: "#8b5cf6", labelKey: "indemand.newTier",    tipKey: "indemand.tipNew"        },
  returning:  { color: "#64748b", labelKey: "indemand.relisted",   tipKey: "indemand.tipRelisted"   },
};
const TIER_ORDER: PersistenceTier[] = ["persistent", "recurring", "new", "returning"];

// MASCO bar colors (mapped by category code)
const MASCO_BAR_COLORS: Record<string, string> = {
  "1": "#3b82f6",  // Managers
  "2": "#8b5cf6",  // Professionals
  "3": "#10b981",  // Technicians
  "7": "#f59e0b",  // Trades
  "8": "#ef4444",  // Plant/operators
};

// MASCO group classification for past-edition view
const MASCO_GROUP_KEYS: Record<string, string> = {
  "1": "indemand.groupManagers",
  "2": "indemand.groupProfessionals",
  "3": "indemand.groupTechnicians",
  "7": "indemand.groupTrades",
  "8": "indemand.groupOperators",
};

// Universal skills with percentages (revealed on expansion)
const UNIVERSAL_SKILLS = [
  { key: "indemand.skillDigital",  percent: 65, color: "#8b5cf6" },
  { key: "indemand.skillCritical", percent: 58, color: "#0ea5e9" },
  { key: "indemand.skillComm",     percent: 56, color: "#ec4899" },
  { key: "indemand.skillLeader",   percent: 42, color: "#f59e0b" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Historical role titles (codes that appeared in pre-2024/2025 editions but are
// not in the current edition, used by past-edition browser)
// ─────────────────────────────────────────────────────────────────────────────
const HISTORICAL_TITLES: Record<string, string> = {
  "1219": "Business Services Managers",
  "1222": "Advertising and PR Managers",
  "1323": "Construction Managers",
  "2114": "Geologists and Geophysicists",
  "2153": "Telecommunications Engineers",
  "2173": "Aircraft Pilots",
  "2434": "ICT Sales Professionals",
  "2513": "Web and Multimedia Developers",
  "2529": "Database & Network Professionals",
  "3123": "Construction Supervisors",
  "3129": "Physical & Engineering Sci. Technicians",
  "3211": "Medical Imaging Equipment Technicians",
  "3322": "Commercial Sales Representatives",
  "3323": "Buyers",
  "7111": "House Builders",
  "7132": "Spray Painters and Varnishers",
  "7211": "Metal Moulders and Coremakers",
  "7222": "Toolmakers and Related Workers",
  "7411": "Building Electricians",
  "7422": "ICT Installers and Servicers",
  "8161": "Food Products Machine Operators",
  "8342": "Earth-Moving Plant Operators",
};

function getRoleTitle(code: string): string {
  for (const sector of myCOL.sectors) {
    const role = sector.roles.find(r => r.code === code);
    if (role) return role.title;
  }
  return HISTORICAL_TITLES[code] ?? code;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
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

function entryRouteKey(mascoGroup: string): string {
  if (!mascoGroup) return "";
  const m = mascoGroup.toLowerCase();
  if (m.includes("manager")      || m.includes("masco 1")) return "indemand.route.manager";
  if (m.includes("professional") || m.includes("masco 2")) return "indemand.route.professional";
  if (m.includes("technician")   || m.includes("associate") || m.includes("masco 3")) return "indemand.route.technician";
  if (m.includes("trade")        || m.includes("craft") || m.includes("masco 7")) return "indemand.route.trades";
  if (m.includes("operator")     || m.includes("plant") || m.includes("masco 8")) return "indemand.route.operator";
  return "";
}

function sortByTier(roles: CriticalRole[]): CriticalRole[] {
  const rank: Record<PersistenceTier, number> = { persistent: 0, recurring: 1, new: 2, returning: 3 };
  return [...roles].sort((a, b) => rank[persistenceTier(a)] - rank[persistenceTier(b)]);
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
const InDemandChart = () => {
  const { t, lang } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery]               = useState("");
  const [showNewOnly, setShowNewOnly]               = useState(false);
  const [showPersistentOnly, setShowPersistentOnly] = useState(false);
  const [selectedEdition, setSelectedEdition]       = useState<EditionLabel>("2024/2025");

  // Bar tab toggle: "persistence" (default) or "masco" (skill category)
  const [breakdownView, setBreakdownView] = useState<"persistence" | "masco">("persistence");
  // Skill details expander
  const [showSkillDetails, setShowSkillDetails] = useState(false);
  // Per-card expand state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const isCurrent  = selectedEdition === "2024/2025";
  const sourceNote = lang === "bm" ? SOURCE_NOTE_BM : SOURCE_NOTE_EN;

  const tierCounts = useMemo(() => {
    const counts: Record<PersistenceTier, number> = { persistent: 0, recurring: 0, new: 0, returning: 0 };
    myCOL.sectors.forEach(s => s.roles.forEach(r => { counts[persistenceTier(r)]++; }));
    return counts;
  }, []);

  const filteredSectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return myCOL.sectors.map(sector => {
      const filteredRoles = sector.roles.filter(r => {
        const matchesQuery   = !q || r.title.toLowerCase().includes(q);
        const matchesNew     = !showNewOnly        || r.isNew === true;
        const matchesPersist = !showPersistentOnly || persistenceTier(r) === "persistent";
        return matchesQuery && matchesNew && matchesPersist;
      });
      return { ...sector, filteredRoles };
    });
  }, [searchQuery, showNewOnly, showPersistentOnly]);

  const totalShown = filteredSectors.reduce((sum, s) => sum + s.filteredRoles.length, 0);
  const hasFilter  = searchQuery.length > 0 || showNewOnly || showPersistentOnly;

  const toggleCardExpand = (sectorName: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(sectorName) ? next.delete(sectorName) : next.add(sectorName);
      return next;
    });
  };

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
    setShowPersistentOnly(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.5 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
    >
      {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
      <div className="px-6 pt-4 pb-3 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex-1">
            <h2 className="text-2xl md:text-[26px] font-extrabold text-foreground leading-tight">
              {t("indemand.title")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug max-w-2xl">
              {t("indemand.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide whitespace-nowrap">
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

      {/* ═══ BODY ═══════════════════════════════════════════════════════════ */}
      <div className="px-6 py-4 space-y-4">

        {/* ── Hero stat + breakdown bar with tab toggle ────────────────── */}
        {isCurrent && (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-4xl font-black tabular-nums text-foreground leading-none">
                {myCOL.totalRoles}
              </span>
              <span className="text-sm font-bold text-foreground">{t("indemand.roles")}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                +{myCOL.growthPercent}% vs {myCOL.previousTotal} 2023
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/70">
                {myCOL.publishedBy}
              </span>
            </div>

            {/* Tab toggle: Persistence | Skill category */}
            <div className="flex items-center gap-1 mt-2">
              {([
                { key: "persistence", label: "indemand.viewPersistence" },
                { key: "masco",       label: "indemand.viewMasco"       },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setBreakdownView(tab.key)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all border ${
                    breakdownView === tab.key
                      ? "bg-foreground text-background border-foreground"
                      : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {t(tab.label)}
                </button>
              ))}
              {breakdownView === "masco" && (
                <span className="ml-auto text-[10px] text-muted-foreground/60 tabular-nums">
                  100% {t("indemand.outOf")} {myCOL.totalRoles} {t("indemand.roles")}
                </span>
              )}
            </div>

            {/* Bar */}
            <AnimatePresence mode="wait">
              {breakdownView === "persistence" ? (
                <motion.div
                  key="persistence"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex h-7 rounded-md overflow-hidden border border-border">
                    {TIER_ORDER.map(tier => {
                      const count = tierCounts[tier];
                      if (count === 0) return null;
                      const v   = TIER_VISUAL[tier];
                      const pct = (count / myCOL.totalRoles) * 100;
                      return (
                        <div
                          key={tier}
                          className="relative flex items-center justify-center transition-all hover:brightness-110 cursor-default"
                          style={{ width: `${pct}%`, background: v.color }}
                          title={`${t(v.labelKey)}: ${count} ${t("indemand.roles")}, ${t(v.tipKey)}`}
                        >
                          <span className="text-[11px] font-black text-white tabular-nums drop-shadow-sm">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    {TIER_ORDER.map(tier => {
                      const count = tierCounts[tier];
                      if (count === 0) return null;
                      const v = TIER_VISUAL[tier];
                      return (
                        <div key={tier} className="group relative flex items-center gap-1 text-[10px] cursor-help">
                          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: v.color }} />
                          <span className="text-foreground/80 font-medium">{t(v.labelKey)}</span>
                          <span className="text-muted-foreground/60 tabular-nums">{count}</span>
                          <div className="absolute bottom-5 left-0 w-60 bg-card border border-border rounded-lg p-2.5 shadow-lg text-[11px] text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                            <span className="font-bold text-foreground">{t(v.labelKey)}</span>
                            <span className="block mt-1">{t(v.tipKey)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="masco"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex h-7 rounded-md overflow-hidden border border-border">
                    {myCOL.mascoComposition.map(m => (
                      <div
                        key={m.code}
                        className="relative flex items-center justify-center transition-all hover:brightness-110 cursor-default"
                        style={{ width: `${m.percent}%`, background: MASCO_BAR_COLORS[m.code] }}
                        title={`${m.category}: ${m.percent}%`}
                      >
                        {m.percent >= 10 && (
                          <span className="text-[11px] font-black text-white tabular-nums drop-shadow-sm">
                            {m.percent}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    {myCOL.mascoComposition.map(m => (
                      <div key={m.code} className="flex items-center gap-1 text-[10px]">
                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: MASCO_BAR_COLORS[m.code] }} />
                        <span className="text-foreground/80 font-medium">{m.category}</span>
                        <span className="text-muted-foreground/60 tabular-nums">{m.percent}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Edition timeline (clickable) ────────────────────────────── */}
        <EditionTimeline t={t} selected={selectedEdition} onSelect={setSelectedEdition} />

        {/* ── Branch: current vs past edition ─────────────────────────── */}
        {isCurrent ? (
          <CurrentEditionView
            t={t} lang={lang}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            showNewOnly={showNewOnly} setShowNewOnly={setShowNewOnly}
            showPersistentOnly={showPersistentOnly} setShowPersistentOnly={setShowPersistentOnly}
            hasFilter={hasFilter} totalShown={totalShown}
            filteredSectors={filteredSectors}
            expandedCards={expandedCards} toggleCardExpand={toggleCardExpand}
            resetFilters={resetFilters}
          />
        ) : (
          <PastEditionView
            edition={selectedEdition}
            t={t}
            onBack={() => setSelectedEdition("2024/2025")}
          />
        )}

        {/* ── Skills line, always visible, expandable ─────────────────── */}
        <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 overflow-hidden">
          <button
            onClick={() => setShowSkillDetails(!showSkillDetails)}
            className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-violet-500/10 transition-colors text-left"
          >
            <Sparkles className="h-3 w-3 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-snug text-muted-foreground flex-1">
              {t("indemand.skillsLine")}
            </p>
            <ChevronDown
              className={`h-3.5 w-3.5 text-violet-500 flex-shrink-0 transition-transform duration-200 mt-0.5 ${
                showSkillDetails ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {showSkillDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-violet-500/15">
                  {/* Skill chips with percentages */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {UNIVERSAL_SKILLS.map(s => (
                      <div
                        key={s.key}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background/80 border border-border/40 text-[11px]"
                      >
                        <span className="font-medium text-foreground">{t(s.key)}</span>
                        <span className="font-bold tabular-nums" style={{ color: s.color }}>{s.percent}%</span>
                      </div>
                    ))}
                  </div>
                  {/* Source attribution */}
                  <p className="text-[9px] text-muted-foreground/60 italic">
                    {t("indemand.skillsSource")}
                  </p>
                  {/* REP / Skills Passport stat */}
                  <div className="flex items-start gap-1.5 pt-1.5 border-t border-violet-500/10">
                    <Sparkles className="h-2.5 w-2.5 text-violet-500/60 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {t("indemand.repNote")}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ SOURCE FOOTER ═══════════════════════════════════════════════ */}
      <div className="px-6 py-2 border-t border-border bg-muted/10">
        <div className="flex items-center justify-between gap-3">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground/60 underline hover:text-foreground transition-colors"
          >
            {SOURCE_LABEL}
          </a>
          <div className="group relative flex items-center flex-shrink-0">
            <div className="w-4 h-4 rounded-full border border-muted-foreground/40 flex items-center justify-center cursor-help text-muted-foreground/60 text-[10px] font-bold select-none">
              i
            </div>
            <div className="absolute bottom-6 right-0 w-80 bg-card border border-border rounded-xl p-3 shadow-lg text-[11px] text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 space-y-2">
              <p className="font-bold text-foreground">{t("indemand.aboutMyCOL")}</p>
              <p>{sourceNote}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// EditionTimeline (clickable)
// ═════════════════════════════════════════════════════════════════════════════
interface TimelineProps {
  t: (key: string) => string;
  selected: EditionLabel;
  onSelect: (e: EditionLabel) => void;
}

const EditionTimeline = ({ t, selected, onSelect }: TimelineProps) => {
  const editions: { ed: EditionLabel; short: string; count: number }[] = [
    { ed: "2019/2020", short: "2019/20", count: editionTotals["2019/2020"] },
    { ed: "2020/2021", short: "2020/21", count: editionTotals["2020/2021"] },
    { ed: "2022/2023", short: "2022/23", count: editionTotals["2022/2023"] },
    { ed: "2024/2025", short: "2024/25", count: editionTotals["2024/2025"] },
  ];
  const maxCount = Math.max(...editions.map(e => e.count));
  const minR = 6;
  const maxR = 13;

  return (
    <div className="rounded-lg border border-border bg-muted/15 px-3 pt-2 pb-2.5">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground/70 uppercase">
          {t("indemand.howChanged")}
        </p>
        <p className="text-[9px] text-muted-foreground/50 italic">{t("indemand.clickToView")}</p>
      </div>
      <svg viewBox="0 0 400 60" className="w-full h-[60px]" preserveAspectRatio="xMidYMid meet">
        <line x1="50" y1="30" x2="350" y2="30" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="3 3" />
        {editions.map((ed, i) => {
          const cx = 50 + (i * 100);
          const r  = minR + ((ed.count / maxCount) * (maxR - minR));
          const isSelected = ed.ed === selected;
          const fill = isSelected ? "#0ea5e9" : "#94a3b8";
          return (
            <g
              key={ed.ed}
              className="cursor-pointer"
              onClick={() => onSelect(ed.ed)}
              role="button"
              aria-label={`View ${ed.short} list`}
            >
              <rect x={cx - 35} y="0" width="70" height="60" fill="transparent" />
              {isSelected && (
                <circle cx={cx} cy="30" r={r + 4} fill="none" stroke={fill} strokeWidth="1.5" opacity="0.4" />
              )}
              <circle cx={cx} cy="30" r={r} fill={fill} opacity={isSelected ? 1 : 0.55} className="transition-all" />
              <text x={cx} y="11" textAnchor="middle" fontSize="9"
                    fill="hsl(var(--muted-foreground))" fontWeight="600"
                    className="tabular-nums select-none pointer-events-none">{ed.short}</text>
              <text x={cx} y="55" textAnchor="middle" fontSize="12"
                    fill={isSelected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                    fontWeight="800"
                    className="tabular-nums select-none pointer-events-none">{ed.count}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// CurrentEditionView (search + filters + grid)
// ═════════════════════════════════════════════════════════════════════════════
interface CurrentViewProps {
  t: (key: string) => string;
  lang: string;
  searchQuery: string; setSearchQuery: (s: string) => void;
  showNewOnly: boolean; setShowNewOnly: (b: boolean) => void;
  showPersistentOnly: boolean; setShowPersistentOnly: (b: boolean) => void;
  hasFilter: boolean; totalShown: number;
  filteredSectors: any;
  expandedCards: Set<string>;
  toggleCardExpand: (sectorName: string) => void;
  resetFilters: () => void;
}

const CurrentEditionView = ({
  t, lang,
  searchQuery, setSearchQuery,
  showNewOnly, setShowNewOnly,
  showPersistentOnly, setShowPersistentOnly,
  hasFilter, totalShown, filteredSectors,
  expandedCards, toggleCardExpand,
  resetFilters,
}: CurrentViewProps) => (
  <>
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
          <button onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <button
        onClick={() => setShowPersistentOnly(!showPersistentOnly)}
        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all border ${
          showPersistentOnly
            ? "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40"
            : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
        }`}
        title={t("indemand.tipPersistent")}
      >
        {t("indemand.persistentOnly")}
      </button>

      <button
        onClick={() => setShowNewOnly(!showNewOnly)}
        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all border ${
          showNewOnly
            ? "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/40"
            : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
        }`}
        title={t("indemand.tipNew")}
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
        <button onClick={resetFilters}
                className="text-[10px] text-muted-foreground/60 hover:text-foreground underline">
          {t("indemand.reset")}
        </button>
      )}
    </div>

    {totalShown === 0 && hasFilter ? (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center">
        <Search className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
        <p className="text-xs text-muted-foreground">
          {t("indemand.noMatchMsg")}{" "}
          {searchQuery && <>"<strong className="text-foreground">{searchQuery}</strong>"</>}
          {showNewOnly && searchQuery && ` ${t("indemand.withNewFilter")}`}
        </p>
        <button onClick={resetFilters} className="mt-2 text-[11px] text-primary font-medium hover:underline">
          {t("indemand.resetFilters")}
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-start">
        {filteredSectors.map((s: any, i: number) => (
          <SectorCard
            key={s.sector}
            sector={s} index={i}
            hasFilter={hasFilter} searchQuery={searchQuery}
            isExpanded={expandedCards.has(s.sector)}
            onToggleExpand={() => toggleCardExpand(s.sector)}
            t={t} lang={lang}
          />
        ))}
      </div>
    )}
  </>
);

// ═════════════════════════════════════════════════════════════════════════════
// SectorCard, click-to-expand, MASCO label restored, entry route at top
// ═════════════════════════════════════════════════════════════════════════════
interface SectorCardProps {
  sector:      typeof myCOL.sectors[0] & { filteredRoles: typeof myCOL.sectors[0]["roles"] };
  index:       number;
  hasFilter:   boolean;
  searchQuery: string;
  isExpanded:  boolean;
  onToggleExpand: () => void;
  t:           (key: string) => string;
  lang:        string;
}

const SectorCard = ({
  sector, index, hasFilter, searchQuery, isExpanded, onToggleExpand, t, lang,
}: SectorCardProps) => {
  const routeKey      = entryRouteKey(sector.mascoGroup);
  const entryRoute    = routeKey ? t(routeKey) : "";
  const noMatches     = hasFilter && sector.filteredRoles.length === 0;
  const baseRoles     = hasFilter ? sector.filteredRoles : sector.roles;
  const sortedRoles   = sortByTier(baseRoles);
  const hasOverflow   = !hasFilter && sortedRoles.length > 3;
  const rolesToShow   = (hasFilter || isExpanded) ? sortedRoles : sortedRoles.slice(0, 3);
  const overflowCount = hasOverflow && !isExpanded ? sortedRoles.length - 3 : 0;
  const isClickable   = hasOverflow && !hasFilter && !noMatches;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      onClick={isClickable ? onToggleExpand : undefined}
      role={isClickable ? "button" : undefined}
      aria-expanded={isClickable ? isExpanded : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleExpand(); }
      } : undefined}
      className={`sector-card relative rounded-xl border border-border p-2.5 bg-background transition-all ${
        noMatches ? "opacity-40" : ""
      } ${isClickable ? "cursor-pointer" : ""}`}
      style={{ "--sc": sector.color } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          <span className="text-base flex-shrink-0 leading-none mt-0.5">{sector.emoji}</span>
          <div className="min-w-0 flex-1">
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
        <p className="text-[10px] text-muted-foreground/50 italic text-center py-2">
          {t("indemand.noMatchCard")}
        </p>
      ) : (
        <ul className="space-y-0.5">
          {rolesToShow.map(r => {
            const tier  = persistenceTier(r);
            const v     = TIER_VISUAL[tier];
            const count = r.appearances.length;
            return (
              <li key={r.code} className="text-[11px] text-foreground/80 flex items-center gap-1.5 leading-snug">
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: sector.color }} />
                <span className="truncate flex-1">{highlightMatch(r.title, searchQuery)}</span>
                {r.isNew ? (
                  <span className="text-[8px] font-bold px-1 py-px rounded bg-violet-400/20 text-violet-700 dark:text-violet-400 tracking-wide flex-shrink-0">
                    {lang === "bm" ? "BAHARU" : "NEW"}
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-bold tabular-nums flex-shrink-0"
                    style={{ color: v.color }}
                    title={`${t(v.labelKey)}, ${t(v.tipKey)}`}
                  >
                    {count}×
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Expand/collapse footer */}
      {isClickable && (
        <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/70 italic">
            {isExpanded
              ? t("indemand.showLess")
              : `+ ${overflowCount} ${t("indemand.moreRoles")}`}
          </span>
          <ChevronDown
            className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
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

// ═════════════════════════════════════════════════════════════════════════════
// PastEditionView, grouped by MASCO major group
// ═════════════════════════════════════════════════════════════════════════════
interface PastViewProps {
  edition: EditionLabel;
  t: (key: string) => string;
  onBack: () => void;
}

const PastEditionView = ({ edition, t, onBack }: PastViewProps) => {
  const codes        = editionRoleCodes[edition];
  const total        = editionTotals[edition];
  const publishBy    = editionPublishedBy[edition];
  const editionShort = edition.replace("/20", "/").replace(/\/$/, "");

  const byGroup = useMemo(() => {
    const groups: Record<string, { code: string; title: string }[]> = {};
    codes.forEach(code => {
      const g = code[0];
      if (!groups[g]) groups[g] = [];
      groups[g].push({ code, title: getRoleTitle(code) });
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => a.code.localeCompare(b.code)));
    return groups;
  }, [codes]);

  const orderedKeys = ["1", "2", "3", "7", "8"].filter(k => byGroup[k]?.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold">
            {t("indemand.viewing")}
          </span>
          <span className="text-2xl font-black tabular-nums text-foreground tracking-tight">
            MyCOL {editionShort}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            <strong className="text-foreground">{total}</strong> {t("indemand.roles")}
          </span>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("indemand.backToCurrent")}
        </button>
      </div>

      {publishBy && (
        <p className="text-[10px] text-muted-foreground/60 -mt-2">{publishBy}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {orderedKeys.map(g => {
          const items = byGroup[g];
          const color = MASCO_BAR_COLORS[g];
          return (
            <div key={g} className="rounded-xl border border-border p-2.5 bg-background">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                  <span className="text-[12px] font-bold text-foreground">{t(MASCO_GROUP_KEYS[g])}</span>
                </div>
                <span
                  className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-sm"
                  style={{ background: color + "1a", color }}
                >
                  {items.length}
                </span>
              </div>
              <ul className="space-y-0.5">
                {items.map(r => (
                  <li key={r.code} className="text-[11px] text-foreground/80 flex items-center gap-1.5 leading-snug">
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="truncate flex-1">{r.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default InDemandChart;