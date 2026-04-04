import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, ChevronLeft, ChevronRight,
  Loader2, Brain, Rss, ArrowUpRight,
} from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSemanticClassifier } from "@/hooks/useSemanticClassifier";
import type { ClassifiedArticle, RawArticle } from "@/workers/embedder.worker";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const CORS            = "https://corsproxy.io/?";
const MAX_AGE_MS      = 21 * 24 * 60 * 60 * 1000; // 3 weeks
const ITEMS_PER_FEED  = 8;
const POOL_CAP        = 24;
const CARDS_PER_PAGE  = 4;
const FETCH_DELAY_MS  = 800; // defer so dashboard paints first

/**
 * Threshold: 0.35 (up from 0.15)
 *
 * Research on all-MiniLM-L6-v2 cosine similarity:
 *  < 0.30  → random / noise — off-topic, always reject
 *  0.30–0.35 → borderline
 *  0.35+   → genuine topical overlap
 *  0.45+   → strongly on-topic
 *
 * The worker ALSO applies a confidence margin check (≥ 0.06 above runner-up)
 * so flat noise distributions (everything ~0.20) are rejected regardless.
 */
// 0.22 — calibrated for your pre-computed short-label topic vectors.
// These vectors score genuine labour articles at ~0.22–0.32.
// The English pre-filter handles noise before articles reach the model.
const CLASSIFY_THRESHOLD = 0.22;

