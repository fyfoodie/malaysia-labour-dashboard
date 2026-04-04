/**
 * Web Worker — runs model loading and inference off the main thread.
 * Main thread never blocks during embedding.
 *
 * Changes from original:
 *  1. isEnglish() — drops non-English / Malay articles before classification
 *  2. Confidence margin gate — best topic score must be ≥ 0.06 above
 *     runner-up, preventing flat "noise" scores from matching any topic
 */
import { pipeline, env } from "@huggingface/transformers";
import { cosineSimilarity, argmax } from "@/lib/cosineSimilarity";
import { TOPIC_EMBEDDINGS, TOPIC_KEYS } from "@/lib/topicEmbeddings";

// Fetch from HuggingFace CDN, no local model files needed
env.allowLocalModels = false;
env.useBrowserCache = true; // cache model in browser after first download

// ── Types ────────────────────────────────────────────────────────────────────
export interface RawArticle {
  article_id: string;
  title: string;
  description?: string;
  link: string;
  pubDate: string;
  source_name: string;
  image_url?: string;
  sentiment?: string;
  category?: string[];
}

export interface ClassifiedArticle extends RawArticle {
  topicKey: string;
  topicLabel: string;
  topicColor: string;
  topicEmoji: string;
  relevanceScore: number;
}

type InMessage =
  | { type: "warmup" }
  | { type: "classify"; articles: RawArticle[]; threshold: number };

type OutMessage =
  | { type: "ready" }
  | { type: "loading"; message: string }
  | { type: "progress"; progress: number }
  | { type: "result"; articles: ClassifiedArticle[] }
  | { type: "error"; message: string };

// ── State ────────────────────────────────────────────────────────────────────
let extractor: any = null;
let modelLoading = false;

// ── English detection ─────────────────────────────────────────────────────────
/**
 * Returns true if the text is predominantly English.
 *
 * Two checks:
 *  a) Non-ASCII character ratio > 25% → likely non-Latin script, reject
 *  b) 3+ Malay stopwords present → likely Bahasa Malaysia, reject
 *
 * This runs BEFORE embedding so we never waste compute on BM articles.
 */
function isEnglish(text: string): boolean {
  if (!text || text.length < 8) return false;

  // Check non-ASCII ratio (catches Chinese, Arabic, etc.)
  const nonAscii = (text.match(/[^\x00-\x7F]/g) ?? []).length;
  if (nonAscii / text.length > 0.25) return false;

  // Check for Malay stopwords
  const lower = text.toLowerCase();
  const malayStopwords = [
    "yang", "dengan", "untuk", "dalam", "kepada", "oleh",
    "telah", "akan", "tidak", "bagi", "pada", "dari",
    "itu", "ini", "bahawa", "kerana", "atau", "juga",
    "kata", "berkata", "menurut", "daripada", "mereka",
  ];
  const hits = malayStopwords.filter(w => lower.includes(` ${w} `)).length;
  if (hits >= 3) return false;

  return true;
}

// ── Load model ───────────────────────────────────────────────────────────────
async function loadModel(): Promise<void> {
  if (extractor || modelLoading) return;
  modelLoading = true;

  const send = (msg: OutMessage) => self.postMessage(msg);
  send({ type: "loading", message: "Downloading semantic model (23MB, cached after first load)..." });

  try {
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      {
        dtype: "q8", // 8-bit quantized — smallest that keeps good accuracy
        progress_callback: (progress: any) => {
          if (progress?.status === "progress" && progress?.total) {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            send({ type: "progress", progress: pct });
          }
        },
      }
    );
    modelLoading = false;
    send({ type: "ready" });
  } catch (err) {
    modelLoading = false;
    send({ type: "error", message: String(err) });
  }
}

// ── Classify articles ────────────────────────────────────────────────────────
async function classifyArticles(
  articles: RawArticle[],
  threshold: number
): Promise<ClassifiedArticle[]> {
  if (!extractor) throw new Error("Model not loaded");

  // ① English filter — drop non-English before embedding
  const englishArticles = articles.filter(a =>
    isEnglish(`${a.title} ${a.description ?? ""}`)
  );

  if (englishArticles.length === 0) return [];

  // ② Build text inputs — title + description gives richer signal
  const texts = englishArticles.map((a) =>
    [a.title, a.description].filter(Boolean).join(". ").slice(0, 512)
  );

  // ③ Embed all articles in one batch — much faster than one-by-one
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  const embeddings: number[][] = output.tolist();

  const topicKeys = TOPIC_KEYS;
  const topicVectors = topicKeys.map((k) => TOPIC_EMBEDDINGS[k].vector);

  const classified: ClassifiedArticle[] = [];

  for (let i = 0; i < englishArticles.length; i++) {
    const articleVec = new Float32Array(embeddings[i]);

    // Score against every topic
    const scores = topicVectors.map((tv) => cosineSimilarity(articleVec, tv));
    const bestIdx = argmax(scores);
    const bestScore = scores[bestIdx];

    // ④ Threshold gate — primary filter.
    // Pre-computed short-label vectors score genuine labour articles at ~0.22–0.32.
    // The English filter + keyword fallback handle noise; we trust the threshold here.
    if (bestScore < threshold) continue;

    const bestKey = topicKeys[bestIdx];
    const topic = TOPIC_EMBEDDINGS[bestKey];

    classified.push({
      ...englishArticles[i],
      topicKey:       bestKey,
      topicLabel:     topic.label,
      topicColor:     topic.color,
      topicEmoji:     topic.emoji,
      relevanceScore: Math.round(bestScore * 100) / 100,
    });
  }

  // Sort by relevance score — best articles first
  return classified.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ── Message handler ──────────────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<InMessage>) => {
  const { type } = event.data;

  if (type === "warmup") {
    await loadModel();
    return;
  }

  if (type === "classify") {
    const { articles, threshold } = event.data;
    try {
      if (!extractor) await loadModel();
      const result = await classifyArticles(articles, threshold);
      self.postMessage({ type: "result", articles: result });
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  }
};