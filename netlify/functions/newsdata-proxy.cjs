/**
 * netlify/functions/newsdata-proxy.cjs
 *
 * Architecture decision (researched):
 * ─────────────────────────────────────────────────────────────────────────────
 * BM25 runs SERVER-SIDE here (Node.js on Netlify), NOT in the browser.
 *
 * Why BM25 beats the old keyword-count approach:
 *   1. Term saturation — "jobs" appearing 10× doesn't make an article 10×
 *      more relevant. BM25's k1 parameter caps this non-linearly.
 *   2. Document length normalisation — a 50-word title snippet with "EPF"
 *      scores higher than a 300-word article that mentions it once in passing.
 *   3. IDF from real corpus — rare terms like "HRDC" score higher than common
 *      ones like "economy" because IDF is computed from the actual article pool.
 *   4. BM25F weighting — title gets 3× weight vs description (standard practice).
 *
 * Why server-side (not browser):
 *   → No memory pressure on Safari (no 23MB ONNX model)
 *   → IDF computed from real article corpus, not fake pseudo-corpus
 *   → Cached on Netlify CDN for 10 min — fast for users
 *   → Single responsibility: browser just renders what server sends
 *
 * Pipeline:
 *   1. Fetch Google News RSS (2 targeted queries, last 3 days)
 *   2. Parse + deduplicate
 *   3. Build BM25 corpus from article titles+descriptions
 *   4. Score each article against 8 labour topic queries
 *   5. Assign best-matching topic + relevance gate
 *   6. Assign sentiment (positive/negative/neutral)
 *   7. Return top 12, sorted by relevance then recency
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

// ── RSS feeds ─────────────────────────────────────────────────────────────────
const FEEDS = [
  `https://news.google.com/rss/search?q=Malaysia+employment+OR+jobs+OR+wages+OR+workforce+OR+hiring+OR+retrenchment+OR+EPF+OR+SOCSO+when%3A3d&hl=en-MY&gl=MY&ceid=MY:en`,
  `https://news.google.com/rss/search?q=Malaysia+%22minimum+wage%22+OR+layoff+OR+graduate+OR+investment+OR+GDP+OR+HRDC+OR+%22foreign+worker%22+OR+%22gig+economy%22+when%3A3d&hl=en-MY&gl=MY&ceid=MY:en`,
];

// ── BM25 parameters (standard Elasticsearch defaults) ─────────────────────────
const K1 = 1.5;   // term frequency saturation
const B  = 0.75;  // document length normalisation
const TITLE_BOOST = 3.0; // title terms weighted 3× (BM25F)

// ── Stopwords ─────────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','have','has','had',
  'do','does','did','will','would','could','should','may','might',
  'it','its','this','that','these','those','i','we','you','he','she','they',
  'what','which','who','when','where','how','all','each','more','most',
  'also','as','said','says','say','new','after','over','about',
  'malaysia','malaysian','kuala','lumpur','putrajaya','report','data',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

// ── BM25 implementation ───────────────────────────────────────────────────────
class BM25 {
  constructor(docs) {
    this.docs = docs; // array of token arrays
    this.N    = docs.length;
    this.avgdl = docs.reduce((s, d) => s + d.length, 0) / (this.N || 1);

    // Build IDF from real corpus
    const df = new Map();
    for (const doc of docs) {
      const uniq = new Set(doc);
      for (const t of uniq) df.set(t, (df.get(t) || 0) + 1);
    }
    this.idf = new Map();
    for (const [term, freq] of df) {
      // Robertson-Sparck Jones IDF (used in Elasticsearch)
      this.idf.set(term, Math.log(1 + (this.N - freq + 0.5) / (freq + 0.5)));
    }
  }

  score(docIdx, queryTokens) {
    const doc    = this.docs[docIdx];
    const docLen = doc.length;
    const tf     = new Map();
    for (const t of doc) tf.set(t, (tf.get(t) || 0) + 1);

    let score = 0;
    for (const term of queryTokens) {
      const freq   = tf.get(term) || 0;
      if (freq === 0) continue;
      const idf    = this.idf.get(term) || 0;
      const tfNorm = (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (docLen / this.avgdl)));
      score += idf * tfNorm;
    }
    return score;
  }
}

// ── Topic definitions ─────────────────────────────────────────────────────────
// Written as realistic news search queries — BM25 scores articles against these
const TOPIC_QUERIES = {
  'Wages & Benefits': tokenize(`
    salary wage minimum wage EPF SOCSO EIS dividend bonus pay rise income
    compensation remuneration take-home payroll overtime allowance cost living
    household income wage growth pay hike increment salary increase
  `),
  'Hiring & Jobs': tokenize(`
    employment hiring recruitment job vacancy unemployment retrenchment
    layoff fresh graduate job seeker job creation workforce headcount
    job fair talent acquisition career internship job offer redundancy
    job loss jobless job market labour market
  `),
  'Skills & Training': tokenize(`
    upskill reskill training HRDC HRD Corp HRDF vocational TVET polytechnic
    skills development digital skills certification human capital
    apprenticeship capacity building workforce training employability
    graduate employability skills mismatch talent gap
  `),
  'Labour Policy': tokenize(`
    employment act labour law regulation human resources ministry
    industrial court trade union worker rights social protection
    work permit labour reform legislation amendment occupational safety
    EPF SOCSO contribution rate policy worker protection
  `),
  'Gig Economy': tokenize(`
    gig economy gig worker freelance platform worker delivery rider
    Grab Foodpanda e-hailing self-employed contract worker
    digital platform on-demand flexible work gig income protection
    gig worker bill insurance coverage
  `),
  'Migrant Labour': tokenize(`
    foreign worker migrant worker immigration levy undocumented illegal
    work permit employment pass Bangladesh Indonesia Myanmar expatriate
    skilled foreign talent recruitment agency overseas worker
    migrant worker welfare enforcement quota
  `),
  'Industry & Trade': tokenize(`
    manufacturing construction semiconductor electronics FDI investment
    export import trade tariff factory industry output employment
    industrial park job creation EV electric vehicle data centre
    supply chain automation digital economy
  `),
  'Economy & Growth': tokenize(`
    GDP economic growth unemployment rate labour force Bank Negara
    DOSM statistics inflation ringgit interest rate productivity
    budget fiscal employment data quarterly annual economic outlook
    recession slowdown economic recovery jobs created
  `),
};

const TOPIC_KEYS    = Object.keys(TOPIC_QUERIES);
const TOPIC_DISPLAY = {
  'Wages & Benefits': { emoji: '💰', color: '#16a34a' },
  'Hiring & Jobs':    { emoji: '💼', color: '#2563eb' },
  'Skills & Training':{ emoji: '🎓', color: '#7c3aed' },
  'Labour Policy':    { emoji: '🏛️', color: '#dc2626' },
  'Gig Economy':      { emoji: '🛵', color: '#0891b2' },
  'Migrant Labour':   { emoji: '✈️', color: '#be185d' },
  'Industry & Trade': { emoji: '🏭', color: '#d97706' },
  'Economy & Growth': { emoji: '📈', color: '#65a30d' },
};

// ── Sentiment ─────────────────────────────────────────────────────────────────
const POS_WORDS = [
  'growth','hiring','record high','rise','increase','strong','boost','gain','expand',
  'invest','recovery','surplus','improve','opportunity','create jobs','new jobs',
  'thrive','positive','better','higher','job creation','workforce grow',
  'wage increase','salary rise','minimum wage hike','upskill','reskill',
];
const NEG_WORDS = [
  'layoff','retrench','cut','decline','fall','drop','weak','loss','risk',
  'crisis','slow','concern','unemployment rise','contract','warn','deficit',
  'reduce','close','shut','strike','recession','trade war','conflict',
  'shortage','inflation surge','job cut','redundan','dismiss','freeze',
];

function getSentiment(text) {
  const lower = text.toLowerCase();
  const pos = POS_WORDS.filter(w => lower.includes(w)).length;
  const neg = NEG_WORDS.filter(w => lower.includes(w)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

// ── Source name normalisation ─────────────────────────────────────────────────
const SOURCE_MAP = {
  'new straits times': 'NST', 'nst online': 'NST', 'nst.com': 'NST',
  'the star': 'The Star', 'star online': 'The Star',
  'free malaysia today': 'FMT', 'freemalaysiatoday': 'FMT',
  'astro awani': 'Awani', 'bernama': 'Bernama',
  'malay mail': 'Malay Mail', 'malaymail': 'Malay Mail',
  'the edge': 'The Edge', 'theedgemarkets': 'The Edge',
  'sun daily': 'Sun Daily', 'thesun': 'Sun Daily',
  'malaysiakini': 'Mkini',
  'the malaysian reserve': 'TMR', 'malaysianreserve': 'TMR',
  'reuters': 'Reuters', 'bloomberg': 'Bloomberg',
  'channel newsasia': 'CNA', 'channel news asia': 'CNA',
  'businesstoday': 'BizToday', 'business today': 'BizToday',
  'the malaysian insight': 'TMI',
  'hr in asia': 'HR Asia',
};

function shortSource(name) {
  if (!name) return 'News';
  const lower = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(SOURCE_MAP)) {
    if (lower.includes(k)) return v;
  }
  return name.split(/[\s\-\.]/)[0] || 'News';
}

function extractSource(item) {
  try {
    if (item.source?.[0]) {
      const s = item.source[0];
      return typeof s === 'string' ? s : (s._ || s.$?.URL || '');
    }
    const title = item.title?.[0] || '';
    const parts = title.split(' - ');
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return '';
  } catch { return ''; }
}

function cleanTitle(raw) {
  if (!raw) return '';
  const parts = raw.split(' - ');
  if (parts.length > 1) parts.pop();
  return parts.join(' - ').trim();
}

function isRecent(pubDate) {
  if (!pubDate) return true;
  try {
    return Date.now() - new Date(pubDate).getTime() < 3 * 24 * 60 * 60 * 1000;
  } catch { return true; }
}

// ── Main handler ──────────────────────────────────────────────────────────────
exports.handler = async () => {
  try {
    // 1. Fetch RSS feeds in parallel
    const results = await Promise.allSettled(
      FEEDS.map(url =>
        fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FindMiJob/1.0)' },
          timeout: 8000,
        }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
      )
    );

    // 2. Parse and collect raw articles
    const rawItems = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      try {
        const parsed = await parseStringPromise(result.value, { explicitArray: true, trim: true });
        rawItems.push(...(parsed?.rss?.channel?.[0]?.item || []));
      } catch { continue; }
    }

    if (!rawItems.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ articles: [] }),
      };
    }

    // 3. Parse each item, deduplicate, filter recent
    const seen     = new Set();
    const articles = [];

    for (const item of rawItems) {
      const rawTitle = item.title?.[0] || '';
      const title    = cleanTitle(rawTitle);
      if (!title || title.length < 15) continue;

      const url = item.link?.[0]
        || (typeof item.guid?.[0] === 'string' ? item.guid[0] : item.guid?.[0]?._ || '#');

      if (seen.has(url) || seen.has(title)) continue;
      if (!isRecent(item.pubDate?.[0])) continue;

      seen.add(url);
      seen.add(title);

      const desc    = (item.description?.[0] || '').replace(/<[^>]*>/g, '').trim().slice(0, 300);
      const source  = shortSource(extractSource(item));
      const pubDate = item.pubDate?.[0] || '';

      articles.push({ title, description: desc, url, pubDate, source });
    }

    if (!articles.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ articles: [] }),
      };
    }

    // 4. Build BM25 corpus from real articles
    //    BM25F: title tokens repeated TITLE_BOOST times → higher weight
    const corpus = articles.map(a => [
      ...Array(Math.round(TITLE_BOOST)).fill(null).flatMap(() => tokenize(a.title)),
      ...tokenize(a.description),
    ]);
    const bm25 = new BM25(corpus);

    // 5. Pre-tokenise all topic queries (done once)
    const topicTokens = {};
    for (const [topic, tokens] of Object.entries(TOPIC_QUERIES)) {
      topicTokens[topic] = tokens;
    }

    // 6. Score each article against all topics
    const MIN_SCORE  = 1.2;  // must clear this to be considered relevant
    const MIN_MARGIN = 0.15; // best topic must lead runner-up by at least this
                              // (prevents flat distributions from matching anything)

    const scored = articles.map((a, i) => {
      const scores = {};
      let bestTopic = null;
      let bestScore = 0;
      let secondScore = 0;

      for (const topic of TOPIC_KEYS) {
        const s = bm25.score(i, topicTokens[topic]);
        scores[topic] = s;
        if (s > bestScore) {
          secondScore = bestScore;
          bestScore   = s;
          bestTopic   = topic;
        } else if (s > secondScore) {
          secondScore = s;
        }
      }

      const margin   = bestScore - secondScore;
      const relevant = bestScore >= MIN_SCORE && margin >= MIN_MARGIN;

      return {
        ...a,
        topic:     relevant ? bestTopic : null,
        bm25Score: bestScore,
        margin,
        relevant,
      };
    });

    // 7. Keep only relevant articles, assign sentiment + topic display
    const relevant = scored
      .filter(a => a.relevant)
      .map(a => ({
        title:       a.title,
        description: a.description,
        url:         a.url,
        pubDate:     a.pubDate,
        source:      a.source,
        sentiment:   getSentiment(`${a.title} ${a.description}`),
        topic:       a.topic,
        topicEmoji:  TOPIC_DISPLAY[a.topic]?.emoji  ?? '📰',
        topicColor:  TOPIC_DISPLAY[a.topic]?.color  ?? '#6b7280',
        bm25Score:   Math.round(a.bm25Score * 100) / 100,
      }))
      // Sort: by BM25 score first, then recency
      .sort((a, b) => {
        if (Math.abs(b.bm25Score - a.bm25Score) > 0.5) return b.bm25Score - a.bm25Score;
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      })
      .slice(0, 12); // return top 12 — frontend paginates to 4 per page

    console.log(
      `[newsdata-proxy] ${articles.length} articles → ${relevant.length} relevant after BM25`,
      relevant.map(a => `[${a.topic}][${a.bm25Score}] ${a.title.slice(0, 45)}`)
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':               'public, max-age=600', // 10 min Netlify CDN cache
      },
      body: JSON.stringify({ articles: relevant }),
    };
  } catch (err) {
    console.error('[newsdata-proxy] error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