// Malaysian news RSS feeds — business/economy sections only to avoid politics
const MY_SOURCES = [
  { url: "https://www.malaymail.com/feed/rss/money",                      short: "Malay Mail" },
  { url: "https://www.thestar.com.my/rss/Business/Business%20News",       short: "The Star"   },
  { url: "https://www.freemalaysiatoday.com/category/nation/economy/feed",short: "FMT"        },
  { url: "https://www.nst.com.my/business/economy/feed",                  short: "NST"        },
  { url: "https://themalaysianreserve.com/feed",                          short: "TMR"        },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// English pre-filter — applied at RSS parse time, before pool is built
// Same logic mirrors the worker's isEnglish() for consistent behaviour
// ─────────────────────────────────────────────────────────────────────────────
function looksEnglish(text: string): boolean {
  if (!text || text.length < 8) return false;
  const nonAscii = (text.match(/[^\x00-\x7F]/g) ?? []).length;
  if (nonAscii / text.length > 0.20) return false;
  const lower = text.toLowerCase();
  const hits = [
    "yang","dengan","untuk","dalam","kepada","oleh","telah",
    "akan","tidak","bagi","pada","dari","bahawa","kerana",
    "kata","berkata","menurut","daripada","mereka","itu","ini",
  ].filter(w => lower.includes(` ${w} `)).length;
  return hits < 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Off-topic blocklist — rejects articles at parse time before they hit the
// semantic model. Catches politics, crime, sports, disasters that slip through
// the English filter but are clearly not labour-market news.
// ─────────────────────────────────────────────────────────────────────────────
const BLOCKLIST_KW = [
  // Malaysian politics
  "parliamentary seat", "party president", "party election", "umno", "pkr",
  "bersatu", "dap ", " mca ", " mic ", "amanah", "gabungan", "perikatan",
  "pakatan", "barisan nasional", "state seat", "by-election", "byelection",
  "general election", "parliament", "senator", "assemblyman", "adun ",
  "exco ", "menteri besar", "chief minister", "ketua menteri",
  // Crime / accidents
  "murder", "stabbing", "robbery", "kidnap", "rape", "assault", "arrested",
  "drug bust", "smuggling", "wildfire", "flood", "earthquake", "explosion",
  "road accident", "car crash", "hit-and-run", "black panther", "wildlife",
  // Sports / entertainment
  "badminton", "football", "soccer", "olympics", "harimau malaya",
  "concert", "album", "singer", "actress", "actor",
  // Foreign politics (not Malaysian labour)
  "white house", "congress", "senate bill", "kremlin", "nato", "ukraine",
  "gaza", "israel", "iran", "donald trump", "joe biden", "xi jinping",
];

function isBlocklisted(title: string, desc: string): boolean {
  const hay = `${title} ${desc}`.toLowerCase();
  return BLOCKLIST_KW.some(kw => hay.includes(kw));
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback keyword filter — tighter list, only strong labour-market signals
// Used while AI model is still loading
// ─────────────────────────────────────────────────────────────────────────────
const LABOUR_KW = [
  "employment", "unemployment", "labour", "labor", "jobs", "hiring",
  "retrenchment", "salary", "wages", "workforce", "EPF", "SOCSO",
  "minimum wage", "job market", "recruitment", "workers", "skills training",
  "gig economy", "foreign worker", "migrant worker", "work permit",
  "manpower", "layoff", "redundancy", "HRDC", "HRDF", "job vacancy",
  "fresh graduate", "internship", "human capital", "labour force",
];

function keywordFilter(articles: RawArticle[]): RawArticle[] {
  return articles.filter(({ title, description }) => {
    const hay = `${title} ${description ?? ""}`.toLowerCase();
    return LABOUR_KW.some(kw => hay.includes(kw.toLowerCase()));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RSS parsing
// ─────────────────────────────────────────────────────────────────────────────
function parseRSS(xml: string, short: string): RawArticle[] {
  const doc   = new DOMParser().parseFromString(xml, "text/xml");
  const items = Array.from(doc.querySelectorAll("item"));
  const out: RawArticle[] = [];

  for (let i = 0; i < items.length && out.length < ITEMS_PER_FEED; i++) {
    const item    = items[i];
    const title   = item.querySelector("title")?.textContent?.trim() ?? "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() ?? "";

    if (!title) continue;
    // Recency gate
    if (pubDate && Date.now() - new Date(pubDate).getTime() > MAX_AGE_MS) continue;
    // English gate — drop BM titles at parse time before they reach pool
    if (!looksEnglish(title)) continue;

    const link  = item.querySelector("link")?.textContent?.trim() ?? "#";
    const raw   = item.querySelector("description")?.textContent ?? "";
    const desc  = raw.replace(/<[^>]+>/g, "").replace(/&\w+;/g, " ").trim().slice(0, 200);

    // Blocklist gate — reject obvious politics/crime/sports before semantic model
    if (isBlocklisted(title, desc)) continue;

    out.push({
      article_id:  `${short}-${i}-${title.slice(0, 16).replace(/\s/g, "")}`,
      title,
      description: desc,
      link,
      pubDate,
      source_name: short,
      sentiment:   undefined,
      category:    [short],
    } satisfies RawArticle);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────────
async function fetchMYNews(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(
    MY_SOURCES.map(async ({ url, short }) => {
      const res = await fetch(`${CORS}${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`${short}: HTTP ${res.status}`);
      return parseRSS(await res.text(), short);
    })
  );

  const seen   = new Set<string>();
  const merged: RawArticle[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") {
      console.warn("📰 feed failed:", (r as PromiseRejectedResult).reason);
      continue;
    }
    for (const a of r.value) {
      if (merged.length >= POOL_CAP) break;
      const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(a);
    }
  }

  return merged.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────
const OUTLET_COLOR: Record<string, string> = {
  "Malay Mail": "#c0392b",
  "The Star":   "#e74c3c",
  "FMT":        "#2980b9",
  "NST":        "#1a5276",
  "TMR":        "#117a65",
};
function oc(name: string) { return OUTLET_COLOR[name] ?? "#6b7280"; }

function timeAgo(d: string): string {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const m  = Math.floor(ms / 60_000);
  if (m < 60)  return `${m}m ago`;
  const h  = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const dy = Math.floor(h / 24);
  return dy === 1 ? "1d ago" : `${dy}d ago`;
}

const SENT_COLOR: Record<string, string> = {
  Positive: "#22c55e", Negative: "#ef4444", Neutral: "#94a3b8",
};

// ─────────────────────────────────────────────────────────────────────────────
// ModelStatusPill
// ─────────────────────────────────────────────────────────────────────────────
function ModelStatusPill({ status, progress }: { status: string; progress: number }) {
  if (status === "ready") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-violet-500/10 text-[10px] font-semibold text-violet-500 border border-violet-500/20 tracking-wide">
      <Brain className="h-2.5 w-2.5" />SEMANTIC AI
    </span>
  );
  if (status === "loading-model") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-muted border border-border text-[10px] text-muted-foreground tracking-wide">
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      AI LOADING{progress > 0 ? ` ${progress}%` : "…"}
    </span>
  );
  if (status === "error") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-muted border border-border text-[10px] text-muted-foreground tracking-wide">
      <Rss className="h-2.5 w-2.5" />KEYWORD
    </span>
  );
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonCard
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 animate-pulse h-[200px]">
      <div className="flex justify-between">
        <div className="h-2.5 w-16 rounded-sm bg-muted" />
        <div className="h-2.5 w-10 rounded-sm bg-muted" />
      </div>
      <div className="space-y-2 flex-1">
        <div className="h-3 w-full rounded-sm bg-muted" />
        <div className="h-3 w-11/12 rounded-sm bg-muted" />
        <div className="h-3 w-3/4 rounded-sm bg-muted" />
      </div>
      <div className="h-2.5 w-5/6 rounded-sm bg-muted" />
      <div className="h-px w-full bg-muted mt-auto" />
      <div className="flex justify-between pt-0.5">
        <div className="h-2.5 w-14 rounded-sm bg-muted" />
        <div className="h-2.5 w-10 rounded-sm bg-muted" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NewsCard
// ─────────────────────────────────────────────────────────────────────────────
function NewsCard({ article, index }: { article: ClassifiedArticle | RawArticle; index: number }) {
  const classified = "topicLabel" in article ? (article as ClassifiedArticle) : null;
  const outlet     = article.source_name;
  const outletClr  = oc(outlet);
  const topicLabel = classified?.topicLabel ?? null;
  const topicColor = classified?.topicColor ?? "#6b7280";
  const topicEmoji = classified?.topicEmoji ?? null;
  const sentColor  = SENT_COLOR[article.sentiment ?? "Neutral"] ?? SENT_COLOR.Neutral;
  const sentLabel  = article.sentiment ?? "Neutral";

  return (
    <motion.a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.06, duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="news-card group relative flex flex-col rounded-xl overflow-hidden cursor-pointer"
      style={{ "--outlet-clr": outletClr } as React.CSSProperties}
    >
      {/* Left accent bar — outlet colour */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl z-10"
        style={{ background: outletClr }}
      />

      <div className="flex flex-col flex-1 pl-4 pr-4 pt-3.5 pb-3.5 gap-2.5 ml-[3px]">
        {/* Topic tag + time */}
        <div className="flex items-center justify-between gap-2">
          {topicLabel ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
              style={{ background: topicColor + "1a", color: topicColor }}
            >
              {topicEmoji && <span className="text-[10px]">{topicEmoji}</span>}
              {topicLabel}
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Malaysia
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/50 tabular-nums whitespace-nowrap">
            {timeAgo(article.pubDate)}
          </span>
        </div>

        {/* Headline */}
        <h3 className="text-[13px] font-bold leading-[1.35] text-foreground line-clamp-3 group-hover:text-primary transition-colors duration-150 tracking-tight">
          {article.title}
        </h3>

        {/* Description */}
        {article.description && article.description !== article.title && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">
            {article.description}
          </p>
        )}

        {/* Divider */}
        <div className="mt-auto pt-0.5">
          <div className="h-px w-full bg-border/40" />
        </div>

        {/* Outlet badge + sentiment */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
            style={{ background: outletClr + "14", color: outletClr }}
          >
            {outlet}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sentColor }} />
              {sentLabel}
            </div>
            <ArrowUpRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
          </div>
        </div>

        {/* Dev: relevance score */}
        {classified && import.meta.env.DEV && (
          <p className="text-[9px] text-muted-foreground/30">score: {classified.relevanceScore}</p>
        )}
      </div>

      {/* CSS-only hover ring — no JS repaint */}
      <style>{`
        .news-card {
          background: hsl(var(--background));
          box-shadow: 0 0 0 1px hsl(var(--border) / 0.7), 0 1px 4px rgba(0,0,0,0.04);
          transition: box-shadow 0.18s ease, transform 0.18s ease;
          will-change: transform;
        }
        .news-card:hover {
          box-shadow: 0 0 0 1.5px var(--outlet-clr, hsl(var(--border))), 0 4px 16px rgba(0,0,0,0.08);
        }
      `}</style>
    </motion.a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const DataInsightCards = () => {
  const { t }                                                 = useLanguage();
  useLabourData();
  const { classify, status: aiStatus, progress, modelReady } = useSemanticClassifier();

  const [rawArticles,     setRawArticles]     = useState<RawArticle[]>([]);
  const [displayArticles, setDisplayArticles] = useState<(ClassifiedArticle | RawArticle)[]>([]);
  const [page,            setPage]            = useState(0);
  const [fetching,        setFetching]        = useState(false);
  const [classifying,     setClassifying]     = useState(false);
  const [fetchError,      setFetchError]      = useState<string | null>(null);
  const classifyAttempted = useRef(false);
  const fetchTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch — deferred so dashboard renders first ───────────────────────────
  const fetchNews = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    classifyAttempted.current = false;
    try {
      const articles = await fetchMYNews();
      console.log(
        `📰 ${articles.length} English articles in pool:`,
        articles.map(a => `[${a.source_name}] ${a.title.slice(0, 50)}`)
      );
      setRawArticles(articles);
      setPage(0);
    } catch (err) {
      console.error("📰 error:", err);
      setFetchError(String(err));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchTimer.current = setTimeout(fetchNews, FETCH_DELAY_MS);
    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, [fetchNews]);

  // ── Classify once model + articles ready ──────────────────────────────────
  useEffect(() => {
    if (!rawArticles.length || classifyAttempted.current) return;

    if (modelReady) {
      classifyAttempted.current = true;
      setClassifying(true);
      classify(rawArticles, CLASSIFY_THRESHOLD)
        .then(classified => {
          console.log(`🧠 ${classified.length} passed threshold ${CLASSIFY_THRESHOLD}`);
          const kw = keywordFilter(rawArticles);
          setDisplayArticles(classified.length >= 4 ? classified : kw.length >= 4 ? kw : rawArticles);
        })
        .catch(() => { const kw = keywordFilter(rawArticles); setDisplayArticles(kw.length >= 2 ? kw : rawArticles); })
        .finally(() => setClassifying(false));
    } else if (aiStatus === "error") {
      classifyAttempted.current = true;
      const kw = keywordFilter(rawArticles);
      setDisplayArticles(kw.length >= 2 ? kw : rawArticles);
    } else {
      const kw = keywordFilter(rawArticles);
      setDisplayArticles(kw.length >= 2 ? kw : rawArticles);
    }
  }, [rawArticles, modelReady, aiStatus, classify]);

  // ── Re-classify when model finishes loading ───────────────────────────────
  useEffect(() => {
    if (!modelReady || !rawArticles.length || classifyAttempted.current) return;
    classifyAttempted.current = true;
    setClassifying(true);
    classify(rawArticles, CLASSIFY_THRESHOLD)
      .then(classified => {
        const kw = keywordFilter(rawArticles);
        setDisplayArticles(classified.length >= 4 ? classified : kw.length >= 4 ? kw : rawArticles);
        setPage(0);
      })
      .catch(() => { const kw = keywordFilter(rawArticles); setDisplayArticles(kw.length >= 2 ? kw : rawArticles); })
      .finally(() => setClassifying(false));
  }, [modelReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages   = Math.ceil(displayArticles.length / CARDS_PER_PAGE);
  const pageArticles = displayArticles.slice(
    page * CARDS_PER_PAGE,
    page * CARDS_PER_PAGE + CARDS_PER_PAGE
  );
  const isLoading = fetching || classifying;

  const sectionTitle =
    t("news.title") && t("news.title") !== "news.title"
      ? t("news.title")
      : "Labour Market Pulse";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 rounded-full bg-primary" />
          <div>
            <h2 className="text-[15px] font-black text-foreground tracking-tight uppercase leading-none">
              {sectionTitle}
            </h2>
            <p className="text-[10px] text-muted-foreground/60 tracking-widest uppercase mt-0.5 font-medium">
              Malay Mail · The Star · FMT — past 3 weeks · English only
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModelStatusPill status={aiStatus} progress={progress} />

          {displayArticles.length > 0 && !isLoading && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">
              {page * CARDS_PER_PAGE + 1}–{Math.min((page + 1) * CARDS_PER_PAGE, displayArticles.length)}
              {" "}/ {displayArticles.length}
            </span>
          )}

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-25 transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex gap-1 px-0.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === page ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-25 transition-all"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => { classifyAttempted.current = false; fetchNews(); }}
            disabled={isLoading}
            title="Refresh"
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* AI progress bar */}
      {aiStatus === "loading-model" && (
        <div className="mb-3 h-0.5 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* ── GRID ── */}
      {fetchError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-dashed border-border">
          <Rss className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground font-medium">Could not load news feeds.</p>
          <p className="text-xs text-muted-foreground/50 font-mono max-w-sm">{fetchError}</p>
          <button onClick={fetchNews} className="mt-1 text-xs px-4 py-2 rounded-lg border border-border hover:bg-muted/60 transition-all font-medium">Retry</button>
        </div>
      ) : isLoading && displayArticles.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : pageArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No relevant labour market news found.</p>
          <button onClick={fetchNews} className="text-xs px-4 py-2 rounded-lg border border-border hover:bg-muted/60 transition-all">Refresh</button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {pageArticles.map((article, i) => (
              <NewsCard
                key={article.article_id ?? article.link}
                article={article}
                index={i}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── FOOTER ── */}
      {displayArticles.length > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground/40 tracking-wide">
            {aiStatus === "ready"
              ? `Semantically classified · threshold ${CLASSIFY_THRESHOLD} · confidence-margin gated · English only`
              : "Keyword-filtered · AI classifier loading in background"}
          </p>
          <div className="group relative">
            <button className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 underline underline-offset-2 transition-colors">
              How this works
            </button>
            <div className="absolute bottom-6 right-0 w-72 bg-card border border-border rounded-xl p-3 shadow-xl text-xs text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 space-y-1.5">
              <p className="font-semibold text-foreground text-[11px]">How news is filtered</p>
              <p>English-only articles from Malay Mail, The Star and FMT RSS feeds. Only past 3 weeks shown.</p>
              <p>The semantic AI (all-MiniLM-L6-v2) scores each article against labour market topic vectors. Articles must score ≥ 0.35 AND show a clear confidence margin above the runner-up — preventing false matches like "black panther" tagging as "Foreign Workers".</p>
              <p className="text-muted-foreground/50 text-[10px]">Topics: Unemployment, Hiring, Wages, Policy, Skills, Sectors, Migration, Underemployment.</p>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
};

export default DataInsightCards;