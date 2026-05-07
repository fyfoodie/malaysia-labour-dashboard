/**
 * netlify/functions/gemini-proxy.cjs
 *
 * Uses Node's built-in `https` module — zero external dependencies,
 * works on Node 12, 14, 16, 18, 20, 22 — any version Netlify may use.
 *
 * LOCAL DEV:  Add GEMINI_API_KEY=your_key to .env, run `netlify dev`
 * PRODUCTION: Set GEMINI_API_KEY in Netlify → Site Settings → Environment Variables
 */

const https = require("https");

// ─── Model fallback list ────────────────────────────────────────────────────
const MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

const GEMINI_HOST = "generativelanguage.googleapis.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── https POST helper ──────────────────────────────────────────────────────
function httpsPost(path, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const options = {
      hostname: GEMINI_HOST,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 25000,
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          reject(new Error(`Non-JSON response (${res.statusCode}): ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out after 25s"));
    });

    req.on("error", (err) => reject(err));
    req.write(body);
    req.end();
  });
}

// ─── Retry + model-fallback ─────────────────────────────────────────────────
async function callWithFallback(apiKey, payload) {
  // Strip google_search grounding — requires paid tier, causes most 503s
  const cleaned = { ...payload };
  if (cleaned.tools) {
    cleaned.tools = cleaned.tools.filter(
      (t) => !t.google_search && !t.googleSearch
    );
    if (cleaned.tools.length === 0) delete cleaned.tools;
  }

  const MAX_RETRIES = 2;

  for (const model of MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const path = `/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const { status, data } = await httpsPost(path, cleaned);
        const ok = status >= 200 && status < 300;

        if (ok) {
          console.log(`[gemini-proxy] Success with ${model}`);
          return { success: true, data: { ...data, _model: model } };
        }

        // Auth errors — bail immediately, no point retrying
        if (status === 400 || status === 401 || status === 403) {
          const msg = data?.error?.message ?? `Auth error ${status}`;
          console.error(`[gemini-proxy] Auth error on ${model}: ${msg}`);
          return { success: false, status, error: msg };
        }

        // Model not available — skip to next
        if (status === 404) {
          console.log(`[gemini-proxy] ${model} not found, trying next model`);
          break;
        }

        // Overloaded — retry with backoff
        if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
          const wait = (attempt + 1) * 1500;
          console.log(`[gemini-proxy] ${model} overloaded (${status}), retrying in ${wait}ms`);
          await sleep(wait);
          continue;
        }

        console.log(`[gemini-proxy] ${model} gave ${status}, trying next model`);
        break;

      } catch (err) {
        console.error(`[gemini-proxy] ${model} attempt ${attempt} threw: ${err.message}`);
        if (attempt < MAX_RETRIES) {
          await sleep((attempt + 1) * 1000);
          continue;
        }
        break;
      }
    }
  }

  return {
    success: false,
    status: 503,
    error: "All Gemini models are currently busy. Please try again in a moment.",
  };
}

// ─── Netlify handler ────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const CORS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: { message: "Method Not Allowed" } }) };
  }

  // ── Resolve API key ───────────────────────────────────────────────────────
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ""
  ).trim();

  if (!apiKey) {
    console.error("[gemini-proxy] ERROR: No GEMINI_API_KEY found in environment.");
    console.error("[gemini-proxy] For local dev: add GEMINI_API_KEY=... to your .env file.");
    console.error("[gemini-proxy] For Netlify: add it under Site Settings → Environment Variables.");
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({
        error: { message: "Server config error: API key missing. Contact the site administrator." },
      }),
    };
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: { message: "Invalid JSON body" } }),
    };
  }

  // ── Call Gemini ───────────────────────────────────────────────────────────
  try {
    const result = await callWithFallback(apiKey, payload);

    if (result.success) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify(result.data) };
    }

    return {
      statusCode: result.status ?? 502,
      headers: CORS,
      body: JSON.stringify({ error: { message: result.error } }),
    };
  } catch (err) {
    console.error("[gemini-proxy] Unexpected top-level error:", err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: { message: "Internal server error. Please try again." } }),
    };
  }
};
