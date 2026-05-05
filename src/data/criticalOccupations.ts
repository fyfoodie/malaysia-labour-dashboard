// ─────────────────────────────────────────────────────────────────────────────
// criticalOccupations.ts
//
// Source: TalentCorp MyMahir Malaysia Critical Occupations List (MyCOL)
// Multi-edition data covering four published editions:
//   • 2019/2020 (58 roles, published 28 Feb 2020 by CSC)
//   • 2020/2021 (42 roles, published 30 Dec 2021 by CSC)
//   • 2022/2023 (37 roles, published  5 Apr 2023 by TalentCorp · ILMIA)
//   • 2024/2025 (66 roles, published 2025 by TalentCorp · ILMIA · KESUMA)
//
// Edition lineage joined by MASCO 4-Digit code (the only stable identifier
// across editions — titles drift, MASCO codes do not).
//
// Source URLs:
//   https://www.talentcorp.com.my/mycol/
//   2024/2025 PDF: https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf
//   2022/2023 PDF: https://www.talentcorp.com.my/images/uploads/publication/3/Critical-Occupations-List-MyCOL-20222023-1695267153.pdf
//   2020/2021 PDF: https://www.talentcorp.com.my/images/uploads/publication/184/Critical-Occupations-List-20202021-1704364685.pdf
//   2019/2020 PDF: https://www.talentcorp.com.my/images/uploads/publication/178/Critical-Occupations-List-20192020-1704364278.pdf
//
// Last updated: 4 May 2026
// ─────────────────────────────────────────────────────────────────────────────


