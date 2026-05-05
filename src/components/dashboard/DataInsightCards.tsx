import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, ChevronLeft, ChevronRight, ArrowUpRight, Rss,
} from "lucide-react";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types — matches newsdata-proxy.cjs response
// ─────────────────────────────────────────────────────────────────────────────
interface NewsArticle {
  title:       string;
  description: string;
  url:         string;
  pubDate:     string;
  source:      string;
  sentiment:   "positive" | "negative" | "neutral";
  topic:       string;
  topicEmoji:  string;
  topicColor:  string;
  bm25Score:   number;
  lang:        "en" | "bm";
}

// ─────────────────────────────────────────────────────────────────────────────
// Source → accent colour (left bar + outlet badge)
// ─────────────────────────────────────────────────────────────────────────────
const SOURCE_COLOR: Record<string, string> = {
  "NST":          "#1a5276",
  "The Star":     "#e74c3c",
  "FMT":          "#2980b9",
  "Malay Mail":   "#c0392b",
  "Bernama":      "#0f766e",
  "Awani":        "#7c3aed",
  "The Edge":     "#92400e",
  "TMR":          "#117a65",
  "Mkini":        "#d97706",
  "TMI":          "#0891b2",
  "Sun Daily":    "#475569",
  "Reuters":      "#b45309",
  "Bloomberg":    "#1d4ed8",
  "CNA":          "#0891b2",
  "BizToday":     "#6d28d9",
  "Utusan":       "#b91c1c",
  "H. Metro":     "#9d174d",
  "Berita Harian":"#065f46",
  "Sinar Harian": "#7e22ce",
  "Astro Utusan": "#1e3a8a",
};
function sc(name: string) { return SOURCE_COLOR[name] ?? "#6b7280"; }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const CARDS_PER_PAGE = 4;
const FETCH_DELAY_MS = 800;

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

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonCard
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 animate-pulse h-[200px]">
      <div className="flex justify-between">
        <div className="h-2.5 w-20 rounded-sm bg-muted" />
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
// NewsCard — editorial design: left accent bar, topic pill, sentiment, source
// ─────────────────────────────────────────────────────────────────────────────
function NewsCard({
  article,
  index,
  sentimentLabel,
}: {
  article: NewsArticle;
  index: number;
  sentimentLabel: (s: string) => string;
}) {
  const srcColor = sc(article.source);

  // Sentiment dot colours
  const sentDot: Record<string, string> = {
    positive: "bg-emerald-500",
    negative: "bg-red-500",
    neutral:  "bg-sky-400",
  };
  const sentText: Record<string, string> = {
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-red-500 dark:text-red-400",
    neutral:  "text-sky-500 dark:text-sky-400",
  };

  return (
    <motion.a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.06, duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="news-card group relative flex flex-col rounded-xl overflow-hidden cursor-pointer"
      style={{ "--sc": srcColor } as React.CSSProperties}
    >
      {/* Left source colour bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl z-10"
        style={{ background: srcColor }}
      />

      <div className="flex flex-col flex-1 pl-4 pr-4 pt-3.5 pb-3.5 gap-2.5 ml-[3px]">

        {/* Topic pill + time */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
            style={{ background: article.topicColor + "1a", color: article.topicColor }}
          >
            <span className="text-[10px]">{article.topicEmoji}</span>
            {article.topic}
          </span>
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

        {/* Sentiment + source + BM25 (dev) + arrow */}
        <div className="flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1 text-[11px] font-medium ${sentText[article.sentiment] ?? sentText.neutral}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sentDot[article.sentiment] ?? sentDot.neutral}`} />
            {sentimentLabel(article.sentiment)}
          </div>
          <div className="flex items-center gap-1.5">
            {import.meta.env.DEV && (
              <span className="text-[9px] text-muted-foreground/30">{article.bm25Score}</span>
            )}
            <span
              className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
              style={{ background: srcColor + "14", color: srcColor }}
            >
              {article.source}
            </span>
            <ArrowUpRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
          </div>
        </div>
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
          box-shadow: 0 0 0 1.5px var(--sc, hsl(var(--border))), 0 4px 16px rgba(0,0,0,0.08);
        }
      `}</style>
    </motion.a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
const DataInsightCards = () => {
  const { t, lang } = useLanguage();
  useLabourData();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page,     setPage]     = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const fetchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLang = useRef(lang);

  // Sentiment label helper — uses i18n
  const sentimentLabel = useCallback((s: string) => {
    if (s === "positive") return t("news.positive");
    if (s === "negative") return t("news.negative");
    return t("news.neutral");
  }, [t]);

  const fetchNews = useCallback(async (language: string) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/.netlify/functions/newsdata-proxy?lang=${language}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arts: NewsArticle[] = data.articles ?? [];
      console.log(
        `📰 [${language}] ${arts.length} articles:`,
        arts.map(a => `[${a.source}][${a.topic}] ${a.title.slice(0, 45)}`)
      );
      setArticles(arts);
      setPage(0);
    } catch (err) {
      console.error("📰 error:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial deferred fetch
  useEffect(() => {
    fetchTimer.current = setTimeout(() => fetchNews(lang), FETCH_DELAY_MS);
    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when language toggles
  useEffect(() => {
    if (lang === currentLang.current) return;
    currentLang.current = lang;
    setArticles([]);
    setPage(0);
    fetchNews(lang);
  }, [lang, fetchNews]);

  const totalPages   = Math.ceil(articles.length / CARDS_PER_PAGE);
  const pageArticles = articles.slice(
    page * CARDS_PER_PAGE,
    page * CARDS_PER_PAGE + CARDS_PER_PAGE
  );

  const sectionTitle   = t("news.title");
  const sectionSubtitle = t("news.subtitle");

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
              {sectionSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* BM25 badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-600 dark:text-violet-400 tracking-wide">
            <Rss className="h-2.5 w-2.5" />
            {t("news.bm25")}
          </span>

          {/* Count */}
          {articles.length > 0 && !loading && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">
              {page * CARDS_PER_PAGE + 1}–{Math.min((page + 1) * CARDS_PER_PAGE, articles.length)}
              {" "}/ {articles.length}
            </span>
          )}

          {/* Pagination */}
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

          {/* Refresh */}
          <button
            onClick={() => fetchNews(lang)}
            disabled={loading}
            title="Refresh"
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── GRID ── */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-dashed border-border">
          <Rss className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground font-medium">{t("news.error")}</p>
          <p className="text-xs text-muted-foreground/50 font-mono max-w-sm">{error}</p>
          <button
            onClick={() => fetchNews(lang)}
            className="mt-1 text-xs px-4 py-2 rounded-lg border border-border hover:bg-muted/60 transition-all font-medium"
          >
            {t("news.retry")}
          </button>
        </div>
      ) : loading && articles.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : pageArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">{t("news.empty")}</p>
          <button
            onClick={() => fetchNews(lang)}
            className="text-xs px-4 py-2 rounded-lg border border-border hover:bg-muted/60 transition-all"
          >
            {t("news.retry")}
          </button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${page}-${lang}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {pageArticles.map((article, i) => (
              <NewsCard
                key={`${article.url}-${i}`}
                article={article}
                index={i}
                sentimentLabel={sentimentLabel}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── FOOTER ── */}
      {articles.length > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground/40 tracking-wide">
            {t("news.footer")}
          </p>
          <div className="group relative">
            <button className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 underline underline-offset-2 transition-colors">
              {t("news.howLink")}
            </button>
            <div className="absolute bottom-6 right-0 w-72 bg-card border border-border rounded-xl p-3 shadow-xl text-xs text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 space-y-1.5">
              <p className="font-semibold text-foreground text-[11px]">{t("news.howTitle")}</p>
              <p>{t("news.howP1en")}</p>
              <p>{t("news.howP2")}</p>
              <p>{t("news.howP3")}</p>
              <p className="text-muted-foreground/50 text-[10px]">{t("news.howFooter")}</p>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
};

export default DataInsightCards;