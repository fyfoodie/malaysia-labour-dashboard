const fetch = require('node-fetch');
const { parseStringPromise } = require('xml2js');

// Smart Google News RSS feeds — using OR operators + when:7d to force recent news only
// scoring=n sorts by date (newest first)
const FEEDS = [
  `https://news.google.com/rss/search?q=Malaysia+employment+OR+jobs+OR+wages+OR+workforce+OR+hiring+OR+retrenchment+OR+economy+OR+tariff+when%3A3d&hl=en-MY&gl=MY&ceid=MY:en`,
  `https://news.google.com/rss/search?q=Malaysia+EPF+OR+SOCSO+OR+%22minimum+wage%22+OR+layoff+OR+graduate+OR+investment+OR+GDP+when%3A3d&hl=en-MY&gl=MY&ceid=MY:en`,
];

const POS_WORDS = ['growth','hiring','record high','rise','increase','strong','boost','gain','expand',
  'invest','recovery','surplus','profit','improve','opportunity','create jobs','new jobs',
  'thrive','positive','upbeat','better','higher gdp','job creation','workforce grow',
  'wage increase','salary rise','minimum wage hike'];

const NEG_WORDS = ['layoff','retrench','cut','decline','fall','drop','weak','loss','risk',
  'crisis','slow','concern','unemployment rise','contract','warn','deficit','freeze',
  'reduce','close','shut','strike','recession','tariff','trade war','conflict','war',
  'shortage','inflation surge','job cut','redundan','dismiss'];

