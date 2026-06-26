/**
 * Korei — Chatbot conseiller olfactif
 *
 * Le widget appelle /api/chat lorsque GROQ_API_KEY est configurée côté serveur.
 * Le mock local reste disponible en fallback pour le développement statique.
 */
(function (global) {
  const store = () => global.KoreiProductStore;
  const API_ENDPOINT = "/api/chat";
  const STORAGE_KEY = "korei-chat-history";
  const MAX_STORED_MESSAGES = 12;

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
  let isSending = false;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadMessages() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved
        .filter((item) => (item.role === "user" || item.role === "bot") && typeof item.text === "string")
        .map((item) => ({ ...item, trustedHtml: Boolean(item.trustedHtml) }))
        .slice(-MAX_STORED_MESSAGES);
    } catch (error) {
      return [];
    }
  }

  function saveMessages() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch (error) {
      // sessionStorage can be unavailable in private contexts.
    }
  }

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

  function productById(id) {
    return store()?.getProductById(id) || null;
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

  function formatBotText(text, trustedHtml = false) {
    const safe = trustedHtml ? String(text || "") : escapeHtml(text).replace(/\n/g, "<br>");
    return safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function renderProductLinks(productIds = []) {
    const products = [...new Set(productIds)]
      .map(productById)
      .filter(Boolean)
      .slice(0, 3);

    if (!products.length) return "";

    const links = products.map((product, index) => formatProductLine(product, index));
    return `<br><br>${links.join("<br>")}<br>Cliquez sur un parfum pour voir la fiche détaillée.`;
  }

  function buildApiHistory() {
    return messages
      .slice(-MAX_STORED_MESSAGES)
      .map((message) => ({
        role: message.role,
        text: message.text.replace(/<[^>]+>/g, " "),
      }));
  }

  async function sendToAI(userMessage) {
    const s = store();
    if (!s) throw new Error("Product store unavailable");

    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        history: buildApiHistory().slice(0, -1),
        catalog: s.buildCatalogContext(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || "Chat API unavailable");
      error.status = res.status;
      error.retryAfter = res.headers.get("Retry-After");
      throw error;
    }

    const productLinks = renderProductLinks(data.productIds);
    const safeReply = escapeHtml(data.reply || "").replace(/\n/g, "<br>");

    return {
      text: productLinks ? `${safeReply}${productLinks}` : data.reply || "",
      trustedHtml: Boolean(productLinks),
    };
  }

  function fallbackIntro(error) {
    if (error?.status === 429) {
      const wait = error.retryAfter ? ` Réessayez dans ${error.retryAfter}s.` : "";
      return `Le conseiller IA reçoit beaucoup de demandes.${wait} En attendant, voici une recommandation locale :`;
    }

    return "Le conseiller IA est momentanément indisponible. Voici une recommandation locale :";
  }

  function setSendingState(isBusy) {
    isSending = isBusy;
    const el = getElements();
    if (el.input) el.input.disabled = isBusy;
    const submit = el.form?.querySelector("button[type=\"submit\"]");
    if (submit) submit.disabled = isBusy;
  }

  function addMessage(text, role, options = {}) {
    messages.push({ text, role, trustedHtml: Boolean(options.trustedHtml) });
    saveMessages();
    const el = getElements();
    if (!el.messages) return;

    const div = document.createElement("div");
    div.className = `chatbot-msg chatbot-msg--${role}`;
    div.innerHTML =
      role === "bot"
        ? `<div class="chatbot-avatar"><i class="ti ti-sparkles"></i></div><div class="chatbot-bubble">${formatBotText(text, options.trustedHtml)}</div>`
        : `<div class="chatbot-bubble">${escapeHtml(text)}</div>`;
    el.messages.appendChild(div);
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  function renderSavedMessages() {
    const saved = loadMessages();
    if (!saved.length) return;

    messages = [];
    saved.forEach((message) => {
      addMessage(message.text, message.role, { trustedHtml: message.trustedHtml });
    });
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

  async function handleUserMessage(text) {
    if (isSending) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage(trimmed, "user");
    const el = getElements();
    if (el.input) el.input.value = "";
    setSendingState(true);

    const typing = showTyping();

    try {
      const reply = await sendToAI(trimmed);
      typing?.remove();
      addMessage(reply.text, "bot", { trustedHtml: reply.trustedHtml });
    } catch (error) {
      typing?.remove();
      const reply = sendMockResponse(trimmed);
      addMessage(`${fallbackIntro(error)}<br><br>${reply}`, "bot", { trustedHtml: true });
    } finally {
      setSendingState(false);
    }
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
      renderSavedMessages();
      if (messages.length === 0) {
        addMessage(
          "Bonjour ! Décrivez ce que vous cherchez — note, saison, occasion ou budget. Je recommande des parfums depuis notre catalogue.",
          "bot"
        );
      }
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
