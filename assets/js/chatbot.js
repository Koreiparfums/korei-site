/**
 * Korei — Chatbot conseiller olfactif (mock MVP)
 *
 * FUTURE INTÉGRATION IA :
 * ─────────────────────
 * 1. Remplacer sendMockResponse() par sendToAI(userMessage)
 * 2. Appeler une serverless function (Vercel / Netlify / AWS Lambda)
 * 3. Exemple endpoint : POST /api/chat
 *    Body: { message, context: buildChatContext() }
 * 4. Contexte à envoyer : notes, budget, occasion, saison, genre, intensité, marques, catalogue
 * 5. Providers possibles : OpenAI GPT-4, AWS Bedrock (Claude), Anthropic API
 * 6. Ajouter gestion streaming pour réponses progressives
 */
(function (global) {
  const MOCK_RESPONSES = {
    default:
      "Je suis votre conseiller olfactif Korei. Décrivez ce que vous recherchez : une note (oud, vanille, cuir…), une occasion ou un budget.",
    oud: "Pour l'oud, je recommande **Oud Wood** (Tom Ford) — accessible et élégant — ou **Interlude Man** (Amouage) pour une version plus intense et fumée. Décants dès 12€.",
    vanille:
      "Côté vanille gourmande : **Angels' Share** (Kilian) est un incontournable cognac-vanille. **Layton** (Parfums de Marly) offre une vanille plus classique et raffinée.",
    bureau:
      "Pour le bureau, privilégiez des parfums modérés : **Oud Wood**, **Bal d'Afrique** ou **Aventus**. Évitez les compositions trop intenses en journée.",
    soirée:
      "Pour une soirée : **Interlude Man**, **Black Phantom** ou **Oud for Greatness** — présence olfactive garantie.",
    budget:
      "Nos décants commencent à 9€ (**Replica Jazz Club**). Le meilleur rapport qualité-prix : **Bal d'Afrique** à 10€ ou **Oud Wood** à 12€.",
    été: "Pour l'été : **Bal d'Afrique** (frais et lumineux) ou **Aventus** (fruité et aérien). Notes légères, tenue modérée.",
    homme: "Signatures masculines populaires : **Aventus**, **Layton**, **Oud Wood** et **Interlude Man**. Souhaitez-vous boisé, oriental ou gourmand ?",
    femme: "Pour une signature féminine ou unisexe : **Bal d'Afrique**, **Angels' Share** ou **Replica Jazz Club** — tous très portables.",
    salut: "Bonjour ! Je suis le conseiller Korei. Quel parfum cherchez-vous ? Note, occasion, budget — je vous guide.",
    bonjour: "Bonjour ! Je suis le conseiller Korei. Quel parfum cherchez-vous ? Note, occasion, budget — je vous guide.",
    merci: "Avec plaisir ! N'hésitez pas si vous voulez d'autres recommandations. Bonne découverte olfactive 🌿",
  };

  const SUGGESTIONS = [
    "Parfum oud pour soirée",
    "Quel parfum pour le bureau ?",
    "Budget moins de 12€",
    "Parfum vanille gourmand",
  ];

  let isOpen = false;
  let messages = [];

  function getElements() {
    return {
      widget: document.getElementById("chatbot-widget"),
      panel: document.getElementById("chatbot-panel"),
      messages: document.getElementById("chatbot-messages"),
      input: document.getElementById("chatbot-input"),
      toggle: document.getElementById("chatbot-toggle"),
      close: document.getElementById("chatbot-close"),
      form: document.getElementById("chatbot-form"),
      suggestions: document.getElementById("chatbot-suggestions"),
    };
  }

  function buildChatContext() {
    const { PRODUCTS, BRANDS } = global.KoreiProducts || { PRODUCTS: [], BRANDS: [] };
    return {
      products: PRODUCTS.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        notes: p.notes,
        price: p.price,
        gender: p.gender,
        intensity: p.intensity,
        occasions: p.occasions,
        seasons: p.seasons,
        family: p.family,
      })),
      brands: BRANDS.map((b) => ({ id: b.id, name: b.name })),
      criteria: ["notes", "budget", "occasion", "saison", "genre", "intensité", "marques"],
    };
  }

  /**
   * FUTURE : remplacer par appel API réel
   * async function sendToAI(userMessage) {
   *   const res = await fetch('/api/chat', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({
   *       message: userMessage,
   *       context: buildChatContext(),
   *     }),
   *   });
   *   const data = await res.json();
   *   return data.reply;
   * }
   */
  function sendMockResponse(userMessage) {
    const lower = userMessage.toLowerCase();
    for (const [key, reply] of Object.entries(MOCK_RESPONSES)) {
      if (key !== "default" && lower.includes(key)) return reply;
    }
    if (lower.includes("oud")) return MOCK_RESPONSES.oud;
    if (lower.includes("vanille") || lower.includes("gourmand")) return MOCK_RESPONSES.vanille;
    if (lower.includes("bureau") || lower.includes("travail")) return MOCK_RESPONSES.bureau;
    if (lower.includes("soirée") || lower.includes("soiree")) return MOCK_RESPONSES.soirée;
    if (lower.includes("budget") || lower.includes("€") || lower.includes("euro")) return MOCK_RESPONSES.budget;
    if (lower.includes("été") || lower.includes("ete")) return MOCK_RESPONSES.été;
    if (lower.includes("homme")) return MOCK_RESPONSES.homme;
    if (lower.includes("femme")) return MOCK_RESPONSES.femme;
    return MOCK_RESPONSES.default;
  }

  function formatBotText(text) {
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function addMessage(text, role) {
    messages.push({ text, role });
    const el = getElements();
    if (!el.messages) return;

    const div = document.createElement("div");
    div.className = `chatbot-msg chatbot-msg--${role}`;
    div.innerHTML =
      role === "bot"
        ? `<div class="chatbot-avatar"><i class="ti ti-sparkles"></i></div><div class="chatbot-bubble">${formatBotText(text)}</div>`
        : `<div class="chatbot-bubble">${text}</div>`;
    el.messages.appendChild(div);
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  function showTyping() {
    const el = getElements();
    if (!el.messages) return null;
    const div = document.createElement("div");
    div.className = "chatbot-msg chatbot-msg--bot chatbot-typing";
    div.innerHTML =
      '<div class="chatbot-avatar"><i class="ti ti-sparkles"></i></div><div class="chatbot-bubble"><span></span><span></span><span></span></div>';
    el.messages.appendChild(div);
    el.messages.scrollTop = el.messages.scrollHeight;
    return div;
  }

  function handleUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage(trimmed, "user");
    const el = getElements();
    if (el.input) el.input.value = "";

    const typing = showTyping();

    // Simule latence réseau — à supprimer avec vraie API
    setTimeout(() => {
      typing?.remove();
      const reply = sendMockResponse(trimmed);
      addMessage(reply, "bot");
    }, 800);
  }

  function renderSuggestions() {
    const el = getElements();
    if (!el.suggestions) return;
    el.suggestions.innerHTML = SUGGESTIONS.map(
      (s) => `<button type="button" class="chatbot-suggestion" data-suggestion="${s}">${s}</button>`
    ).join("");

    el.suggestions.querySelectorAll("[data-suggestion]").forEach((btn) => {
      btn.addEventListener("click", () => handleUserMessage(btn.dataset.suggestion));
    });
  }

  function open() {
    const el = getElements();
    isOpen = true;
    el.panel?.classList.add("open");
    el.toggle?.classList.add("open");
    el.toggle?.setAttribute("aria-expanded", "true");
    el.input?.focus();

    if (messages.length === 0) {
      addMessage(
        "Bonjour ! Je suis votre conseiller olfactif Korei. Décrivez une note, une occasion ou un budget — je vous oriente vers les parfums idéaux.",
        "bot"
      );
    }
  }

  function close() {
    const el = getElements();
    isOpen = false;
    el.panel?.classList.remove("open");
    el.toggle?.classList.remove("open");
    el.toggle?.setAttribute("aria-expanded", "false");
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function init() {
    const el = getElements();
    if (!el.widget) return;

    el.toggle?.addEventListener("click", toggle);
    el.close?.addEventListener("click", close);

    el.form?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleUserMessage(el.input?.value || "");
    });

    renderSuggestions();

    // Contexte prêt pour future API (non envoyé en MVP)
    if (global.KoreiProducts) buildChatContext();
  }

  global.KoreiChatbot = { open, close, toggle, buildChatContext };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
