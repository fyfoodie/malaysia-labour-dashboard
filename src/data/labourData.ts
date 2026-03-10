// Monthly Principal Labour Force Statistics (Seasonally Adjusted)
export interface MonthlyStats {
  date: string;
  month: string;
  year: number;
  employmentRate: number;
  unemploymentRate: number;
  lfpr: number; // Labour Force Participation Rate
  labourForce: number; // in thousands
  employed: number;
  unemployed: number;
}

export const monthlyStats: MonthlyStats[] = [
  { date: "2023-01", month: "Jan", year: 2023, employmentRate: 96.5, unemploymentRate: 3.5, lfpr: 69.3, labourForce: 16450, employed: 15873, unemployed: 577 },
  { date: "2023-02", month: "Feb", year: 2023, employmentRate: 96.5, unemploymentRate: 3.5, lfpr: 69.4, labourForce: 16480, employed: 15903, unemployed: 577 },
  { date: "2023-03", month: "Mar", year: 2023, employmentRate: 96.6, unemploymentRate: 3.4, lfpr: 69.5, labourForce: 16520, employed: 15958, unemployed: 562 },
  { date: "2023-04", month: "Apr", year: 2023, employmentRate: 96.6, unemploymentRate: 3.4, lfpr: 69.5, labourForce: 16540, employed: 15977, unemployed: 563 },
  { date: "2023-05", month: "May", year: 2023, employmentRate: 96.6, unemploymentRate: 3.4, lfpr: 69.6, labourForce: 16570, employed: 16007, unemployed: 563 },
  { date: "2023-06", month: "Jun", year: 2023, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 69.7, labourForce: 16600, employed: 16052, unemployed: 548 },
  { date: "2023-07", month: "Jul", year: 2023, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 69.7, labourForce: 16620, employed: 16071, unemployed: 549 },
  { date: "2023-08", month: "Aug", year: 2023, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 69.8, labourForce: 16650, employed: 16101, unemployed: 549 },
  { date: "2023-09", month: "Sep", year: 2023, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 69.8, labourForce: 16670, employed: 16120, unemployed: 550 },
  { date: "2023-10", month: "Oct", year: 2023, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 69.9, labourForce: 16700, employed: 16149, unemployed: 551 },
  { date: "2023-11", month: "Nov", year: 2023, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 69.9, labourForce: 16720, employed: 16168, unemployed: 552 },
  { date: "2023-12", month: "Dec", year: 2023, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 70.0, labourForce: 16750, employed: 16197, unemployed: 553 },
  { date: "2024-01", month: "Jan", year: 2024, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 70.1, labourForce: 16800, employed: 16246, unemployed: 554 },
  { date: "2024-02", month: "Feb", year: 2024, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 70.1, labourForce: 16820, employed: 16265, unemployed: 555 },
  { date: "2024-03", month: "Mar", year: 2024, employmentRate: 96.7, unemploymentRate: 3.3, lfpr: 70.2, labourForce: 16850, employed: 16294, unemployed: 556 },
  { date: "2024-04", month: "Apr", year: 2024, employmentRate: 96.8, unemploymentRate: 3.2, lfpr: 70.2, labourForce: 16870, employed: 16330, unemployed: 540 },
  { date: "2024-05", month: "May", year: 2024, employmentRate: 96.8, unemploymentRate: 3.2, lfpr: 70.3, labourForce: 16900, employed: 16359, unemployed: 541 },
  { date: "2024-06", month: "Jun", year: 2024, employmentRate: 96.8, unemploymentRate: 3.2, lfpr: 70.3, labourForce: 16920, employed: 16378, unemployed: 542 },
  { date: "2024-07", month: "Jul", year: 2024, employmentRate: 96.8, unemploymentRate: 3.2, lfpr: 70.4, labourForce: 16950, employed: 16407, unemployed: 543 },
  { date: "2024-08", month: "Aug", year: 2024, employmentRate: 96.9, unemploymentRate: 3.1, lfpr: 70.4, labourForce: 16970, employed: 16444, unemployed: 526 },
  { date: "2024-09", month: "Sep", year: 2024, employmentRate: 96.9, unemploymentRate: 3.1, lfpr: 70.5, labourForce: 17000, employed: 16473, unemployed: 527 },
  { date: "2024-10", month: "Oct", year: 2024, employmentRate: 96.9, unemploymentRate: 3.1, lfpr: 70.5, labourForce: 17020, employed: 16492, unemployed: 528 },
  { date: "2024-11", month: "Nov", year: 2024, employmentRate: 96.9, unemploymentRate: 3.1, lfpr: 70.6, labourForce: 17050, employed: 16521, unemployed: 529 },
  { date: "2024-12", month: "Dec", year: 2024, employmentRate: 96.9, unemploymentRate: 3.1, lfpr: 70.6, labourForce: 17070, employed: 16541, unemployed: 529 },
];

