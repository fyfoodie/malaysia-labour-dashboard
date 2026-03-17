export interface LabourData {
  national: any[];
  youth: any[];
  duration: any[];
  sectors: any[];
  state: any[];
  underemployment: any[];
  productivity: any[];
  cpi: any[];
  gdp: any[];
  mismatch: any[];
  wages: any[];
  wagesByIndustry: any[];
}

async function fetchWithRetry(url: string, retries = 3): Promise<any[]> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      }
      console.warn(`DOSM API status ${res.status} for ${url}`);
    } catch (err) {
      console.warn(`Attempt ${i + 1} failed for ${url}`);
      if (i === retries - 1) return [];
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  return [];
}

function normaliseNational(rows: any[]): any[] {
  return rows.map(d => ({
    ...d,
    employed:        d.lf_employed   ?? d.employed   ?? 0,
    unemployed:      d.lf_unemployed ?? d.unemployed ?? 0,
    employment_rate: d.ep_ratio      ?? d.employment_rate ?? +(100 - (d.u_rate ?? 0)).toFixed(1),
  }));
}

function normaliseState(rows: any[]): any[] {
  return rows.map(d => ({
    ...d,
    employed:   d.lf_employed   ?? d.employed   ?? 0,
    unemployed: d.lf_unemployed ?? d.unemployed ?? 0,
  }));
}

export async function fetchAllLabourData(): Promise<LabourData | null> {
  try {
    const DOSM = "https://api.data.gov.my/data-catalogue";
    const proxy = (id: string, limit: number) =>
      `https://corsproxy.io/?${encodeURIComponent(`${DOSM}?id=${id}&limit=${limit}`)}`;

    const requests = [
      fetchWithRetry(proxy("lfs_month", 2000)),
      fetchWithRetry(proxy("lfs_month_youth", 500)),
      fetchWithRetry(proxy("lfs_month_duration", 500)),
      fetchWithRetry(proxy("lfs_qtr_state", 2000)),
      fetchWithRetry(proxy("lfs_qtr_sru_sex", 500)),
      fetchWithRetry(proxy("lfs_qtr_sru_age", 500)),
      fetchWithRetry(proxy("employment_sector", 500)),
      fetchWithRetry(proxy("hh_income", 100)),
    ];

    const responses = await Promise.all(requests);

    return {
      national:        normaliseNational(responses[0]),
      youth:           responses[1],
      duration:        responses[2],
      sectors:         responses[6],
      state:           normaliseState(responses[3]),
      underemployment: responses[5],
      productivity:    [],
      cpi:             [],
      gdp:             [],
      mismatch:        responses[4],
      wages:           responses[7],
      wagesByIndustry: [],
    };
  } catch (error) {
    console.error("Critical Main API Error:", error);
    return null;
  }
}

export const inDemandOccupations = [
  { occupation: "Banking & Finance", salary: 160000 },
  { occupation: "Information Technology", salary: 150000 },
  { occupation: "Healthcare", salary: 140000 },
  { occupation: "Engineering", salary: 120000 },
  { occupation: "Marketing & Sales", salary: 110000 },
  { occupation: "Nursing", salary: 110000 },
  { occupation: "Teachers", salary: 100000 },
  { occupation: "Hospitality", salary: 95000 },
  { occupation: "Skilled Trades", salary: 95000 },
];

export const regionalJobs = [
  { state: "Kuala Lumpur", demand: "High demand in IT, finance, digital roles", salaryMin: 70000, salaryMax: 150000 },
  { state: "Selangor", demand: "High demand in manufacturing, logistics, engineering", salaryMin: 60000, salaryMax: 120000 },
  { state: "Penang", demand: "Very high demand in electronics, semiconductors, engineering", salaryMin: 65000, salaryMax: 140000 },
  { state: "Johor", demand: "Growing demand in manufacturing, logistics, operations", salaryMin: 55000, salaryMax: 110000 },
  { state: "Sarawak", demand: "Demand in energy, construction, oil & gas", salaryMin: 50000, salaryMax: 100000 },
  { state: "Sabah", demand: "Demand in tourism, construction, services", salaryMin: 45000, salaryMax: 90000 },
  { state: "Perak", demand: "Demand in education, manufacturing, healthcare", salaryMin: 45000, salaryMax: 85000 },
  { state: "Melaka", demand: "Demand in electronics, hospitality, logistics", salaryMin: 45000, salaryMax: 90000 },
  { state: "Negeri Sembilan", demand: "Steady demand in manufacturing, logistics", salaryMin: 48000, salaryMax: 95000 },
];

export const latestStateData = [
  { state: "Johor",            u_rate: 2.1, p_rate: 68.2 },
  { state: "Kedah",            u_rate: 3.2, p_rate: 65.1 },
  { state: "Kelantan",         u_rate: 3.8, p_rate: 60.4 },
  { state: "Melaka",           u_rate: 1.9, p_rate: 70.1 },
  { state: "Negeri Sembilan",  u_rate: 2.0, p_rate: 69.8 },
  { state: "Pahang",           u_rate: 2.5, p_rate: 64.3 },
  { state: "Perak",            u_rate: 2.8, p_rate: 63.7 },
  { state: "Perlis",           u_rate: 2.6, p_rate: 62.9 },
  { state: "Pulau Pinang",     u_rate: 2.2, p_rate: 71.3 },
  { state: "Sabah",            u_rate: 5.7, p_rate: 62.1 },
  { state: "Sarawak",          u_rate: 2.3, p_rate: 66.8 },
  { state: "Selangor",         u_rate: 1.8, p_rate: 73.2 },
  { state: "Terengganu",       u_rate: 2.9, p_rate: 61.5 },
  { state: "W.P. Kuala Lumpur",u_rate: 2.4, p_rate: 75.1 },
  { state: "W.P. Labuan",      u_rate: 3.1, p_rate: 67.4 },
  { state: "W.P. Putrajaya",   u_rate: 1.4, p_rate: 74.2 },
];
