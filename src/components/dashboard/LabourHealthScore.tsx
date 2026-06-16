import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Info, X } from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";

/* ═══════════════════════════════════════════════════════════════════════════
   LABOUR HEALTH INDEX  v3
   ───────────────────────────────────────────────────────────────────────────
   7-indicator weighted composite. Each indicator is rescaled 0–100 against
   a calibrated floor/ceiling derived from Malaysia's real data range 2010–2026.

   Composite = Σ (sub-score × weight)   weights sum to 1.00

   Field names confirmed from OpenDOSM API schemas:
     lfs_month          → u_rate, p_rate, lf_employed
     lfs_month_youth    → u_rate_15_24
     lfs_qtr_sru_sex    → sex, variable, sru  (the underemployment chart already uses these)
     hh_income          → income_median
     lfs_month_duration → varies; derived from unemployed_active + lt3 if available
   ═══════════════════════════════════════════════════════════════════════════ */

type Direction = "up" | "down";

interface Benchmark {
  key:       string;
  label_en:  string;
  label_bm:  string;
  weight:    number;
  floor:     number;
  ceiling:   number;
  direction: Direction;
  unit:      string;
  basis:     string;
}

// ── Calibrated benchmarks ────────────────────────────────────────────────────
const B: Record<string, Benchmark> = {
  unemployment: {
    key: "unemployment", label_en: "Unemployment Rate", label_bm: "Kadar Pengangguran",
    weight: 0.25, floor: 5.5, ceiling: 2.5, direction: "down", unit: "%",
    basis: "Malaysia ranged 2.9% (Nov 2025, 11-yr low) to 5.2% (May 2020, COVID peak). Band 2.5–5.5%.",
  },
  participation: {
    key: "participation", label_en: "Participation Rate", label_bm: "Kadar Penyertaan",
    weight: 0.20, floor: 62, ceiling: 72, direction: "up", unit: "%",
    basis: "LFPR climbed from ~62% (2010) to a record 71.0% (Nov 2025). Band 62–72%.",
  },
  growth: {
    key: "growth", label_en: "Employment Growth (MoM)", label_bm: "Pertumbuhan Pekerjaan (BkB)",
    weight: 0.15, floor: -0.3, ceiling: 0.5, direction: "up", unit: "%",
    basis: "Healthy months add 0.2–0.4% jobs. COVID months cut up to 2%. Band −0.3 to +0.5%.",
  },
  youth: {
    key: "youth", label_en: "Youth Unemployment (15–24)", label_bm: "Pengangguran Belia (15–24)",
    weight: 0.15, floor: 14, ceiling: 6, direction: "down", unit: "%",
    basis: "Youth rate sat at ~10.1% (late 2025), structurally ~3× national. Band 6–14%.",
  },
  mismatch: {
    key: "mismatch", label_en: "Skills Mismatch", label_bm: "Ketidakpadanan Kemahiran",
    weight: 0.10, floor: 42, ceiling: 28, direction: "down", unit: "%",
    basis: "DOSM SRU rate ran 35–38% in recent years. Band 28–42% brackets that range.",
  },
  income: {
    key: "income", label_en: "Household Income", label_bm: "Pendapatan Isi Rumah",
    weight: 0.10, floor: 4000, ceiling: 9000, direction: "up", unit: "RM",
    basis: "Median monthly income RM6,338 (HIES 2022), up from ~RM4,500 (2012). Band RM4,000–9,000.",
  },
  duration: {
    key: "duration", label_en: "Short-term Unemployed", label_bm: "Penganggur Jangka Pendek",
    weight: 0.05, floor: 45, ceiling: 75, direction: "up", unit: "%",
    basis: "Share unemployed <3 months was ~64% (Nov 2025). Higher = less structural joblessness. Band 45–75%.",
  },
};

function clamp(v: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }

function rescale(value: number, b: Benchmark): number {
  if (b.direction === "up")
    return clamp(((value - b.floor) / (b.ceiling - b.floor)) * 100);
  return clamp(((b.floor - value) / (b.floor - b.ceiling)) * 100);
}

const scoreColor = (s: number) => s >= 70 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444";

