// Real DOSM Data — Monthly Principal Labour Force Statistics
export interface MonthlyStats {
  date: string;
  month: string;
  year: number;
  labourForce: number;
  employed: number;
  unemployed: number;
  participationRate: number;
  unemploymentRate: number;
  employmentRate: number;
}

// Parse from main_data.csv
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const raw: [string,number,number,number,number,number][] = [
  ["1/1/2017",14908.5,14405.2,497.2,67.7,3.3],["1/2/2017",14906.1,14405.5,496.2,67.8,3.3],["1/3/2017",14908.1,14405.5,507.3,67.6,3.4],
  ["1/4/2017",14949.3,14438.2,515.6,67.8,3.4],["1/5/2017",14979.3,14465.3,513.5,67.9,3.4],["1/6/2017",15011.4,14496.7,512.6,67.7,3.4],
  ["1/7/2017",15032.2,14512.9,517.7,67.8,3.4],["1/8/2017",15009.4,14482.6,521.8,67.7,3.5],["1/9/2017",15054.6,14538.1,516.9,67.9,3.4],
  ["1/10/2017",15095.9,14580.1,517.2,68,3.4],["1/11/2017",15087.6,14571.1,518.9,68,3.4],["1/12/2017",15145,14649.4,502.7,68.1,3.3],
  ["1/1/2018",15216.2,14709.5,500.7,68.2,3.3],["1/2/2018",15216.8,14724.2,490.2,68.2,3.2],["1/3/2018",15215.2,14714.5,505.4,68.1,3.3],
  ["1/4/2018",15324,14815,512.8,68.4,3.3],["1/5/2018",15372.4,14860.2,511.3,68.5,3.3],["1/6/2018",15362.9,14839.6,521.4,68.5,3.4],
  ["1/7/2018",15422.1,14904,516.7,68.7,3.4],["1/8/2018",15397.5,14863.4,529.7,68.3,3.4],["1/9/2018",15443.4,14924.7,518.6,68.5,3.4],
  ["1/10/2018",15452.9,14932.8,522,68.5,3.4],["1/11/2018",15458.7,14930,529.8,68.4,3.4],["1/12/2018",15499.9,14996.8,510.7,68.4,3.3],
  ["1/1/2019",15503.1,15013.4,502.1,68.5,3.2],["1/2/2019",15525.9,15016,506.5,68.5,3.3],["1/3/2019",15556.1,15025.9,520,68.5,3.3],
  ["1/4/2019",15607.4,15092.9,527.6,68.5,3.4],["1/5/2019",15632.6,15111.9,526.2,68.5,3.4],["1/6/2019",15637.3,15116,524.7,68.6,3.4],
  ["1/7/2019",15705,15188.9,522.6,68.5,3.3],["1/8/2019",15708.8,15159.7,519.6,68.7,3.3],["1/9/2019",15754.5,15238.9,521.9,68.8,3.3],
  ["1/10/2019",15786.7,15275.4,517.2,68.8,3.3],["1/11/2019",15855.3,15323,522.6,69,3.3],["1/12/2019",15817.1,15303.4,516.6,68.9,3.3],
  ["1/1/2020",15825.8,15299.4,516.9,68.8,3.3],["1/2/2020",15849.8,15334.8,528.8,68.7,3.3],["1/3/2020",15864.3,15255.1,607.2,68.8,3.8],
  ["1/4/2020",15713.9,14943.7,765.7,68.2,4.9],["1/5/2020",15715.9,14895.9,815,68.1,5.2],["1/6/2020",15788.6,15008.4,754.8,68.2,4.8],
  ["1/7/2020",15818.8,15086.4,729.7,68.1,4.6],["1/8/2020",15889.1,15167.8,733.5,68.3,4.6],["1/9/2020",15920.9,15179.7,740.5,68.4,4.7],
  ["1/10/2020",15951.2,15189,764.1,68.4,4.8],["1/11/2020",15952.4,15183.8,784.1,68.4,4.9],["1/12/2020",15988.9,15194.2,795.6,68.4,5],
  ["1/1/2021",16016.3,15219.2,790.4,68.4,4.9],["1/2/2021",16028,15261,782.9,68.5,4.9],["1/3/2021",16104.2,15352.2,749.1,68.7,4.7],
  ["1/4/2021",16096.5,15362.6,730.2,68.6,4.5],["1/5/2021",16100.8,15379.1,718.3,68.6,4.5],["1/6/2021",16091.8,15316,750.4,68.4,4.7],
  ["1/7/2021",16073.2,15307.9,762.1,68.3,4.7],["1/8/2021",16119.3,15391.1,740.6,68.3,4.6],["1/9/2021",16182.7,15449.3,732.6,68.6,4.5],
  ["1/10/2021",16255.3,15536.1,720,68.8,4.4],["1/11/2021",16296.4,15597.7,712.3,68.9,4.4],["1/12/2021",16336.9,15626.9,707.8,68.9,4.3],
  ["1/1/2022",16350.3,15651.6,688.3,68.9,4.2],["1/2/2022",16392.6,15720.2,675.4,69.1,4.1],["1/3/2022",16437.2,15768.1,667.8,69.2,4.1],
  ["1/4/2022",16507.1,15866.5,640.6,69.5,3.9],["1/5/2022",16553.2,15921.7,631.6,69.6,3.8],["1/6/2022",16620.9,16034.8,603.9,69.8,3.6],
  ["1/7/2022",16611,15996.5,601.8,69.7,3.6],["1/8/2022",16647.2,16058,604.7,69.7,3.6],["1/9/2022",16640.1,16030.1,607.5,69.7,3.7],
  ["1/10/2022",16656.8,16033.7,618.8,69.6,3.7],["1/11/2022",16686.4,16063.3,620.1,69.7,3.7],["1/12/2022",16719.8,16097.7,622.2,69.7,3.7],
  ["1/1/2023",16739.7,16129,603.3,69.7,3.6],["1/2/2023",16770.6,16176.4,594.3,69.8,3.5],["1/3/2023",16804.5,16221.9,586.8,69.9,3.5],
  ["1/4/2023",16829.1,16250.4,582.9,69.9,3.5],["1/5/2023",16871.2,16293.3,578.5,70,3.4],["1/6/2023",16933.1,16381.7,560.3,70.2,3.3],
  ["1/7/2023",16942.3,16368.7,565.8,70.2,3.3],["1/8/2023",16960.9,16394.1,573.9,70.2,3.4],["1/9/2023",16948.3,16364.6,578,70.1,3.4],
  ["1/10/2023",16954.3,16369.2,583.4,70,3.4],["1/11/2023",16977.1,16392.1,581.9,70.1,3.4],["1/12/2023",17001.7,16424.9,580.1,70.1,3.4],
  ["1/1/2024",16785.8,16216.3,561.1,70.5,3.3],["1/2/2024",16820.1,16262.3,556.2,70.5,3.3],["1/3/2024",16848.6,16293.2,555.7,70.5,3.3],
  ["1/4/2024",16909.6,16356.7,556.6,70.6,3.3],["1/5/2024",16945.7,16393.5,552.6,70.6,3.3],["1/6/2024",16988.7,16464.4,542.6,70.7,3.2],
  ["1/7/2024",17012.8,16466.4,547.7,70.6,3.2],["1/8/2024",17051.3,16508.6,549.4,70.7,3.2],["1/9/2024",17073.3,16513.3,552.1,70.6,3.2],
  ["1/10/2024",17089.5,16527.5,552.7,70.5,3.2],["1/11/2024",17113.6,16563.7,547.1,70.5,3.2],["1/12/2024",17155.9,16612.5,541.7,70.5,3.2],
  ["1/1/2025",17228.5,16690.2,534,70.6,3.1],["1/2/2025",17285.9,16765.8,532.5,70.7,3.1],["1/3/2025",17342.6,16804.2,528.2,70.8,3],
  ["1/4/2025",17351.6,16821.3,526.3,70.7,3],["1/5/2025",17387.9,16865.6,523.1,70.7,3],["1/6/2025",17434.5,16932.4,516.1,70.8,3],
  ["1/7/2025",17470.7,16956.5,520,70.9,3],["1/8/2025",17498.6,16990.2,518.6,70.9,3],["1/9/2025",17530.6,17014.2,519.3,70.9,3],
  ["1/10/2025",17555.3,17032.3,521.1,70.9,3],["1/11/2025",17595.9,17055.7,520.2,71,3],["1/12/2025",17634.9,17111.4,518.3,70.9,2.9],
];

