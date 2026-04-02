import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Lang = "en" | "bm";

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // Header
  "header.title": { en: "Malaysia Labour Market", bm: "Pasaran Buruh Malaysia" },
  "header.subtitle": { en: "Employment Dashboard", bm: "Papan Pemuka Pekerjaan" },
  "nav.snapshot": { en: "Snapshot", bm: "Gambaran" },
  "nav.trends": { en: "Trends", bm: "Trend" },
  "nav.sectors": { en: "Sectors", bm: "Sektor" },
  "nav.underemployment": { en: "Underemployment", bm: "Guna Tenaga Tidak Penuh" },
  "nav.states": { en: "States", bm: "Negeri" },

  // Hero
  "hero.badge": { en: "Official DOSM Data · Updated Monthly", bm: "Data Rasmi DOSM · Dikemaskini Bulanan" },
  "hero.title1": { en: "Malaysia's Jobs.", bm: "Pekerjaan Malaysia." },
  "hero.title2": { en: "By the Numbers.", bm: "Dalam Angka." },
  "hero.desc": { en: "Employment trends, sector shifts, state disparities and skills mismatch — Malaysia's labour market, made clear.", bm: "Trend pekerjaan, perubahan sektor, jurang negeri dan ketidakpadanan kemahiran — pasaran buruh Malaysia, dijelaskan." },

  // Section headers
  "section.insights": { en: "Market News", bm: "Berita Pasaran" },
  "section.kpi": { en: "Key Labour Market Snapshot", bm: "Gambaran Utama Pasaran Buruh" },
  "section.trends": { en: "Is the job market improving or worsening?", bm: "Adakah pasaran kerja bertambah baik atau buruk?" },
  "section.sectors": { en: "Where are the job opportunities?", bm: "Di mana peluang pekerjaan?" },
  "section.occupations": { en: "Which occupations pay the most?", bm: "Pekerjaan mana yang paling tinggi gaji?" },
  "section.underemployment": { en: "Are graduates working in the right jobs?", bm: "Adakah graduan bekerja dalam bidang yang betul?" },
  "section.states": { en: "How does your state compare?", bm: "Bagaimana negeri anda berbanding?" },
  "section.regional": { en: "Which state offers the best opportunities?", bm: "Negeri mana menawarkan peluang terbaik?" },
  "section.jobhealth": { en: "How good is the job market for you?", bm: "Seberapa baik pasaran kerja untuk anda?" },
  "section.wages":     { en: "What do different industries pay?",   bm: "Berapa gaji yang dibayar oleh industri berbeza?" },

  // Footer
  "footer.text": { en: "Data sourced from", bm: "Sumber data daripada" },
  "footer.updated": { en: "Updated monthly", bm: "Dikemaskini bulanan" },
  "footer.built": { en: "Built for Malaysia", bm: "Dibina untuk Malaysia" },

  // Labour Health Score
  "health.title": { en: "Labour Health Index", bm: "Indeks Kesihatan Buruh" },
  "health.outOf": { en: "out of 100", bm: "daripada 100" },
  "health.strong": { en: "Strong", bm: "Kukuh" },
  "health.healthy": { en: "Healthy", bm: "Sihat" },
  "health.recovering": { en: "Recovering", bm: "Pulih" },
  "health.weak": { en: "Weak", bm: "Lemah" },
  "health.strong.desc": { en: "Exceptionally low unemployment and strong workforce participation.", bm: "Kadar pengangguran sangat rendah dan penyertaan tenaga kerja yang kukuh." },
  "health.healthy.desc": { en: "Solid labour market with steady employment growth.", bm: "Pasaran buruh kukuh dengan pertumbuhan pekerjaan yang stabil." },
  "health.recovering.desc": { en: "Gradual improvements across key labour indicators.", bm: "Penambahbaikan beransur-ansur dalam petunjuk buruh utama." },
  "health.weak.desc": { en: "Labour market facing elevated unemployment or low participation.", bm: "Pasaran buruh menghadapi pengangguran tinggi atau penyertaan rendah." },

  // Data Insight Cards
  "insight.didYouKnow": { en: "DID YOU KNOW?", bm: "TAHUKAH ANDA?" },
  "insight.trend": { en: "INTERESTING TREND", bm: "TREND MENARIK" },
  "insight.jobMarket": { en: "JOB MARKET INSIGHT", bm: "PANDANGAN PASARAN KERJA" },
  "insight.pandemic": { en: "PANDEMIC IMPACT", bm: "KESAN PANDEMIK" },
  "insight.highest": { en: "recorded the highest unemployment at", bm: "mencatatkan pengangguran tertinggi pada" },
  "insight.lowest": { en: "has the lowest at", bm: "paling rendah pada" },
  "insight.lfpr": { en: "Malaysia's LFPR reached its highest level of", bm: "LFPR Malaysia mencapai paras tertinggi pada" },
  "insight.lfpr2": { en: "showing more people entering the workforce than ever.", bm: "menunjukkan lebih ramai orang memasuki tenaga kerja." },
  "insight.growth": { en: "Employment has grown by", bm: "Pekerjaan telah berkembang sebanyak" },
  "insight.since": { en: "since the first recorded month, expanding from", bm: "sejak bulan pertama direkodkan, meningkat dari" },
  "insight.to": { en: "to", bm: "kepada" },
  "insight.workers": { en: "workers.", bm: "pekerja." },
  "insight.peaked": { en: "Unemployment peaked at", bm: "Pengangguran memuncak pada" },
  "insight.in": { en: "in", bm: "pada" },
  "insight.pandemic2": { en: "during the pandemic, but has since recovered to", bm: "semasa pandemik, tetapi telah pulih kepada" },
  "insight.asOf": { en: "as of", bm: "setakat" },

  // KPI Cards
  "kpi.employmentRate": { en: "Employment Rate", bm: "Kadar Pekerjaan" },
  "kpi.unemploymentRate": { en: "Unemployment Rate", bm: "Kadar Pengangguran" },
  "kpi.labourParticipation": { en: "Labour Participation", bm: "Penyertaan Tenaga Kerja" },
  "kpi.skillsMismatch": { en: "Skills Mismatch", bm: "Ketidakpadanan Kemahiran" },
  "kpi.latestData": { en: "Latest data", bm: "Data terkini" },
  "kpi.tooltip.employment": { en: "Percentage of labour force currently employed.", bm: "Peratusan tenaga kerja yang sedang bekerja." },
  "kpi.tooltip.unemployment": { en: "Percentage actively seeking but unable to find work. Lower is better.", bm: "Peratusan yang aktif mencari tetapi tidak dapat mencari kerja. Lebih rendah lebih baik." },
  "kpi.tooltip.participation": { en: "Percentage of working-age population in the labour force.", bm: "Peratusan penduduk umur bekerja dalam tenaga kerja." },
  "kpi.tooltip.mismatch": { en: "Tertiary-educated workers in jobs below their qualification level.", bm: "Pekerja berpendidikan tinggi dalam pekerjaan di bawah tahap kelayakan mereka." },

  // Trend Charts
  "trends.title": { en: "Employment Trends", bm: "Trend Pekerjaan" },
  "trends.monthly": { en: "Monthly data from", bm: "Data bulanan dari" },
  "trends.allYears": { en: "All Years", bm: "Semua Tahun" },
  "trends.unemployment": { en: "Unemployment", bm: "Pengangguran" },
  "trends.workforce": { en: "Workforce", bm: "Tenaga Kerja" },
  "trends.participation": { en: "Participation", bm: "Penyertaan" },
  "trends.jobChange": { en: "Job Change", bm: "Perubahan Kerja" },
  "trends.preCovid": { en: "Pre-COVID avg (3.3%)", bm: "Purata pra-COVID (3.3%)" },
  "trends.labourForce": { en: "Labour Force", bm: "Tenaga Kerja" },
  "trends.employed": { en: "Employed", bm: "Bekerja" },
  "trends.unemploymentRate": { en: "Unemployment Rate", bm: "Kadar Pengangguran" },
  "trends.participationRate": { en: "Participation Rate", bm: "Kadar Penyertaan" },
  "trends.70target": { en: "70% target", bm: "Sasaran 70%" },
  "trends.note.unemployment": { en: "The dashed line marks the pre-COVID baseline average of 3.3%", bm: "Garisan putus-putus menandakan purata asas pra-COVID 3.3%" },
  "trends.note.workforce": { en: "Gap between Labour Force and Employed lines represents unemployment count", bm: "Jurang antara garisan Tenaga Kerja dan Bekerja mewakili bilangan pengangguran" },
  "trends.note.participation": { en: "Dashed line marks the 70% participation target", bm: "Garisan putus-putus menandakan sasaran penyertaan 70%" },
  "trends.note.change": { en: "Month-over-month change in total employed persons (thousands)", bm: "Perubahan bulan ke bulan dalam jumlah pekerja (ribu)" },

  // Sector Chart
  "sectors.title": { en: "Employment by Sector", bm: "Pekerjaan mengikut Sektor" },
  "sectors.desc": { en: "How Malaysia's workforce is distributed across the three main economic sectors", bm: "Bagaimana tenaga kerja Malaysia diagihkan merentasi tiga sektor ekonomi utama" },
  "sectors.snapshot": { en: "Snapshot", bm: "Gambaran" },
  "sectors.historicalTrend": { en: "Historical Trend", bm: "Trend Sejarah" },
  "sectors.structuralShift": { en: "Structural Shift", bm: "Perubahan Struktur" },
  "sectors.services": { en: "Services", bm: "Perkhidmatan" },
  "sectors.industry": { en: "Industry", bm: "Industri" },
  "sectors.agriculture": { en: "Agriculture", bm: "Pertanian" },
  "sectors.grew": { en: "grew", bm: "meningkat" },
  "sectors.fell": { en: "fell", bm: "menurun" },
  "sectors.overDecade": { en: "over the past decade", bm: "sepanjang dekad lalu" },
  "sectors.share": { en: "share", bm: "bahagian" },
  "sectors.declined": { en: "declined", bm: "menurun" },
  "sectors.transformation": { en: "Malaysia's ongoing structural transformation", bm: "Transformasi struktur Malaysia yang berterusan" },
  "sectors.trendDesc": { en: "How each sector's share of total employment has evolved since 2005", bm: "Bagaimana bahagian setiap sektor dalam jumlah pekerjaan telah berkembang sejak 2005" },

  // InDemand Chart
  "indemand.title": { en: "In-Demand Industries & Occupations", bm: "Industri & Pekerjaan Dalam Permintaan" },
  "indemand.desc": { en: "Top occupations in Malaysia by average annual salary — discover where the highest-paying opportunities are.", bm: "Pekerjaan teratas di Malaysia mengikut gaji tahunan purata — ketahui di mana peluang bergaji tinggi." },
  "indemand.occupation": { en: "Occupation", bm: "Pekerjaan" },
  "indemand.avgSalary": { en: "Avg Salary (MYR)", bm: "Gaji Purata (MYR)" },

  // Underemployment
  "under.title": { en: "Skills Mismatch & Underemployment", bm: "Ketidakpadanan Kemahiran & Guna Tenaga Tidak Penuh" },
  "under.desc": { en: "Tertiary-educated workers in jobs below their qualification level — a key signal of labour market inefficiency", bm: "Pekerja berpendidikan tinggi dalam pekerjaan di bawah tahap kelayakan — isyarat utama ketidakcekapan pasaran buruh" },
  "under.byGender": { en: "By Gender", bm: "Mengikut Jantina" },
  "under.byAge": { en: "By Age", bm: "Mengikut Umur" },
  "under.overTime": { en: "Over Time", bm: "Mengikut Masa" },
  "under.currentRate": { en: "Current Rate", bm: "Kadar Semasa" },
  "under.peakRate": { en: "Peak Rate", bm: "Kadar Tertinggi" },
  "under.youthVsSenior": { en: "Youth vs Senior", bm: "Belia vs Warga Emas" },
  "under.mostAffected": { en: "Most Affected", bm: "Paling Terjejas" },
  "under.highestRecorded": { en: "Highest recorded", bm: "Tertinggi direkodkan" },
  "under.genderDesc": { en: "Quarterly skills mismatch rate by gender — are women or men more affected?", bm: "Kadar ketidakpadanan kemahiran suku tahunan mengikut jantina — adakah wanita atau lelaki lebih terjejas?" },
  "under.ageDesc": { en: "which age group faces the most skills mismatch?", bm: "kumpulan umur mana yang paling terjejas oleh ketidakpadanan kemahiran?" },
  "under.trendDesc": { en: "Overall skills mismatch rate trend — is Malaysia's graduate underemployment improving?", bm: "Trend kadar ketidakpadanan kemahiran keseluruhan — adakah guna tenaga tidak penuh graduan Malaysia bertambah baik?" },
  "under.youth": { en: "Youth", bm: "Belia" },
  "under.youngAdult": { en: "Young Adult", bm: "Dewasa Muda" },
  "under.midCareer": { en: "Mid Career", bm: "Pertengahan Kerjaya" },
  "under.senior": { en: "Senior", bm: "Warga Emas" },

  // State Map
  "state.title": { en: "State-Level Labour Market", bm: "Pasaran Buruh Peringkat Negeri" },
  "state.unemployment": { en: "Unemployment", bm: "Pengangguran" },
  "state.participation": { en: "Participation", bm: "Penyertaan" },
  "state.avgUnemployment": { en: "Avg Unemployment", bm: "Purata Pengangguran" },
  "state.avgParticipation": { en: "Avg Participation", bm: "Purata Penyertaan" },
  "state.bestUnemployment": { en: "Best Unemployment", bm: "Pengangguran Terbaik" },
  "state.statesTracked": { en: "States Tracked", bm: "Negeri Dijejaki" },
  "state.choropleth": { en: "Choropleth", bm: "Koroplet" },
  "state.clickState": { en: "Click a state to pin details • Hover to preview", bm: "Klik negeri untuk pin butiran • Hover untuk pratonton" },
  "state.labourForce": { en: "Labour Force", bm: "Tenaga Kerja" },
  "state.employed": { en: "Employed", bm: "Bekerja" },
  "state.unemployed": { en: "Unemployed", bm: "Menganggur" },
  "state.unemploymentRate": { en: "Unemployment Rate", bm: "Kadar Pengangguran" },
  "state.participationRate": { en: "Participation Rate", bm: "Kadar Penyertaan" },
  "state.rankings": { en: "Rankings", bm: "Kedudukan" },
  "state.clickForDetails": { en: "Click a state on the map for details", bm: "Klik negeri pada peta untuk butiran" },
  "state.close": { en: "Close", bm: "Tutup" },
  "state.vsNational": { en: "Unemployment vs national avg", bm: "Pengangguran vs purata kebangsaan" },
  "state.low": { en: "Low", bm: "Rendah" },
  "state.high": { en: "High", bm: "Tinggi" },

  // Regional / Economic Opportunity
  "regional.title": { en: "State Economic Opportunity Index", bm: "Indeks Peluang Ekonomi Negeri" },
  "regional.desc": { en: "Composite score: household income, unemployment, poverty & equality — live from DOSM", bm: "Skor komposit: pendapatan isi rumah, pengangguran, kemiskinan & kesaksamaan — langsung dari DOSM" },
  "regional.score": { en: "Score", bm: "Skor" },
  "regional.income": { en: "Income", bm: "Pendapatan" },
  "regional.unemploy": { en: "Unemploy.", bm: "Penganggur." },
  "regional.poverty": { en: "Poverty", bm: "Kemiskinan" },
  "regional.topStates": { en: "Top Opportunity States", bm: "Negeri Peluang Teratas" },
  "regional.needsAttention": { en: "Needs Attention", bm: "Perlu Perhatian" },
  "regional.selectState": { en: "Select a state", bm: "Pilih negeri" },
  "regional.clickBar": { en: "Click any bar to see full economic profile with radar breakdown", bm: "Klik mana-mana bar untuk melihat profil ekonomi penuh" },
  "regional.highOpp": { en: "High Opportunity", bm: "Peluang Tinggi" },
  "regional.goodOpp": { en: "Good Opportunity", bm: "Peluang Baik" },
  "regional.moderate": { en: "Moderate", bm: "Sederhana" },
  "regional.needsImprovement": { en: "Needs Improvement", bm: "Perlu Penambahbaikan" },
  "regional.challenging": { en: "Challenging", bm: "Mencabar" },

  // Job Market Health
  "job.title": { en: "Check Your Job Market Health", bm: "Semak Kesihatan Pasaran Kerja Anda" },
  "job.personalised": { en: "Personalised Analysis", bm: "Analisis Peribadi" },
  "job.desc": { en: "Select a location and industry to see a personalised labour health score.", bm: "Pilih lokasi dan industri untuk melihat skor kesihatan buruh peribadi." },
  "job.selectState": { en: "Select state", bm: "Pilih negeri" },
  "job.selectIndustry": { en: "Select industry", bm: "Pilih industri" },
  "job.analyze": { en: "Analyze Job Market", bm: "Analisis Pasaran Kerja" },
  "job.analysing": { en: "Analysing…", bm: "Menganalisis…" },
  "job.emptyState": { en: "Select a location and industry to analyze the job market.", bm: "Pilih lokasi dan industri untuk menganalisis pasaran kerja." },
  "job.analyzingMarket": { en: "Analyzing labour market…", bm: "Menganalisis pasaran buruh…" },
  "job.unemployment": { en: "Unemployment", bm: "Pengangguran" },
  "job.participation": { en: "Participation", bm: "Penyertaan" },
  "job.growth": { en: "Growth", bm: "Pertumbuhan" },
  "job.insight": { en: "Insight", bm: "Pandangan" },
  "job.trendTitle": { en: "Unemployment Trend", bm: "Trend Pengangguran" },
  "job.suggestions": { en: "Suggestions for You", bm: "Cadangan untuk Anda" },

  // Story Mode
  "story.button": { en: "Explain Malaysia Labour Trends", bm: "Terangkan Trend Buruh Malaysia" },
  "story.title": { en: "Story Mode", bm: "Mod Cerita" },
  "story.previous": { en: "Previous", bm: "Sebelumnya" },
  "story.next": { en: "Next", bm: "Seterusnya" },
  "story.done": { en: "Done ✓", bm: "Selesai ✓" },
  "story.s1.title": { en: "Employment Overview", bm: "Gambaran Keseluruhan Pekerjaan" },
  "story.s1.body": { en: "Malaysia experienced a gradual recovery in employment following the pandemic, with job numbers steadily increasing since 2021. The labour force has grown consistently over the years — a remarkable expansion driven by economic development and population growth.", bm: "Malaysia mengalami pemulihan beransur-ansur dalam pekerjaan selepas pandemik, dengan jumlah pekerjaan meningkat secara berterusan sejak 2021. Tenaga kerja telah berkembang secara konsisten — pengembangan luar biasa didorong oleh pembangunan ekonomi dan pertumbuhan penduduk." },
  "story.s2.title": { en: "The COVID-19 Shock", bm: "Kejutan COVID-19" },
  "story.s2.body": { en: "The pandemic caused Malaysia's unemployment rate to spike dramatically in 2020, reaching its highest level in decades. Movement control orders halted entire industries overnight, pushing hundreds of thousands out of work in a matter of months.", bm: "Pandemik menyebabkan kadar pengangguran Malaysia melonjak secara dramatik pada 2020, mencapai paras tertinggi dalam beberapa dekad. Perintah kawalan pergerakan menghentikan seluruh industri semalaman, mendorong ratusan ribu orang kehilangan pekerjaan." },
  "story.s3.title": { en: "The Recovery", bm: "Pemulihan" },
  "story.s3.body": { en: "From 2021 onwards, Malaysia's labour market staged an impressive recovery. Vaccination rollouts, economic reopening and targeted government interventions helped bring unemployment back down toward pre-pandemic levels by 2022.", bm: "Dari 2021 dan seterusnya, pasaran buruh Malaysia mencatatkan pemulihan yang mengagumkan. Pelancaran vaksinasi, pembukaan semula ekonomi dan campur tangan kerajaan yang disasarkan membantu menurunkan pengangguran ke arah paras sebelum pandemik menjelang 2022." },
  "story.s4.title": { en: "Where We Are Now", bm: "Di Mana Kita Sekarang" },
  "story.s4.body": { en: "Today, Malaysia's labour market shows resilience with unemployment at around 2.9% and labour force participation at 70.9%. However, challenges remain — skills mismatch affects over 11% of graduates, and regional disparities between states persist.", bm: "Hari ini, pasaran buruh Malaysia menunjukkan ketahanan dengan pengangguran sekitar 2.9% dan penyertaan tenaga kerja pada 70.9%. Walau bagaimanapun, cabaran kekal — ketidakpadanan kemahiran menjejaskan lebih 11% graduan, dan jurang wilayah antara negeri berterusan." },

  // AI Analyst
  "ai.button": { en: "Ask AI Analyst", bm: "Tanya Penganalisis AI" },
  "ai.title": { en: "AI Labour Analyst", bm: "Penganalisis Buruh AI" },
  "ai.subtitle": { en: "Live DOSM data + web search", bm: "Data DOSM langsung + carian web" },
  "ai.welcome": { en: "Hi! I'm your Malaysia Labour Market AI Analyst. I have access to live DOSM data and can search current news to answer your questions. Ask me anything — about employment trends, sectors, states, or Malaysia's economy.", bm: "Hi! Saya Penganalisis AI Pasaran Buruh Malaysia anda. Saya mempunyai akses kepada data DOSM langsung dan boleh mencari berita terkini untuk menjawab soalan anda. Tanya apa sahaja — tentang trend pekerjaan, sektor, negeri, atau ekonomi Malaysia." },
  "ai.suggested": { en: "Suggested questions:", bm: "Soalan dicadangkan:" },
  "ai.placeholder": { en: "Ask anything about Malaysia's job market...", bm: "Tanya apa sahaja tentang pasaran kerja Malaysia..." },
  "ai.powered": { en: "Powered by Gemini 2.0 Flash · Live DOSM data · Web search enabled", bm: "Dikuasakan oleh Gemini 2.0 Flash · Data DOSM langsung · Carian web diaktifkan" },
  "ai.analysing": { en: "Analysing data + searching web...", bm: "Menganalisis data + mencari web..." },
  "ai.sources": { en: "Sources:", bm: "Sumber:" },

  // Trend Alerts
  "alert.warning": { en: "Warning", bm: "Amaran" },
  "alert.positive": { en: "Positive", bm: "Positif" },
  "alert.info": { en: "Info", bm: "Maklumat" },

  // Common
  "common.all": { en: "All", bm: "Semua" },
  "common.male": { en: "Male", bm: "Lelaki" },
  "common.female": { en: "Female", bm: "Perempuan" },
  "common.source": { en: "Source", bm: "Sumber" },
  "common.sources": { en: "Sources", bm: "Sumber" },
  "common.loading": { en: "Loading...", bm: "Memuatkan..." },
  "common.of": { en: "of workforce", bm: "tenaga kerja" },
  "common.share": { en: "Share", bm: "Bahagian" },

  // KPI extra
  "kpi.yoy": { en: "YoY", bm: "TkT" },

  // Sectors — missing pieces
  "sectors.servicesPrefix": { en: "Services sector", bm: "Sektor Perkhidmatan" },
  "sectors.agriSharePrefix": { en: "Agriculture share", bm: "Bahagian Pertanian" },
  "sectors.structuralChangeFrom": { en: "Structural change from", bm: "Perubahan struktur dari" },
  "sectors.structuralChangeTo": { en: "to", bm: "ke" },
  "sectors.econTransform": { en: "Malaysia's economic transformation", bm: "Transformasi ekonomi Malaysia" },
  "sectors.ppNote": { en: "pp = percentage points shift in workforce share", bm: "pp = perubahan mata peratusan dalam bahagian tenaga kerja" },

  // Underemployment — missing pieces
  "under.noRateData": { en: "No rate data available", bm: "Tiada data kadar tersedia" },
  "under.trendNoData": { en: "Trend data not available", bm: "Data trend tidak tersedia" },
  "under.mismatchRate": { en: "Mismatch Rate", bm: "Kadar Ketidakpadanan" },
  "under.skillsMismatch": { en: "Skills Mismatch", bm: "Ketidakpadanan Kemahiran" },
  "under.latestQuarter": { en: "Latest quarter", bm: "Suku terkini" },
  "under.youthAre": { en: "are", bm: "adalah" },
  "under.youthMoreLikely": { en: "more likely to be underemployed than workers aged 45+", bm: "lebih berkemungkinan mengalami guna tenaga tidak penuh berbanding pekerja berumur 45+" },

  // Trend Alerts — all new
  "alert.uRateRose": { en: "Unemployment rate rose from", bm: "Kadar pengangguran meningkat dari" },
  "alert.uRateDropped": { en: "Unemployment rate dropped from", bm: "Kadar pengangguran turun dari" },
  "alert.rateConnector": { en: "to", bm: "kepada" },
  "alert.overPast3Months": { en: "over the past 3 months.", bm: "sepanjang 3 bulan lepas." },
  "alert.statesHighUnemp": { en: "state(s) have unemployment above 4%:", bm: "negeri mempunyai pengangguran melebihi 4%:" },
  "alert.lfprTrendingUp": { en: "Labour force participation is trending upward at", bm: "Penyertaan tenaga kerja berada dalam tren menaik pada" },
  "alert.empGrew": { en: "Employment grew by", bm: "Pekerjaan meningkat sebanyak" },
  "alert.empDeclined": { en: "Employment declined by", bm: "Pekerjaan menurun sebanyak" },
  "alert.jobsLastMonth": { en: "jobs last month", bm: "pekerjaan bulan lepas" },
  "alert.lfSurpassed": { en: "Malaysia's labour force has surpassed 17 million workers", bm: "Tenaga kerja Malaysia telah melepasi 17 juta pekerja" },

  // Regional — missing pieces
  "regional.loading": { en: "Loading live data from DOSM...", bm: "Memuatkan data langsung dari DOSM..." },
  "regional.clickBarShort": { en: "Click any bar to see full state profile", bm: "Klik mana-mana bar untuk lihat profil negeri" },
  "regional.medianIncome": { en: "Median Income", bm: "Pendapatan Median" },
  "regional.meanIncome": { en: "Mean Income", bm: "Pendapatan Purata" },
  "regional.povertyRate": { en: "Poverty Rate", bm: "Kadar Kemiskinan" },
  "regional.giniIndex": { en: "Gini Index", bm: "Indeks Gini" },
  "regional.scoreLabel": { en: "Score:", bm: "Skor:" },
  "regional.unemploymentDetail": { en: "Unemployment", bm: "Pengangguran" },
  "regional.participationDetail": { en: "Participation", bm: "Penyertaan" },
  "regional.barScore": { en: "Opportunity Score by State", bm: "Skor Peluang mengikut Negeri" },
  "regional.barIncome": { en: "Median Monthly Household Income (RM)", bm: "Pendapatan Isi Rumah Bulanan Median (RM)" },
  "regional.barUrate": { en: "Unemployment Rate (%) — lower is better", bm: "Kadar Pengangguran (%) — lebih rendah lebih baik" },
  "regional.barPoverty": { en: "Poverty Incidence (%) — lower is better", bm: "Insiden Kemiskinan (%) — lebih rendah lebih baik" },
  "regional.tooltipScore": { en: "Score", bm: "Skor" },
  "regional.tooltipMedian": { en: "Median Income", bm: "Pendapatan Median" },
  "regional.tooltipUnemp": { en: "Unemployment", bm: "Pengangguran" },
  "regional.tooltipPoverty": { en: "Poverty Rate", bm: "Kadar Kemiskinan" },

  // Wages by Industry
  "wages.title":    { en: "Wages by Industry",                              bm: "Gaji mengikut Industri" },
  "wages.desc":     { en: "Formal sector median & mean wages",              bm: "Gaji median & purata sektor formal" },
  "wages.tabMedian":{ en: "Median Wage",                                    bm: "Gaji Median" },
  "wages.tabMean":  { en: "Mean Wage",                                      bm: "Gaji Purata" },
  "wages.tabTrend": { en: "Trend",                                          bm: "Trend" },
  "wages.topEarner":{ en: "Highest paying",                                 bm: "Gaji tertinggi" },
  "wages.medianWage":{ en: "Median Wage",                                   bm: "Gaji Median" },
  "wages.meanWage": { en: "Mean Wage",                                      bm: "Gaji Purata" },
  "wages.trendDesc":{ en: "Median wage trend for top-paying industries",    bm: "Trend gaji median untuk industri bergaji tertinggi" },
  "wages.noData":   { en: "No wage data available",                         bm: "Tiada data gaji tersedia" },

  // Common — export
  "common.export":  { en: "Export PNG",                                     bm: "Eksport PNG" },

  // Job Market Health — missing/hardcoded
  "job.insightSectorIn": { en: "sector in", bm: "sektor di" },
  "job.insightShows": { en: "shows", bm: "menunjukkan" },
  "job.insightConditions": { en: "labour market conditions, with an adjusted unemployment rate of", bm: "keadaan pasaran buruh, dengan kadar pengangguran disesuaikan sebanyak" },
  "job.insightParticipation": { en: "and participation at", bm: "dan penyertaan pada" },
  "job.insightDrivenBy": { en: "This is driven by", bm: "Ini didorong oleh" },
  "job.suggestConsider": { en: "Consider", bm: "Pertimbangkan" },
  "job.suggestStrongestIn": { en: "— strongest growth trend in", bm: "— trend pertumbuhan terkuat di" },
  "job.suggestScoreLabel": { en: "score", bm: "skor" },
  "job.suggestSlowerIn": { en: "shows slower recovery in", bm: "menunjukkan pemulihan lebih perlahan di" },
  "job.suggestStable": { en: "sector has stable employment rates", bm: "sektor mempunyai kadar pekerjaan yang stabil" },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  toggleLang: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("dashboard-lang");
    return (saved === "bm" ? "bm" : "en") as Lang;
  });

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === "en" ? "bm" : "en";
      localStorage.setItem("dashboard-lang", next);
      return next;
    });
  }, []);

  const t = useCallback((key: string) => {
    return translations[key]?.[lang] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