// Employment by Sector
export interface SectorData {
  sector: string;
  employed: number; // in thousands
  percentage: number;
  year: number;
}

export const sectorData2024: SectorData[] = [
  { sector: "Services", employed: 9850, percentage: 59.6, year: 2024 },
  { sector: "Manufacturing", employed: 2830, percentage: 17.1, year: 2024 },
  { sector: "Agriculture", employed: 1640, percentage: 9.9, year: 2024 },
  { sector: "Construction", employed: 1380, percentage: 8.3, year: 2024 },
  { sector: "Mining & Quarrying", employed: 130, percentage: 0.8, year: 2024 },
  { sector: "Others", employed: 711, percentage: 4.3, year: 2024 },
];

export const sectorData2023: SectorData[] = [
  { sector: "Services", employed: 9620, percentage: 59.4, year: 2023 },
  { sector: "Manufacturing", employed: 2790, percentage: 17.2, year: 2023 },
  { sector: "Agriculture", employed: 1650, percentage: 10.2, year: 2023 },
  { sector: "Construction", employed: 1320, percentage: 8.1, year: 2023 },
  { sector: "Mining & Quarrying", employed: 125, percentage: 0.8, year: 2023 },
  { sector: "Others", employed: 692, percentage: 4.3, year: 2023 },
];

// Underemployment by Sex (Quarterly)
export interface UnderemploymentBySex {
  quarter: string;
  year: number;
  male: number;
  female: number;
  total: number;
}

export const underemploymentBySex: UnderemploymentBySex[] = [
  { quarter: "Q1", year: 2023, male: 2.8, female: 3.5, total: 3.1 },
  { quarter: "Q2", year: 2023, male: 2.7, female: 3.4, total: 3.0 },
  { quarter: "Q3", year: 2023, male: 2.6, female: 3.3, total: 2.9 },
  { quarter: "Q4", year: 2023, male: 2.5, female: 3.2, total: 2.8 },
  { quarter: "Q1", year: 2024, male: 2.5, female: 3.1, total: 2.7 },
  { quarter: "Q2", year: 2024, male: 2.4, female: 3.0, total: 2.6 },
  { quarter: "Q3", year: 2024, male: 2.3, female: 2.9, total: 2.5 },
  { quarter: "Q4", year: 2024, male: 2.3, female: 2.8, total: 2.5 },
];

// Underemployment by Age (Quarterly)
export interface UnderemploymentByAge {
  quarter: string;
  year: number;
  age15_24: number;
  age25_34: number;
  age35_44: number;
  age45_54: number;
  age55_64: number;
}

export const underemploymentByAge: UnderemploymentByAge[] = [
  { quarter: "Q1", year: 2023, age15_24: 8.2, age25_34: 3.1, age35_44: 1.8, age45_54: 1.5, age55_64: 2.1 },
  { quarter: "Q2", year: 2023, age15_24: 7.9, age25_34: 3.0, age35_44: 1.7, age45_54: 1.4, age55_64: 2.0 },
  { quarter: "Q3", year: 2023, age15_24: 7.7, age25_34: 2.9, age35_44: 1.7, age45_54: 1.4, age55_64: 1.9 },
  { quarter: "Q4", year: 2023, age15_24: 7.5, age25_34: 2.8, age35_44: 1.6, age45_54: 1.3, age55_64: 1.9 },
  { quarter: "Q1", year: 2024, age15_24: 7.3, age25_34: 2.7, age35_44: 1.6, age45_54: 1.3, age55_64: 1.8 },
  { quarter: "Q2", year: 2024, age15_24: 7.1, age25_34: 2.6, age35_44: 1.5, age45_54: 1.2, age55_64: 1.8 },
  { quarter: "Q3", year: 2024, age15_24: 6.9, age25_34: 2.5, age35_44: 1.5, age45_54: 1.2, age55_64: 1.7 },
  { quarter: "Q4", year: 2024, age15_24: 6.8, age25_34: 2.5, age35_44: 1.4, age45_54: 1.1, age55_64: 1.7 },
];

