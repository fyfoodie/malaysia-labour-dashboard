import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Clock, Newspaper } from "lucide-react";

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
  positive: { dot: "bg-green-500",  text: "text-green-600 dark:text-green-400", badge: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", border: "border-green-500/20",  label: "Positive" },
  negative: { dot: "bg-red-500",    text: "text-red-600 dark:text-red-400",     badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",         border: "border-red-500/20",    label: "Negative" },
  neutral:  { dot: "bg-blue-400",   text: "text-blue-600 dark:text-blue-400",   badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",       border: "border-blue-500/20",   label: "Neutral"  },
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}d ago`;
    if (h >= 1)  return `${h}h ago`;
    if (m >= 1)  return `${m}m ago`;
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

const DataInsightCards = () => {
  const [articles, setArticles]       = useState<Article[]>([]);
  const [loading, setLoading]         = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [error, setError]             = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/.netlify/functions/newsdata-proxy");
      const text = await res.text();
      console.log("News proxy response:", text.slice(0, 500));
      if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
      const json = JSON.parse(text);
      const items: Article[] = json.articles ?? [];
      if (!items.length) throw new Error("empty");
      setArticles(items);
      setLastUpdated(new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit", hour12: true }));
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Market News</span>
          {lastUpdated && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {lastUpdated}
            </span>
          )}
        </div>
        <button onClick={fetchNews} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all disabled:opacity-40">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">

        {/* Skeleton */}
        {loading && !articles.length && (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
          </motion.div>
        )}

        {/* Error */}
        {!loading && error && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl bg-card border border-border p-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">News feed unavailable.</p>
            <button onClick={fetchNews}
              className="text-xs text-primary underline hover:no-underline">
              Try again
            </button>
          </motion.div>
        )}

        {/* Articles */}
        {!loading && !error && articles.length > 0 && (
          <motion.div key="articles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {articles.map((item, i) => {
              const s = SENTIMENT[item.sentiment] ?? SENTIMENT.neutral;
              return (
                <motion.a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`rounded-2xl bg-card border ${s.border} p-5 flex flex-col gap-2.5 hover:shadow-md transition-all duration-300 cursor-pointer group`}
                >
                  {/* Top: category + time */}
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

                  {/* Headline */}
                  <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-3 flex-1">
                    {item.title}
                  </p>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Bottom: sentiment + source pill */}
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
            })}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default DataInsightCards;
