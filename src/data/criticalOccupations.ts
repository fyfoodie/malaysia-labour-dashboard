// ─────────────────────────────────────────────────────────────────────────────
// criticalOccupations.ts
//
// Authoritative reference data for the In-Demand Occupations section.
//
// Source: TalentCorp MyMahir Malaysia Critical Occupations List (MyCOL)
// 2024/2025, jointly compiled by TalentCorp and ILMIA under the Ministry
// of Human Resources (KESUMA).
//
//   https://www.talentcorp.com.my/mycol/
//   PDF: https://www.talentcorp.com.my/images/uploads/publication/204/
//        MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf
//
// Last verified: 30 Apr 2026
// ─────────────────────────────────────────────────────────────────────────────

export interface CriticalRole {
  title: string;
  isNew?: boolean;       // newly added to the 2024/2025 list
}

export interface CriticalSector {
  sector: string;
  emoji: string;
  color: string;         // accent color (hex)
  mascoGroup: string;    // dominant MASCO category for this sector cluster
  roles: CriticalRole[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TalentCorp MyCOL 2024/2025 , 66 critical occupations across 6 clusters
// ─────────────────────────────────────────────────────────────────────────────
export const myCOL = {
  edition:        "2024/2025",
  totalRoles:     66,
  previousTotal:  37,                // 2023 edition
  growthPercent:  78,                // 78% YoY increase
  publishedBy:    "TalentCorp · ILMIA · KESUMA",

  // MASCO composition (% of total nominations across all critical roles)
  mascoComposition: [
    { code: "MASCO 2",  category: "Professionals",                       percent: 31 },
    { code: "MASCO 3",  category: "Technicians & Associate Professionals", percent: 17 },
    { code: "MASCO 1",  category: "Managers",                            percent: 14 },
    { code: "MASCO 7",  category: "Craft & Related Trades",              percent: 12 },
    { code: "MASCO 8",  category: "Plant & Machine Operators",           percent: 11 },
    { code: "Other",    category: "Other Skilled Roles",                 percent: 15 },
  ],

  sectors: [
    {
      sector:     "Engineering & Manufacturing",
      emoji:      "⚙️",
      color:      "#f59e0b",
      mascoGroup: "MASCO 2, 3",
      roles: [
        { title: "Civil Engineers" },
        { title: "Mechanical Engineers" },
        { title: "Electrical Engineers" },
        { title: "Chemical Engineers" },
        { title: "Industrial Engineers" },
        { title: "Production Managers" },
        { title: "Draughtspersons", isNew: true },
        { title: "Surveying Technicians", isNew: true },
        { title: "Plant & Machine Operators" },
      ],
    },
    {
      sector:     "ICT & Digital",
      emoji:      "💻",
      color:      "#8b5cf6",
      mascoGroup: "MASCO 2",
      roles: [
        { title: "Software Developers" },
        { title: "Cybersecurity Professionals" },
        { title: "Data Scientists & Analysts" },
        { title: "Systems Analysts" },
        { title: "Cloud Engineers" },
        { title: "ICT Project Managers" },
        { title: "AI / Machine Learning Engineers", isNew: true },
      ],
    },
    {
      sector:     "Management & Business",
      emoji:      "💼",
      color:      "#3b82f6",
      mascoGroup: "MASCO 1",
      roles: [
        { title: "Managing Directors & Chief Executives" },
        { title: "Finance Managers" },
        { title: "Human Resources Managers" },
        { title: "Quality Control Managers" },
        { title: "Sales & Marketing Managers" },
        { title: "Supply Chain Managers" },
      ],
    },
    {
      sector:     "Healthcare",
      emoji:      "🏥",
      color:      "#ef4444",
      mascoGroup: "MASCO 2, 3",
      roles: [
        { title: "Specialist Medical Practitioners" },
        { title: "Registered Nurses" },
        { title: "Pharmacists", isNew: true },
        { title: "Physiotherapists", isNew: true },
        { title: "Medical Imaging Professionals" },
      ],
    },
    {
      sector:     "Creative & Digital Industries",
      emoji:      "🎨",
      color:      "#ec4899",
      mascoGroup: "MASCO 2, 3",
      roles: [
        { title: "Animators" },
        { title: "Visual Effects Artists" },
        { title: "Game Designers & Developers", isNew: true },
        { title: "Esports Professionals", isNew: true },
        { title: "UI / UX Designers" },
      ],
    },
    {
      sector:     "Science, R&D & Skilled Trades",
      emoji:      "🔬",
      color:      "#10b981",
      mascoGroup: "MASCO 2, 7",
      roles: [
        { title: "Chemists" },
        { title: "Actuaries" },
        { title: "Research & Development Professionals" },
        { title: "Welders" },
        { title: "Aircraft Maintenance Technicians" },
        { title: "Instrumentation Technicians" },
      ],
    },
  ] as CriticalSector[],
};

// ─────────────────────────────────────────────────────────────────────────────
// Source for citation in the SourceFooter
// ─────────────────────────────────────────────────────────────────────────────
export const dataSources = {
  myCOL: {
    name:      "TalentCorp MyMahir MyCOL 2024/2025",
    publisher: "TalentCorp, ILMIA, KESUMA",
    url:       "https://www.talentcorp.com.my/mycol/",
    pdfUrl:    "https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf",
  },
};