// Labour Force by State (Quarterly)
export interface StateData {
  state: string;
  stateCode: string;
  labourForce: number;
  employed: number;
  unemployed: number;
  unemploymentRate: number;
  lfpr: number;
  quarter: string;
  year: number;
}

export const stateDataQ4_2024: StateData[] = [
  { state: "Selangor", stateCode: "SGR", labourForce: 3850, employed: 3732, unemployed: 118, unemploymentRate: 3.1, lfpr: 72.5, quarter: "Q4", year: 2024 },
  { state: "Johor", stateCode: "JHR", labourForce: 1920, employed: 1860, unemployed: 60, unemploymentRate: 3.1, lfpr: 70.8, quarter: "Q4", year: 2024 },
  { state: "Perak", stateCode: "PRK", labourForce: 1180, employed: 1144, unemployed: 36, unemploymentRate: 3.0, lfpr: 66.2, quarter: "Q4", year: 2024 },
  { state: "Sabah", stateCode: "SBH", labourForce: 1750, employed: 1662, unemployed: 88, unemploymentRate: 5.0, lfpr: 67.1, quarter: "Q4", year: 2024 },
  { state: "Sarawak", stateCode: "SWK", labourForce: 1350, employed: 1310, unemployed: 40, unemploymentRate: 3.0, lfpr: 68.3, quarter: "Q4", year: 2024 },
  { state: "Pulau Pinang", stateCode: "PNG", labourForce: 910, employed: 885, unemployed: 25, unemploymentRate: 2.7, lfpr: 71.4, quarter: "Q4", year: 2024 },
  { state: "Kedah", stateCode: "KDH", labourForce: 980, employed: 948, unemployed: 32, unemploymentRate: 3.3, lfpr: 66.8, quarter: "Q4", year: 2024 },
  { state: "Kelantan", stateCode: "KTN", labourForce: 720, employed: 690, unemployed: 30, unemploymentRate: 4.2, lfpr: 62.5, quarter: "Q4", year: 2024 },
  { state: "Pahang", stateCode: "PHG", labourForce: 790, employed: 768, unemployed: 22, unemploymentRate: 2.8, lfpr: 67.9, quarter: "Q4", year: 2024 },
  { state: "Terengganu", stateCode: "TRG", labourForce: 540, employed: 519, unemployed: 21, unemploymentRate: 3.9, lfpr: 63.7, quarter: "Q4", year: 2024 },
  { state: "Negeri Sembilan", stateCode: "NSN", labourForce: 560, employed: 544, unemployed: 16, unemploymentRate: 2.9, lfpr: 69.5, quarter: "Q4", year: 2024 },
  { state: "Melaka", stateCode: "MLK", labourForce: 470, employed: 457, unemployed: 13, unemploymentRate: 2.8, lfpr: 70.2, quarter: "Q4", year: 2024 },
  { state: "Perlis", stateCode: "PLS", labourForce: 120, employed: 116, unemployed: 4, unemploymentRate: 3.3, lfpr: 65.1, quarter: "Q4", year: 2024 },
  { state: "W.P. Kuala Lumpur", stateCode: "KUL", labourForce: 1050, employed: 1020, unemployed: 30, unemploymentRate: 2.9, lfpr: 73.8, quarter: "Q4", year: 2024 },
  { state: "W.P. Putrajaya", stateCode: "PJY", labourForce: 55, employed: 54, unemployed: 1, unemploymentRate: 1.8, lfpr: 75.2, quarter: "Q4", year: 2024 },
  { state: "W.P. Labuan", stateCode: "LBN", labourForce: 48, employed: 45, unemployed: 3, unemploymentRate: 6.3, lfpr: 68.5, quarter: "Q4", year: 2024 },
];

// Helper to get latest stats
export const getLatestStats = () => {
  const latest = monthlyStats[monthlyStats.length - 1];
  const previous = monthlyStats[monthlyStats.length - 2];
  return {
    latest,
    previous,
    changes: {
      employmentRate: +(latest.employmentRate - previous.employmentRate).toFixed(1),
      unemploymentRate: +(latest.unemploymentRate - previous.unemploymentRate).toFixed(1),
      lfpr: +(latest.lfpr - previous.lfpr).toFixed(1),
    },
  };
};
