/**
 * Korei — Chatbot conseiller olfactif (mock MVP)
 *
 * FUTURE INTÉGRATION IA — brancher ici :
 * ─────────────────────────────────────
 * 1. Dans handleUserMessage(), remplacer sendMockResponse() par :
 *
 *    async function sendToAI(userMessage) {
 *      const res = await fetch('/api/chat', {
 *        method: 'POST',
 *        headers: { 'Content-Type': 'application/json' },
 *        body: JSON.stringify({
 *          message: userMessage,
 *          history: messages.slice(-6),
 *          catalog: KoreiProductStore.buildCatalogContext(),
 *        }),
 *      });
 *      const data = await res.json();
 *      return data.reply; // HTML ou markdown léger
 *    }
 *
 * 2. Serverless (Vercel api/chat.js / Netlify functions/chat) :
 *    - Clé API OpenAI / Bedrock côté serveur uniquement
 *    - Prompt système + catalogue JSON en contexte
 *    - Retourner texte + productIds recommandés
 *
 * 3. Garder recommendProducts() pour fallback ou hybrid RAG local
 */
(function (global) {
  const store = () => global.KoreiProductStore;

  const SUGGESTIONS = [
    "Parfum oud pour soirée",
    "Quel parfum pour le bureau ?",
    "Budget moins de 12€",
    "Parfum vanille gourmand",
    "Frais pour l'été",
    "Cuir et boisé",
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

  function productPageUrl(id) {
    const inPages = window.location.pathname.includes("/pages/");
    return inPages ? `product.html?id=${id}` : `pages/product.html?id=${id}`;
  }

  function buildChatContext() {
    const s = store();
    if (!s) return { products: [], brands: [], criteria: [] };
    return {
      products: s.buildCatalogContext(),
      brands: s.getBrands().map((b) => ({ id: b.id, name: b.name })),
      criteria: [
        "notesTop",
        "notesHeart",
        "notesBase",
        "family",
        "gender",
        "seasons",
        "occasions",
        "intensity",
        "priceRange",
        "supplierAvailable",
      ],
    };
  }

  function formatProductLine(product, index) {
    const notes = global.KoreiProducts?.formatNotes(product.notes.slice(0, 3)) || product.notes.join(", ");
    const url = productPageUrl(product.id);
    return `${index + 1}. <a href="${url}" class="chatbot-product-link">${product.name}</a> (${product.brand}) — dès ${product.price}€ · ${notes}`;
  }

  function detectTopic(query) {
    const q = query.toLowerCase();
    const topics = [
      { re: /oud/, label: "oud" },
      { re: /vanille|gourmand/, label: "vanille & gourmand" },
      { re: /cuir|leather/, label: "cuir" },
      { re: /frais|fraiche|leger|aerien/, label: "fraîcheur" },
      { re: /ete/, label: "l'été" },
      { re: /hiver/, label: "l'hiver" },
      { re: /bureau|travail/, label: "le bureau" },
      { re: /soiree/, label: "la soirée" },
      { re: /boise|bois/, label: "les notes boisées" },
      { re: /homme|masculin/, label: "homme" },
      { re: /budget|pas cher|moins de/, label: "petit budget" },
    ];
    const hit = topics.find((t) => t.re.test(q));
    return hit?.label || null;
  }

  function sendMockResponse(userMessage) {
    const q = userMessage.trim().toLowerCase();
    const s = store();

    if (/^(salut|bonjour|hello|coucou|hey)\b/.test(q)) {
      return "Bonjour ! Je suis votre conseiller Korei. Décrivez une note (oud, vanille, cuir…), une saison, une occasion ou un budget — je vous propose 2 ou 3 parfums du catalogue.";
    }
    if (/merci|thanks/.test(q)) {
      return "Avec plaisir ! Dites-moi si vous voulez d'autres idées olfactives.";
    }

    if (!s) {
      return "Le catalogue n'est pas chargé. Rechargez la page et réessayez.";
    }

    const recommendations = s.recommendProducts(userMessage, 3);
    if (!recommendations.length) {
      return "Je n'ai pas trouvé une correspondance précise. Essayez : « oud soirée », « vanille gourmand », « frais été » ou « budget 10€ ».";
    }

    const topic = detectTopic(userMessage);
    const hasStrongMatch = recommendations.some((p) => s.scoreProductForQuery(p, userMessage) > 3);
    const intro = topic && hasStrongMatch
      ? `Pour <strong>${topic}</strong>, voici mes suggestions :`
      : hasStrongMatch
        ? "Voici ce qui correspond à votre recherche :"
        : "Nos coups de cœur du moment — peut-être un bon point de départ :";

    const lines = recommendations.map((p, i) => formatProductLine(p, i));
    const available = recommendations.filter((p) => p.supplierAvailable).length;

    let footer = "";
    if (available < recommendations.length) {
      footer = "<br><em>Certains produits peuvent être temporairement indisponibles.</em>";
    } else {
      footer = "<br>Cliquez sur un parfum pour voir la fiche détaillée.";
    }

    return `${intro}<br><br>${lines.join("<br>")}${footer}`;
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

    setTimeout(() => {
      typing?.remove();
      const reply = sendMockResponse(trimmed);
      addMessage(reply, "bot");
    }, 700);
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
        "Bonjour ! Décrivez ce que vous cherchez — note, saison, occasion ou budget. Je recommande des parfums depuis notre catalogue.",
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
    if (store()) buildChatContext();
  }

  global.KoreiChatbot = { open, close, toggle, buildChatContext };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