export const monthlyStats: MonthlyStats[] = raw.map(([d,lf,emp,unemp,pr,ur]) => {
  const parts = d.split("/");
  const m = parseInt(parts[1]) - 1;
  const y = parseInt(parts[2]);
  return {
    date: d, month: monthNames[m], year: y,
    labourForce: lf, employed: emp, unemployed: unemp,
    participationRate: pr, unemploymentRate: ur,
    employmentRate: +(100 - ur).toFixed(1),
  };
});

// Employment by Sector (yearly proportions, sex="both")
export interface SectorData {
  year: number;
  agriculture: number;
  industry: number;
  services: number;
}

export const sectorData: SectorData[] = [
  {year:2001,agriculture:15.1,industry:33.1,services:51.7},{year:2002,agriculture:14.9,industry:32,services:53.1},
  {year:2003,agriculture:14.3,industry:32,services:53.7},{year:2004,agriculture:14.6,industry:30.1,services:55.3},
  {year:2005,agriculture:14.6,industry:29.7,services:55.6},{year:2006,agriculture:14.6,industry:30.3,services:55.1},
  {year:2007,agriculture:14.8,industry:28.5,services:56.7},{year:2008,agriculture:14,industry:28.7,services:57.3},
  {year:2009,agriculture:13.5,industry:27,services:59.5},{year:2010,agriculture:13.6,industry:28.3,services:58.1},
  {year:2011,agriculture:11.5,industry:29.1,services:59.4},{year:2012,agriculture:12.7,industry:28.6,services:58.7},
  {year:2013,agriculture:13,industry:28.4,services:58.7},{year:2014,agriculture:12.2,industry:28,services:59.7},
  {year:2015,agriculture:12.5,industry:27.5,services:60},{year:2016,agriculture:11.4,industry:27.5,services:61.1},
  {year:2017,agriculture:11.3,industry:27.7,services:61},{year:2018,agriculture:10.6,industry:27.1,services:62.4},
  {year:2019,agriculture:10.2,industry:28,services:61.8},{year:2020,agriculture:10.5,industry:25.1,services:64.4},
  {year:2021,agriculture:10.8,industry:25.4,services:63.8},{year:2022,agriculture:10.8,industry:25.4,services:63.8},
];