/* ═══════════════════════════════════════════════════════════════════════════
   FUTURE-EXTRACTION PROMPT
   ═══════════════════════════════════════════════════════════════════════════
   Use this prompt verbatim whenever a new MyCOL edition is released.
   Paste the new MyCOL PDF into a Claude conversation alongside this prompt.
   The prompt is deliberately strict so the output stays consistent year over year.
   ───────────────────────────────────────────────────────────────────────────

   ROLE
   You are extracting structured data from the official Malaysia Critical
   Occupations List (MyCOL) PDF, published by TalentCorp under the Ministry
   of Human Resources (KESUMA). The output replaces this `criticalOccupations.ts`
   file in a public-facing labour market dashboard. Accuracy is non-negotiable.

   STEP 1 — READ THE FULL PDF FIRST, NEVER SKIP
   Read every page in order before writing any code. Do not skim. Note in
   particular:
     • Cover page (edition label exactly as printed, e.g. "2024/2025")
     • Executive Summary (stated total role count, previous edition's total,
       % growth, named publishers, count and names of explicitly NEW roles)
     • Master role list (typically titled "The Critical Occupations List
       (MyCOL) [edition]" or "Full List (N Occupations)") — this is the
       canonical source of MASCO 4-digit codes and official titles
     • Methodology section (note any change in selection criteria or
       skill-level scope vs prior editions)
     • Footnotes, asterisks, "NEW" markers next to any role
   Count the roles yourself after reading. Cross-check against the executive
   summary stated total. If the count differs, recount before continuing.

   STEP 2 — EDITION METADATA
   Extract:
     • `edition`           — string exactly as printed ("2024/2025")
     • `totalRoles`        — integer (must match your re-count)
     • `previousTotal`     — integer from the comparison statement
     • `growthPercent`     — round((current − previous) / previous × 100)
     • `publishedBy`       — bullet-separated list of credited bodies
                             (e.g. "TalentCorp · ILMIA · KESUMA").
                             NEVER include DOSM — DOSM does not publish MyCOL.
     • `pdfUrl`            — direct PDF URL from talentcorp.com.my

   STEP 3 — MASCO COMPOSITION
   Count the master list yourself by MASCO 1-digit major group:
     1 Managers · 2 Professionals · 3 Technicians and Associate Professionals
     4 Clerical Support Workers · 5 Service and Sales Workers
     6 Skilled Agricultural / Forestry / Fishery Workers
     7 Craft and Related Trades Workers
     8 Plant and Machine Operators and Assemblers
   Compute each major group's share as count/total × 100, rounded to one
   decimal. Sum must be 100 ± 0.5. If rounding produces 99.9 or 100.1, leave
   it and add a comment on the last entry explaining the rounding remainder.
   Use the exact official category names as listed above.

   STEP 4 — ROLES: PRESERVE MASCO 4D CODES, SHORTEN TITLES FOR DISPLAY
   For every role in the master list, capture:
     • `code`     — MASCO 4-digit code (4 digits, no spaces, no parens)
     • `title`   — display-friendly title under 45 characters
     • `isNew`   — true ONLY if the PDF's executive summary explicitly names
                   this role as new in this edition. Omit the field
                   otherwise — never write `isNew: false`.

   Title-shortening rules (in order):
     • Strip "(Not Elsewhere Classified)" and "NEC"
     • Strip parenthetical exclusions: "(Excluding Electrotechnology)" → ""
     • Replace " and " between two professions with " & " when length forces
       it, e.g. "Welders and Flame Cutters" → "Welders & Flame Cutters"
     • Three-or-more name lists keep the most recognisable two:
       "Mathematicians, Actuaries and Statisticians" → "Actuaries & Statisticians"
     • Hard cap at 45 characters
     • Never invent titles, never combine two distinct MASCO entries

   STEP 5 — EDITION LINEAGE (the appearances array)
   For each role in the new edition, set `appearances` to the chronologically-
   sorted list of edition labels in which the SAME MASCO 4D code appeared:
     • Look up each prior edition's code list (defined below in the
       `editionRoleCodes` map at the bottom of this file).
     • Match purely by MASCO 4D code. Title drift between editions does
       not break the chain — the code is the identifier.
     • Always include the current edition itself.
   Persistence is a derived UI signal:
     • `appearances.length >= 3` → "Persistent shortage" badge
     • `appearances.length === 2` → "Recurring shortage" badge
     • `appearances.length === 1` AND `isNew === true` → "New this edition"
     • `appearances.length === 1` AND no isNew flag → "Returning role"
       (was on a pre-2019 edition that we don't track in this dataset)

   STEP 6 — RE-CLUSTER INTO 6 INDUSTRY DOMAINS
   The PDF groups roles by MASCO major group, which is bureaucratic. The
   dashboard re-groups them into 6 industry domain clusters with FIXED names,
   emojis, and colors that must NEVER change:

     1. Engineering & Manufacturing  ⚙️  #f59e0b
        — All engineering disciplines, production/manufacturing managers and
          supervisors, draughtspersons, surveying technicians, industrial
          and production technicians, plant and machine operators of all
          kinds, boiler operators, crane operators, heavy truck drivers,
          mobile plant operators, welders, electrical fitters and mechanics,
          motor vehicle mechanics, machinery mechanics
     2. ICT & Digital  💻  #8b5cf6
        — Software developers, application programmers, cybersecurity, data
          professionals, systems analysts, ICT managers, database designers
          and admins, IT system admins, computer network professionals,
          AI/ML engineers, all other ICT professionals or technicians
     3. Management & Business  💼  #3b82f6
        — Managing directors, finance, HR, policy/planning, business services,
          quality, sales/marketing, supply/distribution managers, accountants,
          financial advisers, financial analysts, advertising/marketing
          professionals, all other business management roles
     4. Healthcare  🏥  #ef4444
        — Specialist medical, nursing, pharmacists, physiotherapists, medical
          imaging, environmental/occupational health, all clinical or allied
          health roles
     5. Creative & Digital Industries  🎨  #ec4899
        — Animators, VFX, game designers, esports, UI/UX designers, graphic
          and multimedia designers, creative content designers
     6. Science, R&D & Skilled Trades  🔬  #10b981
        — Chemists, science technicians, mathematicians, actuaries,
          statisticians, R&D professionals, aircraft technicians, agricultural
          and industrial machinery mechanics not placed in cluster 1, university
          and higher education teaching professionals, any skilled trades not
          placed elsewhere

   Every role must appear in exactly one cluster. Never duplicate. Never omit.
   When a role plausibly fits two clusters, pick the stronger match by
   MASCO category context — engineering managers go to Engineering, financial
   managers go to Management, etc.

   STEP 7 — UPDATE THE editionRoleCodes MAP
   Add a new key in the `editionRoleCodes` map at the bottom of this file:

       "[NEW EDITION]": [ "1121", "1211", ... all MASCO 4D codes ... ]

   Codes must be 4-character strings, sorted ascending. This map is the
   single source of truth for cross-edition lineage and persistence
   computation. Never delete past entries — they preserve history.

   STEP 8 — VALIDATION CHECKLIST (must pass before output)
   ☐ totalRoles equals the count across all 6 sectors
   ☐ totalRoles equals the executive summary stated total
   ☐ Number of `isNew: true` entries equals the explicitly-new count in PDF
   ☐ mascoComposition percentages sum to 100 ± 0.5
   ☐ Every role from the PDF appears exactly once across the 6 sectors
   ☐ No `isNew: false` field anywhere — only `isNew: true` or absent
   ☐ No role title contains "Not Elsewhere Classified", "NEC", or "(Excluding"
   ☐ All 6 sector names match the canonical names exactly
   ☐ publishedBy contains no "DOSM"
   ☐ pdfUrl filled
   ☐ editionRoleCodes map updated with new edition's codes
   ☐ For every role: appearances starts with the earliest edition the code
     appears in (sorted) and ends with the current edition

   If any check fails, fix it before emitting output.
   ─────────────────────────────────────────────────────────────────────────
*/


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EditionLabel =
  | "2019/2020"
  | "2020/2021"
  | "2022/2023"
  | "2024/2025";

