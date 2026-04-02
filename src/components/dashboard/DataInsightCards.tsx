import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ChevronRight, ChevronLeft, Newspaper } from "lucide-react";

interface Article {
  title: string;
  description: string;
  url: string;
  pubDate: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
  category: string;
}

const SENTIMENT = {
  positive: {
    dot: "bg-green-500", text: "text-green-600 dark:text-green-400",
    badge: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    border: "border-green-500/20", label: "Positive",
  },
  negative: {
    dot: "bg-red-500", text: "text-red-600 dark:text-red-400",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    border: "border-red-500/20", label: "Negative",
  },
  neutral: {
    dot: "bg-blue-400", text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    border: "border-blue-500/20", label: "Neutral",
  },
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}d ago`;
    if (h >= 1) return `${h}h ago`;
    if (m >= 1) return `${m}m ago`;
    return "just now";
  } catch { return ""; }
}

const CardSkeleton = () => (
  <div className="rounded-2xl bg-card border border-border p-5 space-y-3 h-52 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-3 w-20 rounded-full bg-muted" />
      <div className="h-3 w-10 rounded-full bg-muted" />
    </div>
    <div className="space-y-2 pt-1">
      <div className="h-4 w-full rounded-full bg-muted" />
      <div className="h-4 w-5/6 rounded-full bg-muted" />
      <div className="h-4 w-4/6 rounded-full bg-muted" />
    </div>
    <div className="space-y-1.5 pt-1">
      <div className="h-3 w-full rounded-full bg-muted" />
      <div className="h-3 w-4/5 rounded-full bg-muted" />
    </div>
    <div className="flex items-center justify-between pt-2">
      <div className="h-4 w-16 rounded-full bg-muted" />
      <div className="h-6 w-14 rounded-full bg-muted" />
    </div>
  </div>
);

const NewsCard = ({ item, index }: { item: Article; index: number }) => {
  const s = SENTIMENT[item.sentiment] ?? SENTIMENT.neutral;
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={`rounded-2xl bg-card border ${s.border} p-5 flex flex-col gap-2.5 hover:shadow-md transition-all duration-300 cursor-pointer group`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold tracking-wider uppercase ${s.text}`}>
          {item.category}
        </span>
        {item.pubDate && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {timeAgo(item.pubDate)}
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-3 flex-1">
        {item.title}
      </p>

      {item.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
          <span className={`text-[10px] font-medium ${s.text}`}>{s.label}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${s.badge} flex-shrink-0`}>
          {item.source}
        </span>
      </div>
    </motion.a>
  );
};

const DataInsightCards = () => {
  const [articles, setArticles]   = useState<Article[]>([]);
  const [page, setPage]           = useState(0); 
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(false);
    setPage(0);
    try {
      const res  = await fetch("/.netlify/functions/newsdata-proxy");
      const text = await res.text();
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const json = JSON.parse(text);
      const items = json.articles ?? [];

      if (!items.length) throw new Error("empty");
      setArticles(items as Article[]);
    } catch (e) {
      console.error("Failed to fetch news:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const batch1 = articles.slice(0, 4);
  const batch2 = articles.slice(4, 8);
  const hasBatch2 = batch2.length > 0;
  const current  = page === 0 ? batch1 : batch2;

  const goNext = () => { setDirection("next"); setPage(1); };
  const goPrev = () => { setDirection("prev"); setPage(0); };

  const slideVariants = {
    enterNext:  { x: "100%", opacity: 0 },
    enterPrev:  { x: "-100%", opacity: 0 },
    center:     { x: 0, opacity: 1 },
    exitNext:   { x: "-100%", opacity: 0 },
    exitPrev:   { x: "100%", opacity: 0 },
  };

  return (
    <div className="space-y-3">
      {/* Header Wrapper: Keeps left and right side properly spaced */}
      <div className="flex items-center justify-between">
        
        {/* Left Side: Restored Icon and Bold Title */}
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Market News</span>
          
          {articles.length > 0 && (
            <span className="text-[11px] text-muted-foreground ml-1">
              · Showing {page === 0 ? `1–${Math.min(4, articles.length)}` : `5–${articles.length}`} of {articles.length}
            </span>
          )}
        </div>

        {/* Right Side: Buttons */}
        <div className="flex items-center gap-2">
          {hasBatch2 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                disabled={page === 0}
                className="p-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                onClick={goNext}
                disabled={page === 1}
                className="p-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
          <button
            onClick={fetchNews}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Page dots */}
      {hasBatch2 && !loading && (
        <div className="flex items-center gap-1.5">
          {[0, 1].map(i => (
            <button
              key={i}
              onClick={() => { setDirection(i > page ? "next" : "prev"); setPage(i); }}
              className={`rounded-full transition-all duration-300 ${
                page === i ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {loading && (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
            </motion.div>
          )}

          {!loading && error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl bg-card border border-border p-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">News feed unavailable.</p>
              <button onClick={fetchNews} className="text-xs text-primary underline">Try again</button>
            </motion.div>
          )}

          {!loading && !error && current.length > 0 && (
            <motion.div
              key={`page-${page}`}
              custom={direction}
              variants={slideVariants}
              initial={direction === "next" ? "enterNext" : "enterPrev"}
              animate="center"
              exit={direction === "next" ? "exitNext" : "exitPrev"}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {current.map((item, i) => (
                <NewsCard key={`${page}-${i}`} item={item} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DataInsightCards;