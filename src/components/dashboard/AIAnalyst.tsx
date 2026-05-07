import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { Sparkles, Send, X, Loader2, RotateCcw, ExternalLink } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Suggested questions — cover every section of the dashboard
// ─────────────────────────────────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  "How healthy is Malaysia's job market right now?",
  "Which state has the best job opportunities?",
  "Why is youth unemployment so high compared to adults?",
  "What industries pay the most in Malaysia?",
  "Is skills mismatch getting better or worse?",
  "How did COVID-19 change Malaysia's workforce?",
  "What jobs should fresh graduates target in 2025?",
  "How does Malaysia compare to Singapore and Thailand?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string }[];
  timestamp: Date;
}

interface Source {
  title: string;
  url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build rich data context from all available DOSM datasets
// ─────────────────────────────────────────────────────────────────────────────
function buildDataContext(data: any): string {
  if (!data?.national?.length) return "";

  const nat     = [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latest  = nat[nat.length - 1];
  const prev    = nat[nat.length - 2];
  const yearAgo = nat.length > 13 ? nat[nat.length - 13] : nat[0];

  const peak = nat.reduce((m: any, d: any) => (d.u_rate ?? 0) > (m?.u_rate ?? 0) ? d : m, nat[0]);

  const preCovid = nat.filter((d: any) => d.date?.startsWith("2019"));
  const preCovidAvg = preCovid.length
    ? (preCovid.reduce((s: number, d: any) => s + (d.u_rate ?? 0), 0) / preCovid.length).toFixed(1)
    : "3.3";

  const states  = [...(data.state ?? [])].sort((a: any, b: any) => b.date.localeCompare(a.date));
  const latestStateDate = states[0]?.date;
  const latestStates    = states.filter((d: any) => d.date === latestStateDate);
  const bestState  = [...latestStates].sort((a: any, b: any) => (a.u_rate ?? 99) - (b.u_rate ?? 99))[0];
  const worstState = [...latestStates].sort((a: any, b: any) => (b.u_rate ?? 0) - (a.u_rate ?? 0))[0];
  const highestPRate = [...latestStates].sort((a: any, b: any) => (b.p_rate ?? 0) - (a.p_rate ?? 0))[0];

  const youth = [...(data.youth ?? [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latestYouth = youth[youth.length - 1];

  const mismatch = [...(data.mismatch ?? [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latestMismatch = mismatch[mismatch.length - 1];

  const sectors = [...(data.sectors ?? [])]
    .filter((d: any) => (d.sex ?? "").toLowerCase().includes("both") || d.sex === "" || d.sex === "overall")
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latestSector = sectors[sectors.length - 1];

  const wages = [...(data.wages ?? [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latestWage = wages[wages.length - 1];

  const duration = [...(data.duration ?? [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latestDuration = duration[duration.length - 1];

  const wagesByIndustry = [...(data.wagesByIndustry ?? [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latestWageInd = wagesByIndustry[wagesByIndustry.length - 1];

  const lfStart = nat[0];
  const lfGrowth = lfStart?.lf
    ? (((latest.lf - lfStart.lf) / lfStart.lf) * 100).toFixed(1)
    : "N/A";

  return `
=== LIVE MALAYSIA LABOUR MARKET DATA — DOSM (Department of Statistics Malaysia) ===

--- NATIONAL SNAPSHOT (${latest?.date}) ---
• Unemployment Rate: ${latest?.u_rate}%  |  Previous month: ${prev?.u_rate}%  |  Year ago: ${yearAgo?.u_rate}%
• Employment Rate: ${latest?.employment_rate ?? (100 - (latest?.u_rate ?? 0)).toFixed(1)}%
• Labour Force Participation Rate (LFPR): ${latest?.p_rate}%  |  Year ago: ${yearAgo?.p_rate}%
• Total Labour Force: ${latest?.lf ? (latest.lf / 1000).toFixed(2) + "M people" : "N/A"}
• Total Employed: ${latest?.employed ? (latest.employed / 1000).toFixed(2) + "M people" : "N/A"}
• Labour force growth since ${lfStart?.date}: +${lfGrowth}%
• Pre-COVID 2019 average unemployment: ${preCovidAvg}%
• COVID-19 peak unemployment: ${peak?.u_rate}% in ${peak?.date}

--- YOUTH UNEMPLOYMENT (${latestYouth?.date}) ---
• Youth (15–24) unemployment rate: ${latestYouth?.u_rate ?? latestYouth?.u_rate_youth ?? "N/A"}%
• This is roughly ${latest?.u_rate ? ((latestYouth?.u_rate ?? 0) / latest.u_rate).toFixed(1) : "N/A"}× the national adult rate
• High youth unemployment signals education-to-work transition challenges

--- SKILLS MISMATCH / UNDEREMPLOYMENT (${latestMismatch?.date}) ---
• Skills-related underemployment: ${latestMismatch?.sru ?? latestMismatch?.sru_rate ?? "N/A"} (${latestMismatch?.variable ?? "rate"})
• Definition: tertiary-educated graduates working in jobs below their qualification level
• This wastes human capital and depresses graduate wages

--- EMPLOYMENT BY SECTOR (${latestSector?.date}) ---
• Services sector: ${latestSector?.services ?? latestSector?.Services ?? "N/A"}% of workforce
• Industry/Manufacturing: ${latestSector?.industry ?? latestSector?.Industry ?? "N/A"}%
• Agriculture: ${latestSector?.agriculture ?? latestSector?.Agriculture ?? "N/A"}%

--- HOUSEHOLD INCOME & WAGES (${latestWage?.date}) ---
• National median household income: RM ${latestWage?.income_median?.toLocaleString() ?? "N/A"}/month
• National mean household income: RM ${latestWage?.income_mean?.toLocaleString() ?? "N/A"}/month
• Gini coefficient: ${latestWage?.gini ?? "N/A"} (0 = perfect equality, 1 = extreme inequality)

--- WAGES BY INDUSTRY (${latestWageInd?.date}) ---
• Industry with highest wages: ${latestWageInd?.industry ?? "N/A"}
• Median wage in that industry: RM ${latestWageInd?.wage_median?.toLocaleString() ?? "N/A"}/month

--- UNEMPLOYMENT DURATION (${latestDuration?.date}) ---
• Short-term unemployed (<3 months): ${latestDuration?.u_lt3m ?? "N/A"}
• Long-term unemployed (>1 year): ${latestDuration?.u_gt1y ?? "N/A"}

--- STATE COMPARISON (${latestStateDate}) ---
• Lowest unemployment: ${bestState?.state} at ${bestState?.u_rate}%
• Highest unemployment: ${worstState?.state} at ${worstState?.u_rate}%
• Highest participation rate: ${highestPRate?.state} at ${highestPRate?.p_rate}%
• States tracked: ${latestStates.length}

--- CONTEXT FOR INTERPRETATION ---
• Malaysia targets 70% LFPR as a policy goal
• Pre-COVID unemployment floor was ~3.0–3.3%
• Services sector dominance reflects Malaysia's shift from agriculture to knowledge economy
• Skills mismatch is a structural issue linked to education-industry alignment gaps
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(dataContext: string): string {
  return `You are FindMiJob's AI Labour Market Analyst — a smart, friendly expert on Malaysia's employment landscape.

You have access to LIVE data from DOSM (Department of Statistics Malaysia):

${dataContext}

YOUR COMMUNICATION STYLE:
• Write like a knowledgeable friend explaining things clearly, NOT like a textbook
• Assume the reader may not know economic jargon — always explain terms simply
• Example: instead of "LFPR declined 0.3pp", say "fewer people are actively looking for work compared to last year"
• Be specific — use the actual numbers from the data above
• Keep answers concise: 3–5 sentences for simple questions, up to 3 short paragraphs for complex ones
• Use bullet points only when listing 3+ items — never for single points
• Do NOT start with "Great question!" or similar filler phrases
• Do NOT say "As an AI" — just answer directly
• If something is not in the data, say so honestly and use your knowledge to help

WHAT YOU KNOW ABOUT THE DASHBOARD:
• Labour Health Index: composite score using 7 DOSM indicators (unemployment, participation, growth, youth, mismatch, wages, stability)
• Trend charts: monthly unemployment, participation, labour force and employment growth since 2010
• Sector employment: split across Services, Industry/Manufacturing and Agriculture
• Skills mismatch: tertiary-educated workers in jobs below their qualifications
• State map: unemployment and participation rates for all 16 states + 3 federal territories
• Regional opportunity: composite index using household income, unemployment, poverty and equality
• Personalised analysis: state + industry health score with 7 dimensions
• Wages by industry: median and mean wages across sectors

Always answer in the same language the user writes in. If in Bahasa Malaysia, respond in BM.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Network helpers — these are the heart of the stability fix
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse fetch response safely. Throws a friendly error if the proxy
 * returned HTML (which happens in local dev when running `npm run dev`
 * instead of `netlify dev`).
 */
async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (text.trim().startsWith("<")) {
      throw new Error(
        "AI proxy not reachable. If running locally, use `netlify dev` instead of `npm run dev`."
      );
    }
    throw new Error(`Unexpected response from server: ${text.slice(0, 120)}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error("Server returned malformed JSON. Please try again.");
  }
}

/**
 * Fetch with exponential-backoff retry on transient errors.
 * Server already retries once — this is a second safety net for
 * network blips between browser and Netlify edge.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 1,
  baseDelayMs = 1000
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      const isTransient = [429, 502, 503, 504].includes(response.status);
      if (isTransient && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error("Request failed");
}

/**
 * Robust extraction of text from a Gemini response. Handles every
 * known failure mode: API errors, prompt blocks, safety filters,
 * MAX_TOKENS, recitation blocks, and empty parts arrays.
 */
function extractResponseText(result: any): {
  text: string | null;
  errorMessage?: string;
  sources?: Source[];
} {
  // Explicit API error
  if (result?.error?.message) {
    return { text: null, errorMessage: result.error.message };
  }

  // Prompt was blocked before generation
  if (result?.promptFeedback?.blockReason) {
    return {
      text: null,
      errorMessage: `Question was blocked (${result.promptFeedback.blockReason}). Please rephrase it.`,
    };
  }

  const candidate = result?.candidates?.[0];
  if (!candidate) {
    return { text: null, errorMessage: "No response generated. Please try again." };
  }

  // Extract text
  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .filter((p: any) => typeof p?.text === "string")
    .map((p: any) => p.text)
    .join("")
    .trim();

  // Extract grounding sources
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const sources: Source[] = chunks
    .filter((c: any) => c?.web?.uri)
    .slice(0, 3)
    .map((c: any) => ({
      title: c.web.title ?? c.web.uri,
      url: c.web.uri,
    }));

  if (text) {
    return { text, sources };
  }

  // Empty text — diagnose why
  const reason = candidate.finishReason;
  if (reason === "SAFETY") {
    return { text: null, errorMessage: "Response was filtered for safety. Try rephrasing your question." };
  }
  if (reason === "RECITATION") {
    return { text: null, errorMessage: "Response was blocked due to copyright concerns. Try a different angle." };
  }
  if (reason === "MAX_TOKENS") {
    return { text: null, errorMessage: "Response hit the length limit before producing text. Try a more specific question." };
  }
  return { text: null, errorMessage: "I couldn't generate a response. Please try a different question." };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const AIAnalyst = () => {
  const { data } = useLabourData();
  const { t }    = useLanguage();

  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const dataContext  = useMemo(() => buildDataContext(data), [data]);
  const systemPrompt = useMemo(() => buildSystemPrompt(dataContext), [dataContext]);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role:      "assistant",
        content:   t("ai.welcome"),
        timestamp: new Date(),
      }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // ── Send message ───────────────────────────────────────────────────────────
  const ask = async (question: string) => {
    if (!question.trim() || thinking) return;
    setError(null);
    setLastQuestion(question);

    const userMsg: Message = { role: "user", content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    // Build conversation history (skip welcome message for token efficiency)
    const history = messages
      .filter((_, i) => i > 0)
      .map(m => ({
        role:  m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    try {
      const response = await fetchWithRetry(
        "/.netlify/functions/gemini-proxy",
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...history,
              { role: "user", parts: [{ text: question }] },
            ],
            tools: [{ google_search: {} }],
            generationConfig: {
              temperature:     0.65,
              maxOutputTokens: 1024,    // bumped from 800 to reduce MAX_TOKENS hits
              topP:            0.9,
            },
          }),
        }
      );

      const result = await safeJsonParse(response);

      // Non-2xx response — translate to friendly error
      if (!response.ok) {
        const msg = result?.error?.message ?? `Request failed (status ${response.status})`;
        const lower = msg.toLowerCase();

        if (lower.includes("api key") || lower.includes("gemini_api_key")) {
          throw new Error("Server API key issue. Please check the Netlify environment variables.");
        }
        if (response.status === 503 || lower.includes("overload") || lower.includes("busy")) {
          throw new Error("AI service is busy right now. Please try again in a few seconds.");
        }
        if (response.status === 429 || lower.includes("rate")) {
          throw new Error("Too many requests. Please wait a moment before asking again.");
        }
        if (response.status === 504 || lower.includes("timeout") || lower.includes("took too long")) {
          throw new Error("The AI took too long to respond. Please try a shorter question.");
        }
        throw new Error(msg);
      }

      // 2xx response — extract text
      const { text, errorMessage, sources } = extractResponseText(result);
      if (!text) {
        throw new Error(errorMessage || "Empty response from AI. Please try again.");
      }

      setMessages(prev => [...prev, {
        role:      "assistant",
        content:   text,
        sources,
        timestamp: new Date(),
      }]);
      setLastQuestion(null);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Retry the last failed question
  const retry = () => {
    if (lastQuestion && !thinking) {
      // Remove the failed user message so it doesn't get re-added
      setMessages(prev => {
        const lastIsUser = prev[prev.length - 1]?.role === "user" && prev[prev.length - 1]?.content === lastQuestion;
        return lastIsUser ? prev.slice(0, -1) : prev;
      });
      ask(lastQuestion);
    }
  };

  // ── Render message content ─────────────────────────────────────────────────
  const renderContent = (msg: Message) => {
    const formatted = msg.content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n- /g, "<br/>• ")
      .replace(/\n• /g, "<br/>• ")
      .replace(/\n\n/g, "<br/><br/>")
      .replace(/\n/g, "<br/>");

    return (
      <div>
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
            <p className="text-[10px] text-muted-foreground font-semibold">{t("ai.sources")}</p>
            {msg.sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── Floating trigger ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl font-semibold text-sm"
          >
            <Sparkles className="h-4 w-4" />
            {t("ai.button")}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1     }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-2 left-2 md:left-auto md:right-6 z-[100] md:w-[90vw] md:max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "min(600px, 75vh)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t("ai.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("ai.subtitle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.length > 1 && (
                  <button
                    onClick={() => { setMessages([]); setError(null); setLastQuestion(null); }}
                    title="Clear chat"
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {renderContent(msg)}
                  </div>
                </motion.div>
              ))}

              {thinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">{t("ai.analysing")}</span>
                  </div>
                </motion.div>
              )}

              {error && !thinking && (
                <div className="text-xs bg-destructive/10 rounded-xl px-3 py-2.5 border border-destructive/20 space-y-2">
                  <p className="text-destructive">{error}</p>
                  {lastQuestion && (
                    <button
                      onClick={retry}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      ↻ Try again
                    </button>
                  )}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Suggested questions — only at start */}
            {messages.length <= 1 && !error && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">{t("ai.suggested")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map(q => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-all text-foreground text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-border">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                  placeholder={t("ai.placeholder")}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  disabled={thinking}
                />
                <button
                  onClick={() => ask(input)}
                  disabled={!input.trim() || thinking}
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                {t("ai.powered")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAnalyst;