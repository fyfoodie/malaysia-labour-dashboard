/**
 * netlify/functions/newsdata-proxy.cjs
 *
 * Bilingual BM25 news scoring.
 * Accepts:  GET /.netlify/functions/newsdata-proxy?lang=en   (default)
 *           GET /.netlify/functions/newsdata-proxy?lang=bm
 *
 * EN: Google News (en-MY) + Bernama English
 * BM: Google News (ms-MY) + Utusan Online + Harian Metro
 *
 * BM25 runs server-side — no browser memory pressure.
 * Results cached 10 min on Netlify CDN.
 */

const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

// ── BM25 parameters ───────────────────────────────────────────────────────────
const K1          = 1.5;
const B           = 0.75;
const TITLE_BOOST = 3.0; // BM25F: title terms weighted 3×

// ── Stopwords ─────────────────────────────────────────────────────────────────
const STOPWORDS_EN = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','have','has','had',
  'do','does','did','will','would','could','should','may','might',
  'it','its','this','that','these','those','i','we','you','he','she','they',
  'what','which','who','when','where','how','all','each','more','most',
  'also','as','said','says','say','new','after','over','about',
  'malaysia','malaysian','kuala','lumpur','putrajaya','report','data',
]);

const STOPWORDS_BM = new Set([
  'yang','dan','di','ke','dari','pada','untuk','dengan','adalah','ini',
  'itu','akan','telah','dalam','oleh','juga','bagi','atas','antara',
  'tidak','boleh','atau','sudah','satu','ia','mereka','kami','kita',
  'ada','lebih','lagi','sahaja','serta','bukan','bila','mana','masa',
  'sebagai','seperti','selepas','sebelum','malaysia','malaysian',
  'kuala','lumpur','putrajaya',
]);

function tokenize(text, lang = 'en') {
  const stops = lang === 'bm' ? STOPWORDS_BM : STOPWORDS_EN;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F]/g, ' ') // keep accented chars for BM
    .split(/\s+/)
    .filter(t => t.length > 2 && !stops.has(t));
}

// ── BM25 ──────────────────────────────────────────────────────────────────────
class BM25 {
  constructor(docs) {
    this.docs  = docs;
    this.N     = docs.length;
    this.avgdl = docs.reduce((s, d) => s + d.length, 0) / (this.N || 1);
    const df   = new Map();
    for (const doc of docs) {
      for (const t of new Set(doc)) df.set(t, (df.get(t) || 0) + 1);
    }
    this.idf = new Map();
    for (const [term, freq] of df) {
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
      const freq = tf.get(term) || 0;
      if (!freq) continue;
      const idf    = this.idf.get(term) || 0;
      const tfNorm = (freq * (K1 + 1)) / (freq + K1 * (1 - B + B * (docLen / this.avgdl)));
      score += idf * tfNorm;
    }
    return score;
  }
}

// ── Topic definitions ─────────────────────────────────────────────────────────
const TOPICS_EN = {
  'Wages & Benefits':  { emoji: '💰', color: '#16a34a', query: `salary wage minimum wage EPF SOCSO EIS dividend bonus pay rise income compensation remuneration take-home payroll overtime allowance cost living household income wage growth pay hike increment` },
  'Hiring & Jobs':     { emoji: '💼', color: '#2563eb', query: `employment hiring recruitment job vacancy unemployment retrenchment layoff fresh graduate job seeker job creation workforce headcount job fair talent acquisition career internship job offer redundancy job loss jobless` },
  'Skills & Training': { emoji: '🎓', color: '#7c3aed', query: `upskill reskill training HRDC HRD Corp HRDF vocational TVET polytechnic skills development digital skills certification human capital apprenticeship capacity building workforce training employability graduate` },
  'Labour Policy':     { emoji: '🏛️', color: '#dc2626', query: `employment act labour law regulation human resources ministry industrial court trade union worker rights social protection work permit labour reform legislation amendment occupational safety EPF SOCSO contribution rate` },
  'Gig Economy':       { emoji: '🛵', color: '#0891b2', query: `gig economy gig worker freelance platform worker delivery rider Grab Foodpanda e-hailing self-employed contract worker digital platform on-demand flexible work gig income protection gig worker bill insurance` },
  'Migrant Labour':    { emoji: '✈️', color: '#be185d', query: `foreign worker migrant worker immigration levy undocumented illegal work permit employment pass Bangladesh Indonesia Myanmar expatriate skilled foreign talent recruitment agency overseas worker` },
  'Industry & Trade':  { emoji: '🏭', color: '#d97706', query: `manufacturing construction semiconductor electronics FDI investment export import trade tariff factory industry output employment industrial park job creation EV electric vehicle data centre supply chain automation` },
  'Economy & Growth':  { emoji: '📈', color: '#65a30d', query: `GDP economic growth unemployment rate labour force Bank Negara DOSM statistics inflation ringgit interest rate productivity budget fiscal employment data quarterly annual economic outlook` },
};