// Sector data by sex for detailed view
export interface SectorBySex {
  year: number;
  sector: string;
  male: number;
  female: number;
  both: number;
}

// Underemployment by Sex (quarterly, rate only)
export interface UnderemploymentBySex {
  date: string;
  quarter: string;
  year: number;
  overall: number;
  male: number;
  female: number;
}

const underSexRaw: [string,number,number,number][] = [
  ["1/1/2017",1.5,1.2,1.9],["1/4/2017",1.4,1.1,1.8],["1/7/2017",1.6,1.2,2.1],["1/10/2017",1.6,1.3,2.2],
  ["1/1/2018",1.7,1.1,2.5],["1/4/2018",1.6,1.2,2.2],["1/7/2018",1.6,1.3,2.1],["1/10/2018",1.4,1,2],
  ["1/1/2019",1.4,1.1,1.9],["1/4/2019",1.4,1.2,1.6],["1/7/2019",1.2,0.8,1.8],["1/10/2019",1.1,0.7,1.7],
  ["1/1/2020",2.5,2,3.4],["1/4/2020",2.8,2.8,2.7],["1/7/2020",2,1.1,3.4],["1/10/2020",2.4,2.9,1.7],
  ["1/1/2021",2,2.4,1.4],["1/4/2021",2.2,2.5,1.6],["1/7/2021",2.1,2.5,1.6],["1/10/2021",1.9,1.1,3.2],
  ["1/1/2022",1.6,0.7,2.9],["1/4/2022",1.4,1.2,1.7],["1/7/2022",1.2,1,1.5],["1/10/2022",1.1,0.8,1.4],
  ["1/1/2023",1.1,0.8,1.5],["1/4/2023",1.2,0.9,1.6],["1/7/2023",1.2,0.9,1.6],["1/10/2023",1.1,0.8,1.6],
  ["1/1/2024",1,0.8,1.4],["1/4/2024",1,0.7,1.4],["1/7/2024",0.9,0.7,1.3],["1/10/2024",0.9,0.7,1.3],
  ["1/1/2025",0.9,0.7,1.3],["1/4/2025",0.8,0.6,1.2],["1/7/2025",0.8,0.6,1.1],
];