export interface CriticalRole {
  code:         string;          // MASCO 4-digit code, e.g. "2512"
  title:        string;          // Display title, ≤ 45 chars
  appearances:  EditionLabel[];  // Editions where this MASCO code appears, ascending
  isNew?:       true;            // PRESENT only when explicitly new to this edition
}

export interface CriticalSector {
  sector:     string;
  emoji:      string;
  color:      string;
  mascoGroup: string;            // Hint label, not authoritative
  roles:      CriticalRole[];
}

export type PersistenceTier = "persistent" | "recurring" | "new" | "returning";

/**
 * Derive UI persistence tier from a role.
 * - persistent: 3+ editions  → 🔥 Persistent shortage
 * - recurring : 2 editions   → 📌 Recurring shortage
 * - new       : 1 edition + isNew flag → ✨ New this edition
 * - returning : 1 edition, no isNew flag → ↩ Returning role
 *               (was on pre-2019 editions that this dataset does not track)
 */
export function persistenceTier(role: CriticalRole): PersistenceTier {
  if (role.appearances.length >= 3) return "persistent";
  if (role.appearances.length === 2) return "recurring";
  if (role.isNew) return "new";
  return "returning";
}


// ─────────────────────────────────────────────────────────────────────────────
// CURRENT EDITION METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const myCOL = {
  edition:       "2024/2025" as EditionLabel,
  totalRoles:    66,
  previousTotal: 37,
  growthPercent: 78,
  publishedBy:   "TalentCorp · ILMIA · KESUMA",

  // MASCO 1-digit major group composition for the current edition.
  // Counts: Mgr 11, Prof 36, Tech 9, Plant 6, Trades 4 = 66
  mascoComposition: [
    { code: "2", category: "Professionals",                              percent: 54.5 },
    { code: "1", category: "Managers",                                   percent: 16.7 },
    { code: "3", category: "Technicians and Associate Professionals",    percent: 13.6 },
    { code: "8", category: "Plant and Machine Operators and Assemblers", percent: 9.1  },
    { code: "7", category: "Craft and Related Trades Workers",           percent: 6.1  },
    // Sums to 100.0
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // ROLES, GROUPED INTO 6 INDUSTRY DOMAIN CLUSTERS
  // ───────────────────────────────────────────────────────────────────────────
  sectors: [

    // ── 1. Engineering & Manufacturing ────────────────────────────────────
    {
      sector:     "Engineering & Manufacturing",
      emoji:      "⚙️",
      color:      "#f59e0b",
      mascoGroup: "MASCO 1, 2, 3, 7, 8",
      roles: [
        { code: "1321", title: "Manufacturing Managers",                    appearances: ["2019/2020","2022/2023","2024/2025"] },
        { code: "2141", title: "Industrial and Production Engineers",       appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "2142", title: "Civil Engineers",                            appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "2144", title: "Mechanical Engineers",                       appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "2145", title: "Chemical Engineers",                         appearances: ["2024/2025"] },
        { code: "2146", title: "Mining Engineers & Metallurgists",           appearances: ["2019/2020","2022/2023","2024/2025"] },
        { code: "2149", title: "Engineering Professionals",                  appearances: ["2019/2020","2024/2025"] },
        { code: "2151", title: "Electrical Engineers",                       appearances: ["2019/2020","2022/2023","2024/2025"] },
        { code: "2152", title: "Electronic Engineers",                       appearances: ["2019/2020","2024/2025"] },
        { code: "2171", title: "Ship Engineers",                             appearances: ["2024/2025"] },
        { code: "2182", title: "Manufacturing Professionals",                appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "3112", title: "Civil Engineering Technicians",              appearances: ["2019/2020","2022/2023","2024/2025"] },
        { code: "3113", title: "Electrical Engineering Technicians",         appearances: ["2019/2020","2022/2023","2024/2025"] },
        { code: "3114", title: "Electronics Engineering Technicians",        appearances: ["2024/2025"] },
        { code: "3115", title: "Mechanical Engineering Technicians",         appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "3118", title: "Draughtspersons & Surveying Technicians",    appearances: ["2024/2025"], isNew: true },
        { code: "3119", title: "Industrial and Production Technicians",      appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "3122", title: "Manufacturing Supervisors",                  appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "7212", title: "Welders & Flame Cutters",                    appearances: ["2020/2021","2022/2023","2024/2025"] },
        { code: "7233", title: "Agricultural & Industrial Machinery Mechanics", appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "7412", title: "Electrical Mechanics & Fitters",             appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "8141", title: "Rubber Products Machine Operators",          appearances: ["2024/2025"] },
        { code: "8182", title: "Steam Engine and Boiler Operators",          appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "8189", title: "Stationary Plant and Machine Operators",     appearances: ["2019/2020","2022/2023","2024/2025"] },
        { code: "8332", title: "Heavy Truck and Lorry Drivers",              appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "8341", title: "Mobile Farm and Forestry Plant Operators",   appearances: ["2019/2020","2024/2025"] },
        { code: "8343", title: "Crane, Hoist and Related Plant Operators",   appearances: ["2022/2023","2024/2025"] },
      ],
    },

    // ── 2. ICT & Digital ──────────────────────────────────────────────────
    {
      sector:     "ICT & Digital",
      emoji:      "💻",
      color:      "#8b5cf6",
      mascoGroup: "MASCO 1, 2",
      roles: [
        { code: "1511", title: "ICT Managers",                              appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "2511", title: "Computer Systems Analysts",                  appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2512", title: "Software Developers",                        appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "2514", title: "Application Programmers",                    appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2519", title: "Software Developers & Analysts",             appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2521", title: "Database Designers and Administrators",      appearances: ["2019/2020","2024/2025"] },
        { code: "2522", title: "IT System Administrators",                   appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "2523", title: "Computer Network Professionals",             appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2524", title: "Data Professionals",                         appearances: ["2020/2021","2024/2025"] },
        { code: "2531", title: "Cyber Security Professionals",               appearances: ["2020/2021","2024/2025"] },
      ],
    },

    // ── 3. Management & Business ──────────────────────────────────────────
    {
      sector:     "Management & Business",
      emoji:      "💼",
      color:      "#3b82f6",
      mascoGroup: "MASCO 1, 2",
      roles: [
        { code: "1121", title: "Managing Directors and Chief Executives",    appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "1211", title: "Finance Managers",                           appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "1212", title: "Human Resource Managers",                    appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "1213", title: "Policy and Planning Managers",               appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "1214", title: "Business Services Managers",                 appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "1216", title: "Quality Managers",                           appearances: ["2022/2023","2024/2025"] },
        { code: "1221", title: "Sales and Marketing Managers",               appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "1324", title: "Supply, Distribution and Related Managers",  appearances: ["2019/2020","2024/2025"] },
        { code: "2411", title: "Accountants and Auditors",                   appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2412", title: "Financial and Investment Advisers",          appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2413", title: "Financial Analysts",                         appearances: ["2019/2020","2024/2025"] },
        { code: "2431", title: "Advertising and Marketing Professionals",    appearances: ["2019/2020","2020/2021","2024/2025"] },
      ],
    },

    // ── 4. Healthcare ─────────────────────────────────────────────────────
    {
      sector:     "Healthcare",
      emoji:      "🏥",
      color:      "#ef4444",
      mascoGroup: "MASCO 2",
      roles: [
        { code: "2212", title: "Specialist Medical Practitioners",           appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2221", title: "Nursing Professionals",                      appearances: ["2020/2021","2024/2025"] },
        { code: "2262", title: "Pharmacists",                                appearances: ["2024/2025"], isNew: true },
        { code: "2263", title: "Environmental & Occupational Health",       appearances: ["2019/2020","2020/2021","2022/2023","2024/2025"] },
        { code: "2264", title: "Physiotherapists",                           appearances: ["2024/2025"], isNew: true },
      ],
    },

    // ── 5. Creative & Digital Industries ──────────────────────────────────
    {
      sector:     "Creative & Digital Industries",
      emoji:      "🎨",
      color:      "#ec4899",
      mascoGroup: "MASCO 2",
      roles: [
        { code: "2166", title: "Graphic and Multimedia Designers",           appearances: ["2019/2020","2024/2025"] },
        { code: "2541", title: "Animation and Visual Effects Professionals", appearances: ["2020/2021","2024/2025"] },
        { code: "2542", title: "Digital Games and E-Sport Professionals",    appearances: ["2020/2021","2024/2025"] },
        { code: "2543", title: "Creative Contents Designer Professionals",   appearances: ["2020/2021","2024/2025"] },
      ],
    },

    // ── 6. Science, R&D & Skilled Trades ──────────────────────────────────
    {
      sector:     "Science, R&D & Skilled Trades",
      emoji:      "🔬",
      color:      "#10b981",
      mascoGroup: "MASCO 1, 2, 3, 7",
      roles: [
        { code: "1311", title: "Agricultural, Forestry & Livestock Managers", appearances: ["2019/2020","2024/2025"] },
        { code: "2113", title: "Chemists",                                   appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2121", title: "Actuaries & Statisticians",                  appearances: ["2019/2020","2020/2021","2024/2025"] },
        { code: "2311", title: "University Teaching Professionals",         appearances: ["2019/2020","2024/2025"] },
        { code: "2426", title: "Research and Development Professionals",     appearances: ["2020/2021","2022/2023","2024/2025"] },
        { code: "3111", title: "Chemical and Physical Science Technicians",  appearances: ["2024/2025"], isNew: true },
        { code: "3151", title: "Aircraft Technicians",                       appearances: ["2022/2023","2024/2025"] },
        { code: "7231", title: "Motor Vehicle Mechanics and Repairers",      appearances: ["2024/2025"], isNew: true },
      ],
    },
  ] as CriticalSector[],
};


// ─────────────────────────────────────────────────────────────────────────────
// EDITION LINEAGE — single source of truth for cross-edition matching.
// MASCO 4D codes per edition. When a new edition is published, append a new
// key here using STEP 7 of the future-extraction prompt above. Do not modify
// past entries — they preserve historical truth.
// ─────────────────────────────────────────────────────────────────────────────

export const editionRoleCodes: Record<EditionLabel, string[]> = {
  "2019/2020": [
    "1121","1211","1212","1213","1214","1219","1221","1311","1321","1323","1324","1511",
    "2113","2114","2121","2141","2142","2144","2146","2149","2151","2152","2153","2166",
    "2182","2212","2263","2311","2411","2412","2413","2431","2434","2511","2512","2514",
    "2519","2521","2522","2523","2529","3112","3113","3115","3119","3122","3123","3129",
    "3322","3323","7211","7222","7233","7412","8182","8189","8332","8341",
  ],
  "2020/2021": [
    "1121","1211","1212","1213","1214","1221","1222","1511","2113","2121","2141","2142",
    "2144","2182","2212","2221","2263","2411","2412","2426","2431","2511","2512","2513",
    "2514","2519","2522","2523","2524","2531","2541","2542","2543","3115","3119","3122",
    "3123","7212","7233","7412","8182","8332",
  ],
  "2022/2023": [
    "1121","1211","1214","1216","1321","1323","1511","2141","2142","2144","2146","2151",
    "2173","2182","2263","2426","2512","2522","3112","3113","3115","3119","3122","3123",
    "3151","3211","7111","7132","7212","7411","7412","7422","8161","8189","8332","8342",
    "8343",
  ],
  "2024/2025": [
    "1121","1211","1212","1213","1214","1216","1221","1311","1321","1324","1511","2113",
    "2121","2141","2142","2144","2145","2146","2149","2151","2152","2166","2171","2182",
    "2212","2221","2262","2263","2264","2311","2411","2412","2413","2426","2431","2511",
    "2512","2514","2519","2521","2522","2523","2524","2531","2541","2542","2543","3111",
    "3112","3113","3114","3115","3118","3119","3122","3151","7212","7231","7233","7412",
    "8141","8182","8189","8332","8341","8343",
  ],
};

export const editionTotals: Record<EditionLabel, number> = {
  "2019/2020": 58,
  "2020/2021": 42,
  "2022/2023": 37,
  "2024/2025": 66,
};

export const editionPublishedBy: Record<EditionLabel, string> = {
  "2019/2020": "Critical Skills Monitoring Committee (CSC)",
  "2020/2021": "Critical Skills Monitoring Committee (CSC)",
  "2022/2023": "TalentCorp · ILMIA",
  "2024/2025": "TalentCorp · ILMIA · KESUMA",
};


// ─────────────────────────────────────────────────────────────────────────────
// DATA SOURCES
// ─────────────────────────────────────────────────────────────────────────────

export const dataSources = {
  myCOL: {
    name:      "TalentCorp MyMahir MyCOL",
    publisher: "TalentCorp, ILMIA, KESUMA",
    url:       "https://www.talentcorp.com.my/mycol/",
    pdfUrl:    "https://www.talentcorp.com.my/images/uploads/publication/204/MyMahir-Malaysia-Critical-Occupations-List-MyCOL20242025-1773385490.pdf",
  },
};