const TOPICS_BM = {
  'Gaji & Manfaat':     { emoji: '💰', color: '#16a34a', query: `gaji upah gaji minimum KWSP PERKESO EIS dividen bonus kenaikan gaji pendapatan pampasan saraan gaji pokok elaun lembur sara hidup pendapatan isi rumah pertumbuhan gaji` },
  'Pekerjaan':          { emoji: '💼', color: '#2563eb', query: `pekerjaan pengambilan pekerja perekrutan kekosongan jawatan pengangguran penamatan pekerja graduan baru pencari kerja pewujudan pekerjaan tenaga kerja kerjaya latihan industri tawaran kerja` },
  'Kemahiran & Latihan':{ emoji: '🎓', color: '#7c3aed', query: `kemahiran latihan HRDC HRD Corp HRDF teknikal TVET politeknik pembangunan kemahiran kemahiran digital pensijilan modal insan perantisan kebolehpasaran graduan` },
  'Dasar Buruh':        { emoji: '🏛️', color: '#dc2626', query: `akta pekerjaan undang-undang buruh peraturan kementerian sumber manusia mahkamah perusahaan kesatuan sekerja hak pekerja perlindungan sosial permit kerja pembaharuan buruh` },
  'Ekonomi Gig':        { emoji: '🛵', color: '#0891b2', query: `ekonomi gig pekerja gig bebas pekerja platform penghantaran pemandu Grab Foodpanda e-hailing bekerja sendiri pekerja kontrak platform digital kerja anjal pendapatan gig` },
  'Pekerja Asing':      { emoji: '✈️', color: '#be185d', query: `pekerja asing pekerja migran imigresen levi tanpa dokumen permit kerja pas pekerjaan Bangladesh Indonesia Myanmar ekspatriat profesional asing agensi pengambilan pekerja luar negara` },
  'Industri & Perdagangan':{ emoji: '🏭', color: '#d97706', query: `pembuatan pembinaan semikonduktor elektronik pelaburan langsung asing eksport import perdagangan tarif kilang industri output pekerjaan pelaburan luar negara kenderaan elektrik pusat data` },
  'Ekonomi & Pertumbuhan':{ emoji: '📈', color: '#65a30d', query: `KDNK pertumbuhan ekonomi kadar pengangguran tenaga kerja Bank Negara DOSM statistik inflasi ringgit kadar faedah produktiviti bajet fiskal data pekerjaan suku tahunan tahunan` },
};

// ── RSS Feeds by language ─────────────────────────────────────────────────────
const FEEDS_EN = [
  `https://news.google.com/rss/search?q=Malaysia+employment+OR+jobs+OR+wages+OR+workforce+OR+hiring+OR+retrenchment+OR+EPF+OR+SOCSO+when%3A3d&hl=en-MY&gl=MY&ceid=MY:en`,
  `https://news.google.com/rss/search?q=Malaysia+%22minimum+wage%22+OR+layoff+OR+graduate+OR+investment+OR+GDP+OR+HRDC+OR+%22foreign+worker%22+OR+%22gig+economy%22+when%3A3d&hl=en-MY&gl=MY&ceid=MY:en`,
];

