const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_HISTORY_MESSAGES = 8;
const MAX_CATALOG_PRODUCTS = 40;
const RATE_LIMIT_WINDOW_MS = Number(
  process.env.CHAT_RATE_LIMIT_WINDOW_MS || 60_000,
);
const RATE_LIMIT_MAX_REQUESTS = Number(
  process.env.CHAT_RATE_LIMIT_MAX_REQUESTS || 12,
);

const rateLimitBuckets = new Map();

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function clientIp(req) {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function pruneRateLimitBuckets(now) {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function checkRateLimit(req, res) {
  const now = Date.now();
  pruneRateLimitBuckets(now);

  const key = clientIp(req);
  const current = rateLimitBuckets.get(key);
  const bucket =
    current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const remaining = Math.max(RATE_LIMIT_MAX_REQUESTS - bucket.count, 0);
  const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count <= RATE_LIMIT_MAX_REQUESTS) return true;

  res.setHeader("Retry-After", String(resetSeconds));
  return false;
}

function sanitizeText(value, maxLength = 1200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role:
        item?.role === "bot" || item?.role === "assistant"
          ? "assistant"
          : "user",
      content: sanitizeText(item?.text || item?.content, 900),
    }))
    .filter((item) => item.content);
}

function sanitizeCatalog(catalog) {
  if (!Array.isArray(catalog)) return [];

  return catalog.slice(0, MAX_CATALOG_PRODUCTS).map((product) => ({
    id: sanitizeText(product.id, 80),
    name: sanitizeText(product.name, 120),
    brand: sanitizeText(product.brand, 120),
    family: sanitizeText(product.family, 80),
    gender: sanitizeText(product.gender, 80),
    intensity: sanitizeText(product.intensity, 80),
    price: Number(product.price) || null,
    priceRange: sanitizeText(product.priceRange, 80),
    supplierAvailable: product.supplierAvailable !== false,
    notesTop: Array.isArray(product.notesTop)
      ? product.notesTop.slice(0, 6).map((n) => sanitizeText(n, 80))
      : [],
    notesHeart: Array.isArray(product.notesHeart)
      ? product.notesHeart.slice(0, 6).map((n) => sanitizeText(n, 80))
      : [],
    notesBase: Array.isArray(product.notesBase)
      ? product.notesBase.slice(0, 6).map((n) => sanitizeText(n, 80))
      : [],
    seasons: Array.isArray(product.seasons)
      ? product.seasons.slice(0, 6).map((n) => sanitizeText(n, 80))
      : [],
    occasions: Array.isArray(product.occasions)
      ? product.occasions.slice(0, 6).map((n) => sanitizeText(n, 80))
      : [],
  }));
}

function parseGroqReply(content) {
  const raw = String(content || "").trim();
  if (!raw) return { reply: "", productIds: [] };

  try {
    const parsed = JSON.parse(raw);
    return {
      reply: sanitizeText(parsed.reply, 1800),
      productIds: Array.isArray(parsed.productIds)
        ? parsed.productIds
            .map((id) => sanitizeText(id, 80))
            .filter(Boolean)
            .slice(0, 3)
        : [],
    };
  } catch (error) {
    return { reply: sanitizeText(raw, 1800), productIds: [] };
  }
}

function buildSystemPrompt(catalog) {
  return [
    "Tu es le conseiller olfactif de Korei, une parfumerie de niche spécialisée dans les décants et flacons authentiques.",
    "Réponds toujours en français, avec un ton premium, clair et utile.",
    "Recommande uniquement des produits présents dans le catalogue fourni.",
    "Si le client donne une occasion, une note, une saison, un budget ou une intensité, explique brièvement pourquoi les produits choisis correspondent.",
    "Ne promets jamais un stock certain si supplierAvailable est false.",
    "Réponds uniquement en JSON valide avec cette forme exacte :",
    '{"reply":"réponse courte en 2 à 5 phrases, sans HTML","productIds":["id-produit-1","id-produit-2"]}',
    "Utilise au maximum 3 productIds, et seulement des ids exacts du catalogue.",
    "",
    `Catalogue disponible : ${JSON.stringify(catalog)}`,
  ].join("\n");
}

function parseRequestBody(req) {
  if (typeof req.body !== "string") return req.body || {};

  try {
    return JSON.parse(req.body);
  } catch (error) {
    return {};
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendJson(res, 204, {});
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  if (!checkRateLimit(req, res)) {
    return sendJson(res, 429, {
      error: "rate_limit_exceeded",
      message:
        "Trop de demandes au conseiller. Réessayez dans quelques instants.",
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, {
      error: "missing_groq_api_key",
      message: "GROQ_API_KEY is not configured.",
    });
  }

  const body = parseRequestBody(req);
  const message = sanitizeText(body.message, 1000);
  const catalog = sanitizeCatalog(body.catalog);
  const history = sanitizeHistory(body.history);

  if (!message) {
    return sendJson(res, 400, { error: "empty_message" });
  }

  if (!catalog.length) {
    return sendJson(res, 400, { error: "empty_catalog" });
  }

  try {
    const groqRes = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: 0.35,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(catalog) },
          ...history,
          { role: "user", content: message },
        ],
      }),
    });

    const groqData = await groqRes.json().catch(() => ({}));

    if (!groqRes.ok) {
      return sendJson(res, groqRes.status, {
        error: "groq_request_failed",
        message: groqData?.error?.message || "Groq request failed.",
      });
    }

    const content = groqData?.choices?.[0]?.message?.content;
    const aiReply = parseGroqReply(content);

    return sendJson(res, 200, {
      reply:
        aiReply.reply ||
        "Je n'ai pas réussi à formuler une recommandation précise. Pouvez-vous préciser la note, l'occasion ou le budget ?",
      productIds: aiReply.productIds,
      provider: "groq",
      model: groqData?.model || process.env.GROQ_MODEL || DEFAULT_MODEL,
    });
  } catch (error) {
    return sendJson(res, 502, {
      error: "chat_provider_unavailable",
      message: "The chat provider is unavailable.",
    });
  }
};
