const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

// Multiple Google News RSS feeds for Malaysia job/economy topics
const FEEDS = [
  // Malaysia economy + jobs search
  'https://news.google.com/rss/search?q=Malaysia+economy+jobs+employment+workforce+wages&hl=en-MY&gl=MY&ceid=MY:en',
  // Malaysia business news
  'https://news.google.com/rss/search?q=Malaysia+business+economy+GDP+investment+tariff&hl=en-MY&gl=MY&ceid=MY:en',
  // Malaysia labour market specific
  'https://news.google.com/rss/search?q=Malaysia+layoff+hiring+retrenchment+minimum+wage+EPF&hl=en-MY&gl=MY&ceid=MY:en',
];

// Keywords that signal job market relevance — score articles higher
const JOB_KEYWORDS = [
  'employment','unemployment','jobs','workforce','workers','wages','salary',
  'hiring','layoff','retrench','economy','gdp','investment','tariff','trade',
  'epf','socso','minimum wage','labour','industry','manufacturing','recession',
  'inflation','interest rate','fdi','budget','policy','ringgit','export',
];

function relevanceScore(text) {
  const lower = text.toLowerCase();
  return JOB_KEYWORDS.filter(k => lower.includes(k)).length;
}

// Client-side sentiment from keywords
const POS = ['growth','hiring','record','rise','increase','strong','boost','gain',
             'expand','invest','recovery','surplus','profit','improve','opportunity',
             'create jobs','new jobs','thrive','positive','upbeat','better'];
const NEG = ['layoff','retrench','cut','decline','fall','drop','weak','loss',
             'risk','crisis','slow','concern','unemployment rise','contract','warn',
             'deficit','freeze','reduce','close','shut','strike','recession',
             'tariff','trade war','conflict','war','shortage','inflation surge'];

function getSentiment(text) {
  const lower = text.toLowerCase();
  const pos = POS.filter(w => lower.includes(w)).length;
  const neg = NEG.filter(w => lower.includes(w)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

// Extract clean source name from Google News item
function extractSource(item) {
  try {
    // Google News puts source in <source> tag or at end of title after " - "
    if (item.source && item.source[0]) {
      const src = item.source[0]._ || item.source[0];
      return typeof src === 'string' ? src.trim() : '';
    }
    // Fallback: extract from title " - Source Name"
    const title = item.title?.[0] || '';
    const parts = title.split(' - ');
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return 'News';
  } catch { return 'News'; }
}

// Clean title (remove " - Source Name" suffix Google News adds)
function cleanTitle(raw) {
  const parts = raw.split(' - ');
  if (parts.length > 1) parts.pop();
  return parts.join(' - ').trim();
}

// Shorten source name to display label
function shortSource(name) {
  const map = {
    'new straits times': 'NST', 'nst online': 'NST',
    'the star': 'The Star', 'star online': 'The Star',
    'free malaysia today': 'FMT', 'fmt': 'FMT',
    'astro awani': 'Awani', 'bernama': 'Bernama',
    'malay mail': 'Malay Mail', 'the edge markets': 'The Edge',
    'the edge': 'The Edge', 'sun daily': 'Sun Daily',
    'malaysiakini': 'Mkini', 'the malaysian reserve': 'TMR',
    'reuters': 'Reuters', 'bloomberg': 'Bloomberg',
    'channel newsasia': 'CNA', 'channel news asia': 'CNA',
    'south china morning post': 'SCMP',
  };
  const lower = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return name.split(' ').slice(0, 2).join(' ');
}

// Categorise by title/description keywords
function categorise(text) {
  const t = text.toLowerCase();
  if (t.match(/tariff|trade war|export|import|fdi|foreign invest|sanction/)) return 'Trade & FDI';
  if (t.match(/layoff|retrench|redundan|cut job|job loss/))                  return 'Retrenchment';
  if (t.match(/wage|salary|pay|minimum wage|epf|socso|bonus/))               return 'Wages & Benefits';
  if (t.match(/gdp|recession|growth rate|economic output|inflation/))        return 'Economy';
  if (t.match(/budget|policy|government|ministry|minister|parliament/))      return 'Policy';
  if (t.match(/tech|digital|ai |startup|it sector|semiconductor/))           return 'Tech';
  if (t.match(/manufactur|factory|industri|plant|production/))               return 'Manufacturing';
  if (t.match(/hire|recruit|job fair|talent|workforce expand/))              return 'Hiring';
  if (t.match(/oil|energy|petrol|fuel|petronas/))                            return 'Energy';
  return 'Business';
}

exports.handler = async () => {
  try {
    // Fetch all feeds in parallel, ignore failures
    const results = await Promise.allSettled(
      FEEDS.map(url => fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        timeout: 8000,
      }).then(r => r.text()))
    );

    // Parse all successful XML responses
    const allItems = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      try {
        const parsed = await parseStringPromise(result.value, { explicitArray: true });
        const items  = parsed?.rss?.channel?.[0]?.item || [];
        allItems.push(...items);
      } catch { continue; }
    }

    if (!allItems.length) {
      return { statusCode: 204, body: JSON.stringify({ articles: [] }) };
    }

    // Deduplicate by title
    const seen  = new Set();
    const deduped = allItems.filter(item => {
      const title = item.title?.[0] || '';
      if (seen.has(title)) return false;
      seen.add(title);
      return true;
    });

    // Score and filter for relevance
    const scored = deduped
      .map(item => {
        const rawTitle = item.title?.[0] || '';
        const title    = cleanTitle(rawTitle);
        const desc     = item.description?.[0] || '';
        const url      = item.link?.[0] || item.guid?.[0]?._ || item.guid?.[0] || '#';
        const pubDate  = item.pubDate?.[0] || '';
        const source   = shortSource(extractSource(item));
        const combined = `${title} ${desc}`;
        const score    = relevanceScore(combined);
        const sentiment = getSentiment(combined);
        const category = categorise(combined);

        return { title, description: desc.replace(/<[^>]*>/g, '').slice(0, 160), url, pubDate, source, sentiment, category, score };
      })
      .filter(a => a.score >= 1 && a.title.length > 10)  // must have at least 1 keyword match
      .sort((a, b) => {
        // Sort by recency first, then relevance
        const dateA = new Date(a.pubDate).getTime() || 0;
        const dateB = new Date(b.pubDate).getTime() || 0;
        if (dateB - dateA !== 0) return dateB - dateA;
        return b.score - a.score;
      })
      .slice(0, 4);  // top 4

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900',  // cache 15 mins
      },
      body: JSON.stringify({ articles: scored }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