const FEEDS_BM = [
  // Google News Malay — most reliable server-side, returns BM articles from MY outlets
  `https://news.google.com/rss/search?q=Malaysia+pekerjaan+OR+gaji+OR+pengangguran+OR+buruh+OR+KWSP+OR+pekerja+when%3A3d&hl=ms&gl=MY&ceid=MY:ms`,
  `https://news.google.com/rss/search?q=Malaysia+%22gaji+minimum%22+OR+PERKESO+OR+graduan+OR+pelaburan+OR+KDNK+OR+%22pekerja+asing%22+OR+%22ekonomi+gig%22+when%3A3d&hl=ms&gl=MY&ceid=MY:ms`,
  // Berita Harian — official BM business/economy feed, reliable server-side
  `https://www.bharian.com.my/rss/ekonomi`,
];

// ── Source normalisation ──────────────────────────────────────────────────────
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
  'utusan malaysia': 'Utusan', 'utusan online': 'Utusan', 'utusan': 'Utusan',
  'harian metro': 'H. Metro', 'harianmetro': 'H. Metro',
  'berita harian': 'Berita Harian',
  'sinar harian': 'Sinar Harian',
  'astro utusan': 'Astro Utusan',

  'scoop': 'Scoop', 'scoop.my': 'Scoop',
  'aliran': 'Aliran',
  'world': 'World',
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
    // Method 1: <source> tag (most reliable)
    if (item.source?.[0]) {
      const s = item.source[0];
      const name = typeof s === 'string' ? s : (s._ || '');
      if (name && name.length > 1 && name.toLowerCase() !== 'news') return name;
    }
    // Method 2: source URL attribute
    if (item.source?.[0]?.$?.URL) {
      const url = item.source[0].$.URL;
      const domain = url.replace(/https?:\/\//, '').split('/')[0].replace(/^www\./, '');
      return domain;
    }
    // Method 3: last segment of title after " - " (Google News puts outlet there)
    const title = item.title?.[0] || '';
    const parts = title.split(' - ');
    if (parts.length > 1) {
      const last = parts[parts.length - 1].trim();
      // Only use if it looks like a short outlet name (not a subtitle)
      if (last.length > 0 && last.length < 35 && !last.includes(' OR ')) return last;
    }
    return '';
  } catch { return ''; }
}

function cleanTitle(raw, lang) {
  if (!raw) return '';
  const parts = raw.split(' - ');
  // For BM, source names often appear at end — strip if looks like a source
  if (parts.length > 1) {
    const last = parts[parts.length - 1].trim();
    if (last.length < 40) parts.pop(); // likely a source name
  }
  return parts.join(' - ').trim();
}

function isRecent(pubDate) {
  if (!pubDate) return true;
  try {
    return Date.now() - new Date(pubDate).getTime() < 3 * 24 * 60 * 60 * 1000;
  } catch { return true; }
}

// ── Sentiment ─────────────────────────────────────────────────────────────────
const POS_EN = ['growth','hiring','rise','increase','strong','boost','gain','expand','invest','recovery','improve','opportunity','create jobs','better'];
const NEG_EN = ['layoff','retrench','cut','decline','fall','drop','weak','loss','crisis','slow','concern','unemployment rise','warn','recession','job cut'];
const POS_BM = ['pertumbuhan','pengambilan','meningkat','kukuh','galakan','labur','pulih','peluang','lebih baik','pekerjaan baru'];
const NEG_BM = ['penamatan','pengguruan','penurunan','jatuh','lemah','kerugian','krisis','lambat','bimbang','pengangguran meningkat','amaran','kemelesetan'];

