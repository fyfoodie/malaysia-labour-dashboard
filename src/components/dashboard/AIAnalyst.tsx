import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLabourData } from "@/context/LabourDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { Sparkles, Send, X, ChevronDown, Loader2, RotateCcw, ExternalLink } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "What's the overall health of Malaysia's job market right now?",
  "Which states have the best employment opportunities?",
  "Why is youth unemployment high in Malaysia?",
  "How did COVID-19 impact Malaysia's labour market?",
  "What sectors should fresh graduates target in 2025?",
  "Is skills mismatch getting better or worse?",
  "Compare Malaysia's unemployment with regional neighbours",
  "What's driving the services sector dominance?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const AIAnalyst = ({ apiKey }: { apiKey: string }) => {
  const { data, loading } = useLabourData();
  const { t } = useLanguage();
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Build a rich data snapshot to inject into every prompt
  const dataContext = useMemo(() => {
    if (!data?.national?.length) return "";

    const nat     = [...data.national].sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latest  = nat[nat.length - 1];
    const prev    = nat[nat.length - 2];
    const yearAgo = nat[nat.length - 13] ?? nat[0];

    const statesSorted = [...(data.state ?? [])]
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
    const latestStateDate = statesSorted[0]?.date;
    const latestStates    = statesSorted.filter((d: any) => d.date === latestStateDate);
    const topState        = [...latestStates].sort((a: any, b: any) => (a.u_rate ?? 0) - (b.u_rate ?? 0))[0];
    const bottomState     = [...latestStates].sort((a: any, b: any) => (b.u_rate ?? 0) - (a.u_rate ?? 0))[0];

    const mismatch = [...(data.mismatch ?? [])]
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latestMismatch  = mismatch[mismatch.length - 1];

    const sectors  = [...(data.sectors ?? [])]
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latestSector = sectors[sectors.length - 1];

    const youth = [...(data.youth ?? [])]
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    const latestYouth = youth[youth.length - 1];

    return `
LIVE MALAYSIA LABOUR MARKET DATA (from DOSM — Department of Statistics Malaysia):

=== NATIONAL OVERVIEW (${latest?.date}) ===
- Unemployment Rate: ${latest?.u_rate}% (prev month: ${prev?.u_rate}%, year ago: ${yearAgo?.u_rate}%)
- Labour Force Participation Rate (LFPR): ${latest?.p_rate}% (year ago: ${yearAgo?.p_rate}%)
- Total Labour Force: ${(latest?.lf / 1000).toFixed(2)}M workers
- Total Employed: ${(latest?.employed / 1000).toFixed(2)}M
- Employment Rate: ${latest?.employment_rate ?? +(100 - latest?.u_rate).toFixed(1)}%

=== YOUTH UNEMPLOYMENT (${latestYouth?.date}) ===
- Youth (15-24) Unemployment Rate: ${latestYouth?.u_rate_youth ?? latestYouth?.u_rate ?? "N/A"}%

=== SKILLS MISMATCH / UNDEREMPLOYMENT (${latestMismatch?.date}) ===
- Overall Skills Mismatch Rate: ${latestMismatch?.sru ?? "N/A"} (${latestMismatch?.variable})
- Definition: tertiary-educated workers employed below their qualification level

=== SECTOR BREAKDOWN (${latestSector?.date}) ===
- Services: ${latestSector?.Services ?? latestSector?.services ?? "N/A"}% of workforce
- Industry (Manufacturing): ${latestSector?.Industry ?? latestSector?.industry ?? "N/A"}%
- Agriculture: ${latestSector?.Agriculture ?? latestSector?.agriculture ?? "N/A"}%

=== STATE COMPARISON (${latestStateDate}) ===
- Best unemployment: ${topState?.state} at ${topState?.u_rate}%
- Highest unemployment: ${bottomState?.state} at ${bottomState?.u_rate}%
- Total states tracked: ${latestStates.length}

=== HISTORICAL CONTEXT ===
- COVID peak unemployment: ${nat.reduce((m: any, d: any) => d.u_rate > m.u_rate ? d : m, nat[0])?.u_rate}% in ${nat.reduce((m: any, d: any) => d.u_rate > m.u_rate ? d : m, nat[0])?.date}
- Workforce growth since ${nat[0]?.date}: from ${(nat[0]?.lf / 1000).toFixed(2)}M to ${(latest?.lf / 1000).toFixed(2)}M
- Pre-COVID average unemployment: ~3.3%
`;
  }, [data]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: t("ai.welcome"),
        timestamp: new Date(),
      }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const ask = async (question: string) => {
    if (!question.trim() || thinking) return;
    setError(null);

    const userMsg: Message = { role: "user", content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    // Build conversation history for Gemini
    const history = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const systemPrompt = `You are an expert Malaysia Labour Market Analyst with access to live DOSM (Department of Statistics Malaysia) data. You also have access to Google Search for current news and context.

${dataContext}

RESPONSE RULES:
1. Be concise by default — 2-4 sentences max unless the user asks for more detail (e.g. "explain in detail", "write an essay", "elaborate")
2. Always ground your answers in the actual data above when relevant
3. If asked about current events or news, use your search capability to find recent articles
4. Be conversational and insightful, not robotic
5. Use specific numbers from the data when answering
6. If comparing to other countries, use your knowledge + search for current data
7. Format with bullet points only if listing 3+ items
8. Never say "As an AI" — just answer directly

The user is asking about Malaysia's labour market. Answer helpfully and accurately.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...history,
              { role: "user", parts: [{ text: question }] },
            ],
            tools: [{ google_search: {} }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message ?? "API error");
      }

      const result = await response.json();
      const text   = result.candidates?.[0]?.content?.parts
        ?.filter((p: any) => p.text)
        ?.map((p: any) => p.text)
        ?.join("") ?? "Sorry, I couldn't generate a response.";

      // Extract grounding sources if available
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = groundingChunks
        .filter((c: any) => c.web?.uri)
        .slice(0, 3)
        .map((c: any) => ({ title: c.web.title ?? c.web.uri, url: c.web.uri }));

      const assistantContent = sources.length > 0
        ? `${text}\n\n__SOURCES__${JSON.stringify(sources)}`
        : text;

      setMessages(prev => [...prev, {
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const renderMessage = (msg: Message) => {
    let text = msg.content;
    let sources: { title: string; url: string }[] = [];

    if (text.includes("__SOURCES__")) {
      const [body, sourcePart] = text.split("__SOURCES__");
      text = body.trim();
      try { sources = JSON.parse(sourcePart); } catch {}
    }

    // Simple markdown: **bold**, bullet points
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n- /g, "<br/>• ")
      .replace(/\n\n/g, "<br/><br/>")
      .replace(/\n/g, "<br/>");

    return (
      <div>
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
        {sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            <p className="text-xs text-muted-foreground">Sources:</p>
            {sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline truncate">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!apiKey) return null;

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl font-semibold text-sm"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI Analyst
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-[100] w-[90vw] max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "min(600px, 80vh)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">AI Labour Analyst</p>
                  <p className="text-xs text-muted-foreground">Live DOSM data + web search</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <button onClick={() => setMessages([])} title="Clear chat"
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {renderMessage(msg)}
                  </div>
                </motion.div>
              ))}

              {thinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">Analysing data + searching web...</span>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="text-xs text-red-500 bg-red-500/10 rounded-xl px-3 py-2">
                  ⚠️ {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Suggested questions — only show at start */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2">
                <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map(q => (
                    <button key={q} onClick={() => ask(q)}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-all text-foreground text-left">
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
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && ask(input)}
                  placeholder="Ask anything about Malaysia's job market..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  onClick={() => ask(input)}
                  disabled={!input.trim() || thinking}
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 text-center">
                Powered by Gemini 2.0 Flash · Live DOSM data · Web search enabled
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAnalyst;