const quarterMap: Record<string, string> = {"1":"Q1","4":"Q2","7":"Q3","10":"Q4"};

export const underemploymentBySex: UnderemploymentBySex[] = underSexRaw.map(([d,o,m,f]) => {
  const parts = d.split("/");
  return {
    date: d,
    quarter: quarterMap[parts[1]] || "Q1",
    year: parseInt(parts[2]),
    overall: o, male: m, female: f,
  };
});

// Underemployment by Age (quarterly, rate only)
export interface UnderemploymentByAge {
  date: string;
  quarter: string;
  year: number;
  overall: number;
  age15_24: number;
  age25_34: number;
  age35_44: number;
  age45plus: number;
}

const underAgeRaw: [string,number,number,number,number,number][] = [
  ["1/1/2017",29.9,63.3,31.3,20.8,17.9],["1/4/2017",31.8,65.3,32.8,22,20.6],["1/7/2017",31.4,62.9,34.1,21.7,18.4],["1/10/2017",32.7,63.4,34.6,24.8,19.2],
  ["1/1/2018",32.5,63.7,34.7,24.2,19.9],["1/4/2018",33.2,66,36.6,23.2,19.2],["1/7/2018",33.4,65.1,35.1,24,19.7],["1/10/2018",32.8,66,36.2,21,19.6],
  ["1/1/2019",32.9,64.2,36.1,21.6,22],["1/4/2019",32.8,67.1,35.8,22.6,19],["1/7/2019",34.3,66.6,37,22.9,21.7],["1/10/2019",34.8,63.6,38.2,24.6,21.7],
  ["1/1/2020",36.2,68.9,40,25.4,23.9],["1/4/2020",36.5,69.2,37,27.2,27.3],["1/7/2020",36.8,72.2,42.1,26.2,20.2],["1/10/2020",37.4,68.8,41.3,30.3,23.1],
  ["1/1/2021",37.9,71.8,44.4,27.3,20.8],["1/4/2021",37.7,69,39.6,30.3,29.6],["1/7/2021",37.7,72.6,43.3,27.4,21.5],["1/10/2021",37.5,68.9,44.8,29.2,24],
  ["1/1/2022",36.9,69.6,42.2,29.3,20.1],["1/4/2022",36.7,58.1,41.2,30.4,22.9],["1/7/2022",36.8,74,43.1,28,20.5],["1/10/2022",37.4,75.3,46.3,28.6,18.8],
  ["1/1/2023",37.4,73.4,43.2,29.7,19.9],["1/4/2023",37.4,69.9,43.3,28.4,19.9],["1/7/2023",37.3,77.2,41.6,28.5,21.7],["1/10/2023",37.4,80,41.6,29.5,21.8],
  ["1/1/2024",36.4,69.1,41.3,28.7,26.5],["1/4/2024",36.2,66.2,39.5,31.3,22.1],["1/7/2024",36,65.1,41.3,28.1,23],["1/10/2024",35.8,67.9,38.9,27.1,29.9],
  ["1/1/2025",35.7,70.7,40.3,28,23.1],["1/4/2025",35.6,74.4,40.9,28.3,18.7],["1/7/2025",35.5,74.3,41,24.9,22.1],
];

export const underemploymentByAge: UnderemploymentByAge[] = underAgeRaw.map(([d,o,a1,a2,a3,a4]) => {
  const parts = d.split("/");
  return {
    date: d,
    quarter: quarterMap[parts[1]] || "Q1",
    year: parseInt(parts[2]),
    overall: o, age15_24: a1, age25_34: a2, age35_44: a3, age45plus: a4,
  };
});

// Labour Force by State (quarterly)
export interface StateData {
  date: string;
  state: string;
  quarter: string;
  year: number;
  labourForce: number;
  employed: number;
  unemployed: number;
  participationRate: number;
  unemploymentRate: number;
}

// Latest available data per state (Q3 2025)
const stateRaw: [string,string,number,number,number,number,number][] = [
  // Q3 2025 (latest)
  ["1/7/2025","Johor",2206.3,2150.2,56.2,71.8,2.5],
  ["1/7/2025","Kedah",1002.7,978.2,24.5,66.1,2.4],
  ["1/7/2025","Kelantan",752.1,717.8,34.4,59.8,4.6],
  ["1/7/2025","Melaka",534.6,521.6,13,69.2,2.4],
  ["1/7/2025","Negeri Sembilan",585.1,567.8,17.3,67.4,3],
  ["1/7/2025","Pahang",788.8,775,13.8,66,1.7],
  ["1/7/2025","Pulau Pinang",960.4,934.2,26.2,71.3,2.7],
  ["1/7/2025","Perak",1224.8,1179.5,45.3,67.7,3.7],
  ["1/7/2025","Perlis",137.4,133,4.4,63,3.2],
  ["1/7/2025","Selangor",4209.5,4132,77.5,78.2,1.8],
  ["1/7/2025","Terengganu",507.6,493,14.6,60.8,2.9],
  ["1/7/2025","Sabah",1950.2,1839.9,110.3,70.5,5.7],
  ["1/7/2025","Sarawak",1258.3,1219.7,38.6,69.5,3.1],
  ["1/7/2025","W.P. Kuala Lumpur",1259.8,1218.9,40.9,75.6,3.2],
  ["1/7/2025","W.P. Labuan",46.6,44.4,2.2,66.3,4.7],
  ["1/7/2025","W.P. Putrajaya",62.2,61.3,0.9,77.8,1.4],
];

export const latestStateData: StateData[] = stateRaw.map(([d,state,lf,emp,unemp,pr,ur]) => ({
  date: d as string,
  state: state as string,
  quarter: "Q3",
  year: 2025,
  labourForce: lf as number,
  employed: emp as number,
  unemployed: unemp as number,
  participationRate: pr as number,
  unemploymentRate: ur as number,
}));