interface Ind {
  key: string; label: string; rawValue: string; score: number;
  weight: number; available: boolean; bm: Benchmark;
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
const DashRing = ({ score, ringColor, size = 240 }: { score: number; ringColor: string; size?: number }) => {
  const R = 90, cx = size / 2, cy = size * 0.533;
  const circ = Math.PI * R;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size * 0.617} viewBox={`0 0 ${size} ${size * 0.617}`}>
      <path d={`M ${cx-(R+10)} ${cy} A ${R+10} ${R+10} 0 0 1 ${cx+(R+10)} ${cy}`}
        fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="3 5" strokeLinecap="round" />
      <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
        fill="none" stroke="hsl(var(--muted))" strokeWidth="16" strokeLinecap="round" />
      <motion.path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
        fill="none" stroke={ringColor} strokeWidth="16" strokeLinecap="round"
        strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${ringColor}80)` }} />
      <text x={cx-(R+10)} y={size*0.617-3} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">0</text>
      <text x={cx+(R+10)} y={size*0.617-3} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">100</text>
      <text x={cx} y="14" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">50</text>
    </svg>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const LabourHealthScore = () => {
  const { data, loading } = useLabourData();
  if (data?.youth?.length) console.log("[DEBUG youth]", JSON.stringify(data.youth[data.youth.length-1]));
  if (data?.mismatch?.length) console.log("[DEBUG mismatch]", JSON.stringify(data.mismatch[0]));
  if (data?.duration?.length) console.log("[DEBUG duration]", JSON.stringify(data.duration[data.duration.length-1]));
  const { t, lang } = useLanguage();
  const [showMethod, setShowMethod] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const isBm = lang === "bm";

  const result = useMemo(() => {
    if (!data?.national?.length) return null;

    const national = [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latest = national[national.length - 1];
    const prev   = national[national.length - 2];

    // Helper
    const ind = (key: string, raw: number | null, fmt?: (n: number) => string): Ind => {
      const b = B[key];
      const available = raw != null;
      const score = available ? Math.round(rescale(raw!, b)) : 50;
      return {
        key, bm: b, weight: b.weight, available, score,
        label: isBm ? b.label_bm : b.label_en,
        rawValue: available
          ? (fmt ? fmt(raw!) : `${raw!.toFixed(1)}${b.unit === "%" ? "%" : ""}`)
          : "N/A",
      };
    };

    // 1. Unemployment — lfs_month → u_rate
    const uRate: number | null = latest.u_rate ?? null;
    const i1 = ind("unemployment", uRate);

    // 2. Participation — lfs_month → p_rate
    const pRate: number | null = latest.p_rate ?? null;
    const i2 = ind("participation", pRate);

    // 3. Employment growth MoM
    const growthPct: number | null = (prev && latest.employed && prev.employed)
      ? ((latest.employed - prev.employed) / prev.employed) * 100 : null;
    const i3 = ind("growth", growthPct, (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);

    // 4. Youth unemployment — lfs_month_youth → u_rate_15_24
    let youthRate: number | null = null;
    if (data.youth?.length) {
      const ys = [...data.youth]
        .filter((d: any) => (d.u_rate_15_24 ?? d.u_rate) != null)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      const ly = ys[ys.length - 1];
      // u_rate_15_24 returns a count (~394k) not a rate due to 2020 Census rebasing field shift.
      // The actual 15-24 unemployment rate (~10.2%) is in unemployed_15_30.
      youthRate = (ly?.unemployed_15_30 != null && ly.unemployed_15_30 < 25) ? ly.unemployed_15_30 : null;
      // Sanity: Malaysian youth unemployment has never exceeded 25%. If value > 25, it's a count not a rate.
      if (youthRate != null && youthRate > 25) youthRate = null;
    }
    const i4 = ind("youth", youthRate);

    // 5. Skills mismatch — lfs_qtr_sru_sex → sru (CONFIRMED from underemployment chart)
    //    Filter to variable="rate" OR variable="rate_pct", then get overall/both row.
    let mismatchRate: number | null = null;
    if (data.mismatch?.length) {
      const ms = [...data.mismatch]
        .filter((d: any) => d.variable === "rate_pct" || d.variable === "rate")
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      if (ms.length) {
        const latestDate = ms[ms.length - 1].date;
        const atLatest = ms.filter((d: any) => d.date === latestDate);
        const overall = atLatest.find((d: any) => d.sex === "overall" || d.sex === "both");
        if (overall) {
          mismatchRate = overall.sru ?? null;
        } else {
          // Average male + female
          const rates = atLatest.map((d: any) => d.sru).filter((v: any) => v != null);
          if (rates.length) mismatchRate = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
        }
      }
    }
    const i5 = ind("mismatch", mismatchRate);

    // 6. Household income — hh_income → income_median
    let incomeMedian: number | null = null;
    if (data.wages?.length) {
      const ws = [...data.wages]
        .filter((d: any) => d.income_median != null)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      incomeMedian = ws[ws.length - 1]?.income_median ?? null;
    }
    const i6 = ind("income", incomeMedian, (n) => `RM${Math.round(n).toLocaleString()}`);

    // 7. Short-term unemployed — lfs_month_duration
    //    Try to derive % unemployed <3 months out of active unemployed.
    let shortTermPct: number | null = null;
    if (data.duration?.length) {
      const ds = [...data.duration]
        .filter((d: any) => d.date != null)
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      const ld = ds[ds.length - 1];
      if (ld) {
        // Try direct share fields first
        // Confirmed fields from API: unemployed_active_3mo = <3 months, unemployed_active = total active
const lt3    = ld.unemployed_active_3mo ?? null;
const active = ld.unemployed_active     ?? null;
if (lt3 != null && active) shortTermPct = (lt3 / active) * 100;
// Expected: 260 / 407.1 = 63.9%, which matches DOSM's reported 64%
      }
    }
    const i7 = ind("duration", shortTermPct);

    const inds: Ind[] = [i1, i2, i3, i4, i5, i6, i7];

    // Composite: re-weight over available indicators only so N/A doesn't pull toward 50
    const avail = inds.filter(i => i.available);
    const wsum  = avail.reduce((s, i) => s + i.weight, 0) || 1;
    const composite = clamp(Math.round(avail.reduce((s, i) => s + i.score * (i.weight / wsum), 0)));
    const coverage  = Math.round((avail.length / inds.length) * 100);

    let statusKey: string, statusColor: string, ringColor: string;
    if      (composite >= 81) { statusKey = "strong";     statusColor = "text-green-400";   ringColor = "#22c55e"; }
    else if (composite >= 61) { statusKey = "healthy";    statusColor = "text-emerald-400"; ringColor = "#10b981"; }
    else if (composite >= 41) { statusKey = "recovering"; statusColor = "text-yellow-400";  ringColor = "#eab308"; }
    else                      { statusKey = "weak";       statusColor = "text-red-400";     ringColor = "#ef4444"; }

    return { score: composite, statusKey, statusColor, ringColor, inds, coverage };
  }, [data, isBm]);

  if (loading || !result) {
    return <div className="rounded-2xl bg-card border border-border p-6 h-52 animate-pulse" />;
  }

  const { score, statusKey, statusColor, ringColor, inds, coverage } = result;

  // Labels inlined — no external keys needed
  const L = {
    title:      isBm ? "Indeks Kesihatan Buruh" : "Labour Health Index",
    outOf:      isBm ? "daripada 100"           : "out of 100",
    status:     isBm ? { strong: "Kukuh", healthy: "Sihat", recovering: "Sedang Pulih", weak: "Lemah" }
                     : { strong: "Strong", healthy: "Healthy", recovering: "Recovering", weak: "Weak" },
    desc:       isBm
      ? { strong: "Kadar pengangguran sangat rendah dan penyertaan tenaga kerja yang kukuh.", healthy: "Pasaran buruh yang kukuh dengan pertumbuhan pekerjaan yang stabil.", recovering: "Penambahbaikan beransur-ansur dalam petunjuk buruh utama.", weak: "Pasaran buruh menghadapi kadar pengangguran tinggi atau penyertaan yang rendah." }
      : { strong: "Exceptionally low unemployment and strong workforce participation.", healthy: "Solid labour market with steady employment growth.", recovering: "Gradual improvements across key labour indicators.", weak: "Labour market facing elevated unemployment or low participation." },
    legend:     isBm ? ["Lemah","Sedang Pulih","Sihat","Kukuh"] : ["Weak","Recovering","Healthy","Strong"],
    coverage:   isBm ? `Skor berdasarkan ${coverage}% petunjuk` : `Score based on ${coverage}% of indicators`,
    breakdown:  isBm ? "Pecahan Petunjuk" : "Indicator Breakdown",
    show:       isBm ? "Tunjuk" : "Show",
    hide:       isBm ? "Sembunyi" : "Hide",
    howCalc:    isBm ? "Bagaimana dikira?" : "How is this calculated?",
    methodTitle:isBm ? "Metodologi Indeks"  : "Index Methodology",
    close:      isBm ? "Tutup" : "Close",
    now:        isBm ? "Kini" : "Now",
    weight:     isBm ? "wajaran" : "weight",
    formulaLabel: isBm ? "Formula rescaling:" : "Rescaling formula:",
    intro:      isBm
      ? "Indeks ini menggabungkan 7 petunjuk buruh DOSM menggunakan purata berwajaran. Setiap petunjuk diskalakan kepada 0–100 berdasarkan julat sejarah Malaysia 2010–2026."
      : "This index combines 7 official DOSM labour indicators using a weighted average. Each is rescaled to 0–100 against Malaysia's historical range 2010–2026.",
    caveat:     isBm
      ? "Wajaran dan julat adalah pilihan editorial — bukan indeks rasmi DOSM atau ILO. Petunjuk bertanda 'est.' belum mempunyai suapan data dan dikecualikan daripada skor."
      : "Weights and bands are editorial choices — not an official DOSM or ILO index. Indicators marked 'est.' lack a live data feed and are excluded from the score.",
    est:        isBm ? "est." : "est.",
  };

  const statusLabel = L.status[statusKey as keyof typeof L.status];
  const statusDesc  = L.desc[statusKey as keyof typeof L.desc];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border shadow-sm relative overflow-visible bg-card"
      style={{ background: `radial-gradient(ellipse at 60% 0%, ${ringColor}12 0%, hsl(var(--card)) 70%)` }}
    >
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: ringColor }} />

      <div className="relative z-10 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{L.title}</span>
            <button onClick={() => setShowMethod(true)}
              className="text-muted-foreground hover:text-foreground transition-colors" aria-label={L.howCalc}>
              <Info className="h-4 w-4" />
            </button>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor} border-current/20 bg-current/5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {statusLabel}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4 ml-6">{statusDesc}</p>

        {/* Gauge */}
        <div className="flex justify-center">
          <div className="relative w-[240px] h-[148px]">
            <DashRing score={score} ringColor={ringColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-[18px] pointer-events-none">
              <motion.span className="text-6xl font-black leading-none tabular-nums" style={{ color: ringColor }}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200 }}>
                {score}
              </motion.span>
              <span className="text-xs text-muted-foreground font-medium mt-1">{L.outOf}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-2 mb-3">
          {(["#ef4444","#eab308","#10b981","#22c55e"] as const).map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-xs text-muted-foreground">{L.legend[i]}</span>
            </div>
          ))}
        </div>

        {/* Coverage note */}
        {coverage < 100 && (
          <p className="text-center text-[10px] text-muted-foreground mb-2">{L.coverage}</p>
        )}

        {/* Breakdown — toggle */}
        <div className="border-t border-border/50 pt-3 mt-1">
          <button
            onClick={() => setBreakdownOpen(o => !o)}
            className="flex items-center justify-between w-full cursor-pointer select-none"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {L.breakdown}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {breakdownOpen ? `${L.hide} ▴` : `${L.show} ▾`}
            </span>
          </button>
          {breakdownOpen && (
            <div className="mt-3 space-y-2.5">
              {inds.map((ind) => (
                <div key={ind.key} className="flex items-center gap-3">
                  <div className="w-44 flex-shrink-0">
                    <span className="text-[11px] text-foreground font-medium leading-tight block">{ind.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {ind.rawValue} · {Math.round(ind.weight * 100)}%
                      {!ind.available && <span className="text-orange-400"> · {L.est}</span>}
                    </span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ backgroundColor: scoreColor(ind.score), opacity: ind.available ? 1 : 0.45 }}
                      initial={{ width: 0 }} animate={{ width: `${ind.score}%` }}
                      transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }} />
                  </div>
                  <span className="text-[11px] font-bold w-7 text-right tabular-nums"
                    style={{ color: scoreColor(ind.score) }}>{ind.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Methodology modal ──────────────────────────────────────────────── */}
      {showMethod && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowMethod(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">{L.methodTitle}</h3>
              <button onClick={() => setShowMethod(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 text-[12px] text-muted-foreground leading-relaxed">
              <p>{L.intro}</p>
              <div className="p-3 rounded-lg bg-muted/40 font-mono text-[11px] text-foreground space-y-0.5">
                <p>{L.formulaLabel}</p>
                <p>score = (value − floor) ÷ (ceiling − floor) × 100</p>
                <p>index = Σ (score × weight)</p>
              </div>
              <div className="space-y-2">
                {inds.map((ind) => {
                  const dir = ind.bm.direction;
                  const lo = dir === "up" ? `${ind.bm.floor}${ind.bm.unit}=0`  : `${ind.bm.ceiling}${ind.bm.unit}=100`;
                  const hi = dir === "up" ? `${ind.bm.ceiling}${ind.bm.unit}=100` : `${ind.bm.floor}${ind.bm.unit}=0`;
                  return (
                    <div key={ind.key} className="p-2.5 rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-foreground">{ind.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {Math.round(ind.weight * 100)}% {L.weight}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span>
                          {L.now}: <span className="text-foreground font-semibold">{ind.rawValue}</span>
                          {" → "}
                          <span style={{ color: scoreColor(ind.score) }} className="font-bold">{ind.score}/100</span>
                          {!ind.available && <span className="text-orange-400 ml-1">({L.est})</span>}
                        </span>
                        <span className="font-mono text-muted-foreground/70">{lo} · {hi}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 leading-snug">{ind.bm.basis}</p>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-[11px] text-foreground">{L.caveat}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default LabourHealthScore;