function getSentiment(text) {
  const lower = text.toLowerCase();
  const pos = POS_WORDS.filter(w => lower.includes(w)).length;
  const neg = NEG_WORDS.filter(w => lower.includes(w)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

const SOURCE_MAP = {
  'new straits times': 'NST','nst online': 'NST','nst.com': 'NST',
  'the star': 'The Star','star online': 'The Star',
  'free malaysia today': 'FMT','freemalaysiatoday': 'FMT',
  'astro awani': 'Awani','bernama': 'Bernama',
  'malay mail': 'Malay Mail','malaymail': 'Malay Mail',
  'the edge': 'The Edge','theedgemarkets': 'The Edge',
  'sun daily': 'Sun Daily','thesun': 'Sun Daily',
  'malaysiakini': 'Mkini',
  'the malaysian reserve': 'TMR','malaysianreserve': 'TMR',
  'reuters': 'Reuters','bloomberg': 'Bloomberg',
  'channel newsasia': 'CNA','channel news asia': 'CNA',
  'south china morning post': 'SCMP','scmp': 'SCMP',
  'businesstoday': 'BizToday','business today': 'BizToday',
  'people matters': 'People Matters',
  'financetwitter': 'FinanceTwitter',
};

function shortSource(name) {
  if (!name) return 'News';
  const lower = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(SOURCE_MAP)) {
    if (lower.includes(k)) return v;
  }
  // Return first meaningful word
  return name.split(/[\s\-\.]/)[0] || 'News';
}

function extractSource(item) {
  try {
    if (item.source?.[0]) {
      const s = item.source[0];
      return typeof s === 'string' ? s : (s._ || s.$ ?.URL || '');
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

function categorise(text) {
  const t = text.toLowerCase();
  if (t.match(/tariff|trade war|export|import|fdi|foreign direct invest|sanction|reciprocal/)) return 'Trade & FDI';
  if (t.match(/layoff|retrench|redundan|cut job|job loss|dismiss|retrenched/))                  return 'Retrenchment';
  if (t.match(/wage|salary|pay|minimum wage|epf|socso|bonus|remuneration/))                     return 'Wages & Benefits';
  if (t.match(/gdp|recession|economic growth|inflation|interest rate|bnm|bank negara/))         return 'Economy';
  if (t.match(/budget|policy|government|ministry|minister|parliament|madani/))                  return 'Policy';
  if (t.match(/tech|digital|ai|chip|startup|it sector|data centre/))             return 'Tech & Digital';
  if (t.match(/manufactur|factory|industri|plant|production|ev |electric vehicle/))             return 'Manufacturing';
  if (t.match(/hire|recruit|job fair|talent|workforce expand|graduate|fresh grad/))             return 'Hiring';
  if (t.match(/oil|energy|petrol|fuel|petronas|lng|solar|renewable/))                           return 'Energy';
  if (t.match(/property|construction|infrastructure|johor|js-sez|iskandar/))                    return 'Infrastructure';
  return 'Business';
}

// Filter: must mention Malaysia AND have job/economy relevance
const MALAYSIA_TERMS = ['malaysia','malaysian','kuala lumpur','putrajaya','petronas','bursa','ringgit','bnm','dosm'];
const RELEVANCE_TERMS = ['job','employ','economy','gdp','trade','invest','wage','salary','workforce','industry',
  'tariff','layoff','retrench','hire','labour','worker','business','growth','recession','inflation',
  'epf','socso','fdi','export','import','manufactur','digital','tech','energy','budget'];

function isRelevant(text) {
  const lower = text.toLowerCase();
  const hasMalaysia = MALAYSIA_TERMS.some(t => lower.includes(t));
  const hasRelevance = RELEVANCE_TERMS.some(t => lower.includes(t));
  return hasMalaysia || hasRelevance; // Google News already filters by MY, so either is fine
}

// Only keep articles from last 30 days
function isRecent(pubDate) {
  if (!pubDate) return true; // keep if no date
  try {
    const age = Date.now() - new Date(pubDate).getTime();
    return age < 7 * 24 * 60 * 60 * 1000; // 7 days only
  } catch { return true; }
}

exports.handler = async () => {
  try {
    const results = await Promise.allSettled(
      FEEDS.map(url =>
        fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS reader/1.0)' },
        }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
      )
    );

    const allItems = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      try {
        const parsed = await parseStringPromise(result.value, { explicitArray: true, trim: true });
        const items  = parsed?.rss?.channel?.[0]?.item || [];
        allItems.push(...items);
      } catch { continue; }
    }

    if (!allItems.length) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ articles: [] }) };
    }

    // Deduplicate by URL
    const seenUrls = new Set();
    const seenTitles = new Set();

    const processed = allItems
      .map(item => {
        const rawTitle = item.title?.[0] || '';
        const title    = cleanTitle(rawTitle);
        const desc     = (item.description?.[0] || '').replace(/<[^>]*>/g, '').slice(0, 200);
        const url      = item.link?.[0] || (typeof item.guid?.[0] === 'string' ? item.guid[0] : item.guid?.[0]?._ || '#');
        const pubDate  = item.pubDate?.[0] || '';
        const source   = shortSource(extractSource(item));
        const combined = `${title} ${desc}`;

        return { title, description: desc, url, pubDate, source, combined };
      })
      .filter(a => {
        if (!a.title || a.title.length < 15) return false;
        if (seenUrls.has(a.url) || seenTitles.has(a.title)) return false;
        if (!isRecent(a.pubDate)) return false;
        if (!isRelevant(a.combined)) return false;
        seenUrls.add(a.url);
        seenTitles.add(a.title);
        return true;
      })
      .map(a => ({
        title:       a.title,
        description: a.description,
        url:         a.url,
        pubDate:     a.pubDate,
        source:      a.source,
        sentiment:   getSentiment(a.combined),
        category:    categorise(a.combined),
      }))
      .map(a => (() => {
        // Static job market terms
        const JOB_TERMS = [
          'job','jobs','employment','unemploy','labour','labor','worker','workers','workforce',
          'hiring','hired','hire','retrench','retrenched','retrenchment','layoff','lay off',
          'redundan','dismiss','terminate','termination','job loss','job cut','job creation',
          'wage','wages','salary','salaries','pay','remuneration','bonus','allowance',
          'minimum wage','living wage','pay rise','pay cut','compensation','increment',
          'epf','socso','hrdf','perkeso','kwsp','overtime',
          'skill','skills','talent','graduate','graduates','fresh grad','intern','internship',
          'apprentice','training','upskill','reskill','human capital','human resource',
          'talent gap','skill mismatch','skill shortage','brain drain',
          'job market','labour market','job fair','job vacancy','vacancy','vacancies',
          'recruit','recruitment','headhunt','career','careers','job seeker','jobless',
          'work permit','expatriate','foreign worker','migrant worker','gig worker',
          'gig economy','freelance','contract worker','part time','full time','remote work',
          'manufactur','factory','plant closure','plant expansion','fdi','investment',
          ,'data centre','electric vehicle','solar','renewable energy',
          'gdp growth','economic growth','recession','economic slowdown','inflation',
          'cost of living','interest rate','bank negara','bnm','budget','madani',
          'ringgit','export','import','trade','trade war',
          'employment act','industrial relations','trade union','strike',
          'miti','mida','talentcorp','productivity','mdec','automation','future of work',
        ];

        const lower = (a.title + ' ' + a.description).toLowerCase();
        const staticScore = JOB_TERMS.filter(t => lower.includes(t)).length;

        return { ...a, staticScore };
      })());
      
    // ── Dynamic trending topics ───────────────────────────────────────────
    // Extract all meaningful words from ALL article titles
    // Words that appear in 2+ articles = currently trending → boost score
    const wordFreq = {};
    const stopWords = new Set(['the','a','an','in','on','at','to','for','of','and','or',
      'but','is','are','was','were','has','have','had','be','by','as','with','from',
      'its','it','this','that','these','those','says','said','will','can','may',
      'more','also','over','after','new','one','two','three','malaysia','malaysian']);

    processed.forEach(a => {
      const words = a.title.toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4 && !stopWords.has(w));
      words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    });

    // Words appearing in 2+ articles = trending right now
    const trending = new Set(
      Object.entries(wordFreq)
        .filter(([, count]) => count >= 2)
        .map(([word]) => word)
    );

    // Add trending score on top of static score
    const scored = processed.map(a => {
      const lower = (a.title + ' ' + a.description).toLowerCase();
      const trendingScore = [...trending].filter(t => lower.includes(t)).length;
      return { ...a, jobScore: a.staticScore + trendingScore };
    });
    // ───────────────────────────────────────────────────────────────────── 

    // FIX APPLIED HERE: Assign to finalArticles instead of returning directly
    const finalArticles = scored
      .sort((a, b) => {
        if (b.jobScore !== a.jobScore) return b.jobScore - a.jobScore;
        const da = new Date(a.pubDate).getTime() || 0;
        const db = new Date(b.pubDate).getTime() || 0;
        return db - da;
      })
      .slice(0, 8);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600', // 10 min cache
      },
      body: JSON.stringify({ articles: finalArticles }), // FIX APPLIED HERE: Pass the final array to the body
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};