// All historical state data for time series
const allStateRaw: [string,string,number,number,number,number,number][] = [
  // Johor
  ["1/1/2017","Johor",1685.8,1634.6,51.2,67.4,3],["1/4/2017","Johor",1675.2,1616,59.2,67,3.5],["1/7/2017","Johor",1675.4,1607.7,67.7,66.9,4],["1/10/2017","Johor",1684.4,1632.6,51.8,67.1,3.1],
  ["1/1/2018","Johor",1740.3,1691.7,48.6,68.9,2.8],["1/4/2018","Johor",1756.2,1703.5,52.7,69.1,3],["1/7/2018","Johor",1771.6,1713.1,58.4,69.8,3.3],["1/10/2018","Johor",1788.1,1739,49.1,70.1,2.7],
  ["1/1/2023","Johor",1878.7,1830.1,48.6,69.8,2.6],["1/4/2023","Johor",1884.6,1838.7,46,69.9,2.4],["1/7/2023","Johor",1910.2,1863.2,47,70.6,2.5],["1/10/2023","Johor",1936.4,1891.8,44.6,71.1,2.3],
  ["1/1/2024","Johor",2101.6,2055.1,46.5,71.1,2.2],["1/4/2024","Johor",2114.8,2067.6,47.2,71.6,2.2],["1/7/2024","Johor",2135.9,2088.3,47.6,71.6,2.2],["1/10/2024","Johor",2161.6,2110.1,51.6,71.8,2.4],
  ["1/1/2025","Johor",2174.3,2124.5,49.9,71.7,2.3],["1/4/2025","Johor",2182.7,2129.5,53.1,71.8,2.4],["1/7/2025","Johor",2206.3,2150.2,56.2,71.8,2.5],
  // Selangor
  ["1/1/2023","Selangor",3850.6,3750.9,99.7,76.5,2.6],["1/4/2023","Selangor",3886.6,3791.3,95.3,77.1,2.5],["1/7/2023","Selangor",3904.1,3814.4,89.7,77,2.3],["1/10/2023","Selangor",3901.2,3813.2,88,76.2,2.3],
  ["1/1/2024","Selangor",4021.2,3926.8,94.4,77,2.3],["1/4/2024","Selangor",4045.4,3937,108.5,76.6,2.7],["1/7/2024","Selangor",4123,4018.4,104.6,76.7,2.5],["1/10/2024","Selangor",4120.3,4039.6,80.7,77.4,2],
  ["1/1/2025","Selangor",4151.6,4061.1,90.4,77.9,2.2],["1/4/2025","Selangor",4182.5,4101.4,81.1,78,1.9],["1/7/2025","Selangor",4209.5,4132,77.5,78.2,1.8],
  // Sabah
  ["1/1/2023","Sabah",2198,2028.2,169.8,70.6,7.7],["1/4/2023","Sabah",2203.7,2038.1,165.6,70.8,7.5],["1/7/2023","Sabah",2211.5,2045.2,166.3,70.6,7.5],["1/10/2023","Sabah",2226.9,2061.2,165.6,70.7,7.4],
  ["1/1/2024","Sabah",1818.7,1674.2,144.5,70.2,7.9],["1/4/2024","Sabah",1849.7,1710.1,139.7,71,7.5],["1/7/2024","Sabah",1861.1,1720.2,140.9,71.4,7.6],["1/10/2024","Sabah",1887.3,1750.7,136.6,70.9,7.2],
  ["1/1/2025","Sabah",1902.4,1775.8,126.6,70.4,6.7],["1/4/2025","Sabah",1933.4,1813.1,120.3,70.4,6.2],["1/7/2025","Sabah",1950.2,1839.9,110.3,70.5,5.7],
];

export const allStateData: StateData[] = allStateRaw.map(([d,state,lf,emp,unemp,pr,ur]) => {
  const parts = (d as string).split("/");
  const q = quarterMap[parts[1]] || "Q1";
  return {
    date: d as string, state: state as string, quarter: q,
    year: parseInt(parts[2]),
    labourForce: lf as number, employed: emp as number, unemployed: unemp as number,
    participationRate: pr as number, unemploymentRate: ur as number,
  };
});

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
      participationRate: +(latest.participationRate - previous.participationRate).toFixed(1),
    },
  };
};

// In-Demand Occupations data
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

// Regional Job Opportunities data
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