function getSentiment(text, lang) {
  const lower = text.toLowerCase();
  const pos   = (lang === 'bm' ? POS_BM : POS_EN).filter(w => lower.includes(w)).length;
  const neg   = (lang === 'bm' ? NEG_BM : NEG_EN).filter(w => lower.includes(w)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

// ── Main handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const lang   = event.queryStringParameters?.lang === 'bm' ? 'bm' : 'en';
  const FEEDS  = lang === 'bm' ? FEEDS_BM  : FEEDS_EN;
  const TOPICS = lang === 'bm' ? TOPICS_BM : TOPICS_EN;

  try {
    // 1. Fetch RSS feeds
    const results = await Promise.allSettled(
      FEEDS.map(url =>
        (() => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          return fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FindMiJob/1.0)' },
            signal: controller.signal,
          }).finally(() => clearTimeout(timer));
        })().then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
      )
    );

    // 2. Parse + deduplicate
    const seen     = new Set();
    const articles = [];

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      let parsed;
      try {
        parsed = await parseStringPromise(result.value, { explicitArray: true, trim: true });
      } catch { continue; }

      const items = parsed?.rss?.channel?.[0]?.item || [];
      for (const item of items) {
        const rawTitle = item.title?.[0] || '';
        const title    = cleanTitle(rawTitle, lang);
        if (!title || title.length < 10) continue;

        const url = item.link?.[0]
          || (typeof item.guid?.[0] === 'string' ? item.guid[0] : item.guid?.[0]?._ || '#');

        if (seen.has(url) || seen.has(title)) continue;
        if (!isRecent(item.pubDate?.[0])) continue;

        seen.add(url);
        seen.add(title);

        const rawDesc = (item.description?.[0] || '');
        const desc = rawDesc
          .replace(/<[^>]*>/g, '')           // strip HTML tags
          .replace(/&nbsp;/gi, ' ')           // html entities
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#[0-9]+;/g, ' ')        // numeric entities
          .replace(/\s+/g, ' ')             // collapse whitespace
          .trim()
          .slice(0, 280);
        const source  = shortSource(extractSource(item));
        const pubDate = item.pubDate?.[0] || '';

        articles.push({ title, description: desc, url, pubDate, source });
      }
    }

    if (!articles.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ articles: [], lang }),
      };
    }

    // 3. Build BM25 corpus (BM25F: title weighted 3×)
    const corpus = articles.map(a => [
      ...Array(Math.round(TITLE_BOOST)).fill(null).flatMap(() => tokenize(a.title, lang)),
      ...tokenize(a.description, lang),
    ]);
    const bm25 = new BM25(corpus);

    // 4. Pre-tokenise topic queries
    const topicTokens = {};
    for (const [topic, cfg] of Object.entries(TOPICS)) {
      topicTokens[topic] = tokenize(cfg.query, lang);
    }

    // 5. Score each article
    const MIN_SCORE  = 1.0;
    const MIN_MARGIN = 0.12;
    const topicKeys  = Object.keys(TOPICS);

    const scored = articles.map((a, i) => {
      let bestTopic = null;
      let bestScore = 0;
      let secondScore = 0;

      for (const topic of topicKeys) {
        const s = bm25.score(i, topicTokens[topic]);
        if (s > bestScore) { secondScore = bestScore; bestScore = s; bestTopic = topic; }
        else if (s > secondScore) secondScore = s;
      }

      const margin   = bestScore - secondScore;
      const relevant = bestScore >= MIN_SCORE && margin >= MIN_MARGIN;

      return { ...a, topic: relevant ? bestTopic : null, bm25Score: bestScore, relevant };
    });

    // 6. Filter, assign display fields, sort
    const finalArticles = scored
      .filter(a => a.relevant)
      .map(a => ({
        title:       a.title,
        description: a.description,
        url:         a.url,
        pubDate:     a.pubDate,
        source:      a.source,
        sentiment:   getSentiment(`${a.title} ${a.description}`, lang),
        topic:       a.topic,
        topicEmoji:  TOPICS[a.topic]?.emoji  ?? '📰',
        topicColor:  TOPICS[a.topic]?.color  ?? '#6b7280',
        bm25Score:   Math.round(a.bm25Score * 100) / 100,
        lang,
      }))
      .sort((a, b) => {
        if (Math.abs(b.bm25Score - a.bm25Score) > 0.5) return b.bm25Score - a.bm25Score;
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      })
      .slice(0, 12);

    console.log(
      `[newsdata-proxy][${lang}] ${articles.length} → ${finalArticles.length} relevant`,
      finalArticles.map(a => `[${a.source}][${a.topic}][${a.bm25Score}] ${a.title.slice(0, 40)}`)
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':               'public, max-age=600',
      },
      body: JSON.stringify({ articles: finalArticles, lang }),
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
