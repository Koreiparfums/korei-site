/**
 * Korei — Dashboard admin catalogue.
 * Parcourt les CSV Fragrantica (produits/*.csv), permet la curation manuelle
 * (ajout / édition / suppression, sillage & longévité définis à la main) et
 * pilote /api/admin/catalog (protégé par ADMIN_TOKEN).
 */
(function () {
  const TOKEN_KEY = "korei-admin-token";
  const CSV_BRANDS = [
    { id: "dior", label: "Dior", file: "../produits/dior.csv" },
    { id: "byredo", label: "Byredo", file: "../produits/byredo.csv" },
    { id: "louis-vuitton", label: "Louis Vuitton", file: "../produits/louis-vuitton.csv" },
  ];

  const FAMILY_OPTIONS = [
    { value: "oriental", label: "Oriental" },
    { value: "boisé", label: "Boisé" },
    { value: "floral", label: "Floral" },
    { value: "gourmand", label: "Gourmand" },
    { value: "cuir", label: "Cuir" },
    { value: "fruity", label: "Fruité" },
    { value: "aromatique", label: "Aromatique" },
  ];
  const OCCASION_OPTIONS = [
    { value: "soirée", label: "Soirée" },
    { value: "bureau", label: "Bureau" },
    { value: "date", label: "Rendez-vous" },
    { value: "quotidien", label: "Quotidien" },
  ];
  const SEASON_OPTIONS = [
    { value: "été", label: "Été" },
    { value: "hiver", label: "Hiver" },
    { value: "automne", label: "Automne" },
    { value: "printemps", label: "Printemps" },
  ];
  const GENDER_OPTIONS = [
    { value: "unisexe", label: "Unisexe" },
    { value: "homme", label: "Homme" },
    { value: "femme", label: "Femme" },
  ];
  const INTENSITY_OPTIONS = [
    { value: "léger", label: "Léger" },
    { value: "modéré", label: "Modéré" },
    { value: "intense", label: "Intense" },
  ];
  const BADGE_OPTIONS = [
    { value: "", label: "Aucun" },
    { value: "best", label: "Best-seller" },
    { value: "new", label: "Nouveauté" },
    { value: "exclusive", label: "Exclusif" },
  ];
  const SILLAGE_LABELS = { 1: "Doux", 2: "Modéré", 3: "Fort", 4: "Énorme" };
  const LONGEVITY_LABELS = { 1: "Très faible", 2: "Faible", 3: "Modérée", 4: "Longue durée", 5: "Éternelle" };

  const FAMILY_KEYWORDS = {
    boisé: ["woody", "wood", "cedar", "sandalwood", "vetiver", "oakmoss", "patchouli"],
    cuir: ["leather", "animalic", "suede", "castoreum"],
    gourmand: ["vanilla", "sweet", "honey", "gourmand", "chocolate", "caramel", "tonka", "almond", "coconut"],
    floral: ["floral", "white floral", "rose", "jasmine", "iris", "violet", "ylang", "mimosa", "peony", "tuberose"],
    fruity: ["fruity", "citrus", "fruit", "berry", "peach", "apple", "pear", "melon"],
    aromatique: ["aromatic", "herbal", "green", "lavender", "mint", "fresh spicy"],
    oriental: ["amber", "oud", "warm spicy", "spicy", "resin", "incense", "musky", "powdery", "smoky", "balsamic"],
  };

  const state = {
    token: sessionStorage.getItem(TOKEN_KEY) || "",
    tab: "catalogue",
    catalogProducts: [],
    csvCache: {},
    editing: null, // { mode: 'create' | 'edit' | 'from-csv', product }
  };

  const el = (sel, root = document) => root.querySelector(sel);
  const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ── Utils
  function normalizeKey(brand, name) {
    return `${brand}|${name}`
      .toLowerCase()
      .normalize("NFD")
      .replace(new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g"), "")
      .replace(/[^a-z0-9|]+/g, "");
  }

  function guessFamily(mainAccords) {
    const accords = (mainAccords || "").split(";").map((a) => a.trim().toLowerCase()).filter(Boolean);
    const scores = {};
    accords.forEach((accord) => {
      Object.entries(FAMILY_KEYWORDS).forEach(([family, keywords]) => {
        if (keywords.some((k) => accord.includes(k))) scores[family] = (scores[family] || 0) + 1;
      });
    });
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : "";
  }

  // ── Parseur CSV (guillemets + virgules + "" échappé)
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 1;
          } else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // ignoré, \n suit
      } else {
        field += c;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    const header = (rows.shift() || []).map((h) => h.trim());
    return rows
      .filter((r) => r.some((cell) => cell.trim() !== ""))
      .map((r) => Object.fromEntries(header.map((key, idx) => [key, (r[idx] || "").trim()])));
  }

  async function loadCsvBrand(brandId) {
    if (state.csvCache[brandId]) return state.csvCache[brandId];
    const meta = CSV_BRANDS.find((b) => b.id === brandId);
    const response = await fetch(meta.file);
    const text = await response.text();
    const rows = parseCsv(text);
    state.csvCache[brandId] = rows;
    return rows;
  }

  // ── API
  async function apiFetch(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "x-admin-token": state.token,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    if (response.status === 401) {
      logout("Session expirée ou mot de passe incorrect.");
      throw new Error("unauthorized");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || "Erreur serveur");
    return data;
  }

  async function refreshCatalog() {
    const data = await apiFetch("/api/admin/catalog");
    state.catalogProducts = data.products || [];
    renderTab();
  }

  // ── Auth
  function showLogin(message) {
    el("#admin-login").hidden = false;
    el("#admin-app").hidden = true;
    el("#login-error").textContent = message || "";
  }

  function logout(message) {
    state.token = "";
    sessionStorage.removeItem(TOKEN_KEY);
    showLogin(message);
  }

  async function tryLogin(token) {
    state.token = token;
    try {
      await refreshCatalog();
      sessionStorage.setItem(TOKEN_KEY, token);
      el("#admin-login").hidden = true;
      el("#admin-app").hidden = false;
    } catch (error) {
      state.token = "";
      showLogin("Mot de passe incorrect.");
    }
  }

  // ── Rendu : onglets
  function setTab(tab) {
    state.tab = tab;
    els(".admin-tab").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tab === tab));
    renderTab();
  }

  function renderTab() {
    el("#tab-catalogue").hidden = state.tab !== "catalogue";
    el("#tab-import").hidden = state.tab !== "import";
    if (state.tab === "catalogue") renderCatalogueTab();
    else renderImportTab();
  }

  function productRowMeta(product) {
    const tags = [];
    if (product.published === false) tags.push('<span class="admin-pill admin-pill--draft">Brouillon</span>');
    if (product.bestseller) tags.push('<span class="admin-pill admin-pill--best">Best-seller</span>');
    if (product.new) tags.push('<span class="admin-pill admin-pill--new">Nouveauté</span>');
    return tags.join(" ");
  }

  function renderCatalogueTab() {
    const list = el("#catalogue-list");
    if (!state.catalogProducts.length) {
      list.innerHTML = `<p class="admin-empty">Aucun parfum dans le catalogue admin pour l'instant. Importez-en un depuis l'onglet CSV, ou créez-le manuellement.</p>`;
      return;
    }
    const sorted = [...state.catalogProducts].sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
    list.innerHTML = sorted
      .map(
        (p) => `
        <div class="admin-row" data-id="${p.id}">
          <div class="admin-row-main">
            <strong>${p.name}</strong>
            <span class="admin-row-sub">${p.brand} · ${p.family || "famille ?"} · ${p.gender} · ${p.price}€</span>
            <div class="admin-row-tags">${productRowMeta(p)}</div>
          </div>
          <div class="admin-row-actions">
            <button type="button" class="admin-btn admin-btn--ghost" data-action="edit">Éditer</button>
            <button type="button" class="admin-btn admin-btn--danger" data-action="delete">Supprimer</button>
          </div>
        </div>`,
      )
      .join("");
  }

  function renderImportTab() {
    const list = el("#import-list");
    const brandFilter = el("#import-brand-filter").value;
    const genderFilter = el("#import-gender-filter").value;
    const search = el("#import-search").value.trim().toLowerCase();

    const importedKeys = new Set(state.catalogProducts.map((p) => normalizeKey(p.brand, p.name)));
    const localProducts = (window.KoreiProducts && window.KoreiProducts.PRODUCTS) || [];
    localProducts.forEach((p) => importedKeys.add(normalizeKey(p.brand, p.name)));

    const brandsToShow = brandFilter ? [brandFilter] : CSV_BRANDS.map((b) => b.id);

    Promise.all(brandsToShow.map((id) => loadCsvBrand(id).then((rows) => ({ id, rows })))).then((results) => {
      let rows = [];
      results.forEach(({ id, rows: brandRows }) => {
        const brandLabel = CSV_BRANDS.find((b) => b.id === id).label;
        brandRows.forEach((row) => rows.push({ ...row, __brandId: id, __brandLabel: brandLabel }));
      });

      if (genderFilter) rows = rows.filter((r) => (r.gender || "").toLowerCase() === genderFilter);
      if (search) rows = rows.filter((r) => r.name.toLowerCase().includes(search));

      rows.sort((a, b) => a.name.localeCompare(b.name));
      const MAX_ROWS = 200;
      const total = rows.length;
      rows = rows.slice(0, MAX_ROWS);

      list.innerHTML = rows
        .map((row) => {
          const key = normalizeKey(row.__brandLabel, row.name);
          const already = importedKeys.has(key);
          return `
          <div class="admin-row${already ? " is-imported" : ""}" data-brand="${row.__brandId}" data-name="${encodeURIComponent(row.name)}">
            <div class="admin-row-main">
              <strong>${row.name}</strong>
              <span class="admin-row-sub">${row.__brandLabel} · ${row.gender || "?"} · ${row.release_year || "?"} · ${(row.main_accords || "").split(";").slice(0, 3).join(", ")}</span>
            </div>
            <div class="admin-row-actions">
              ${already ? '<span class="admin-pill">Déjà au catalogue</span>' : '<button type="button" class="admin-btn" data-action="import">Importer</button>'}
            </div>
          </div>`;
        })
        .join("");

      el("#import-count").textContent = `${Math.min(total, MAX_ROWS)} / ${total} résultat${total > 1 ? "s" : ""}${total > MAX_ROWS ? " (affinez la recherche)" : ""}`;
    });
  }

  // ── Formulaire (création / édition / import CSV)
  function optionsHtml(options, selected) {
    return options.map((o) => `<option value="${o.value}"${o.value === selected ? " selected" : ""}>${o.label}</option>`).join("");
  }

  function chipsHtml(options, selectedValues, group) {
    return options
      .map(
        (o) =>
          `<button type="button" class="admin-chip${selectedValues.includes(o.value) ? " is-active" : ""}" data-group="${group}" data-value="${o.value}">${o.label}</button>`,
      )
      .join("");
  }

  function tagInputHtml(fieldId, tags) {
    return `
      <div class="admin-tags" id="${fieldId}" data-tags='${JSON.stringify(tags)}'>
        ${tags.map((t) => `<span class="admin-tag">${t}<button type="button" data-remove="${t}">×</button></span>`).join("")}
        <input type="text" placeholder="Ajouter une note + Entrée" data-tag-input />
      </div>`;
  }

  function getTagValues(container) {
    return els(".admin-tag", container).map((tag) => tag.firstChild.textContent.trim());
  }

  function wireTagInput(container) {
    const input = el("[data-tag-input]", container);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const value = input.value.trim().replace(/,$/, "");
        if (value) {
          const chip = document.createElement("span");
          chip.className = "admin-tag";
          chip.innerHTML = `${value}<button type="button" data-remove="${value}">×</button>`;
          container.insertBefore(chip, input);
        }
        input.value = "";
      }
    });
    container.addEventListener("click", (e) => {
      if (e.target.matches("[data-remove]")) e.target.closest(".admin-tag").remove();
    });
  }

  function draftFromCsvRow(row, brandLabel, brandId) {
    return {
      brand: brandLabel,
      brandId,
      name: row.name,
      gender: (row.gender || "unisexe").toLowerCase(),
      family: guessFamily(row.main_accords),
      notesTop: (row.notes_top || "").split(";").map((s) => s.trim()).filter(Boolean),
      notesHeart: (row.notes_heart || "").split(";").map((s) => s.trim()).filter(Boolean),
      notesBase: (row.notes_base || "").split(";").map((s) => s.trim()).filter(Boolean),
      concentration: row.concentration || "",
      releaseYear: row.release_year ? Number(row.release_year) : null,
      fragranticaUrl: row.fragrantica_url || "",
      fragranticaRating: row.fragrantica_rating ? Number(row.fragrantica_rating) : null,
      intensity: "modéré",
      occasions: [],
      seasons: [],
      price: 12,
      rating: row.fragrantica_rating ? Number(row.fragrantica_rating) : 0,
      badge: "",
      bestseller: false,
      new: false,
      image: "",
      description: "",
      published: true,
    };
  }

  function blankDraft() {
    return {
      brand: "",
      brandId: "",
      name: "",
      gender: "unisexe",
      family: "",
      notesTop: [],
      notesHeart: [],
      notesBase: [],
      concentration: "",
      releaseYear: null,
      fragranticaUrl: "",
      fragranticaRating: null,
      intensity: "modéré",
      sillage: 2,
      longevity: 3,
      occasions: [],
      seasons: [],
      price: 12,
      rating: 0,
      badge: "",
      bestseller: false,
      new: false,
      image: "",
      description: "",
      published: true,
    };
  }

  function openForm(product, mode) {
    state.editing = { mode, id: product.id || null };
    const dialog = el("#admin-form-dialog");
    const sillage = product.sillage || 2;
    const longevity = product.longevity || 3;

    el("#form-title").textContent = mode === "edit" ? `Éditer — ${product.name}` : "Nouveau parfum";
    el("#field-brand").value = product.brand || "";
    el("#field-name").value = product.name || "";
    el("#field-gender").innerHTML = optionsHtml(GENDER_OPTIONS, product.gender || "unisexe");
    el("#field-family").innerHTML = `<option value="">— choisir —</option>${optionsHtml(FAMILY_OPTIONS, product.family || "")}`;
    el("#field-intensity").innerHTML = optionsHtml(INTENSITY_OPTIONS, product.intensity || "modéré");
    el("#field-badge").innerHTML = optionsHtml(BADGE_OPTIONS, product.badge || "");
    el("#field-price").value = product.price ?? 12;
    el("#field-rating").value = product.rating ?? 0;
    el("#field-image").value = product.image || "";
    el("#field-description").value = product.description || "";
    el("#field-concentration").value = product.concentration || "";
    el("#field-release-year").value = product.releaseYear || "";
    el("#field-fragrantica-url").value = product.fragranticaUrl || "";
    el("#field-bestseller").checked = Boolean(product.bestseller);
    el("#field-new").checked = Boolean(product.new);
    el("#field-published").checked = product.published !== false;

    el("#field-sillage").value = sillage;
    el("#field-sillage-label").textContent = SILLAGE_LABELS[sillage];
    el("#field-longevity").value = longevity;
    el("#field-longevity-label").textContent = LONGEVITY_LABELS[longevity];

    el("#field-occasions").innerHTML = chipsHtml(OCCASION_OPTIONS, product.occasions || [], "occasions");
    el("#field-seasons").innerHTML = chipsHtml(SEASON_OPTIONS, product.seasons || [], "seasons");

    const notesTopContainer = el("#field-notes-top");
    const notesHeartContainer = el("#field-notes-heart");
    const notesBaseContainer = el("#field-notes-base");
    notesTopContainer.outerHTML = tagInputHtml("field-notes-top", product.notesTop || []);
    notesHeartContainer.outerHTML = tagInputHtml("field-notes-heart", product.notesHeart || []);
    notesBaseContainer.outerHTML = tagInputHtml("field-notes-base", product.notesBase || []);
    wireTagInput(el("#field-notes-top"));
    wireTagInput(el("#field-notes-heart"));
    wireTagInput(el("#field-notes-base"));

    dialog.showModal();
  }

  function closeForm() {
    el("#admin-form-dialog").close();
    state.editing = null;
  }

  function collectFormPayload() {
    const badge = el("#field-badge").value;
    const badgeLabel = badge === "best" ? "Best-seller" : badge === "new" ? "Nouveauté" : badge === "exclusive" ? "Exclusif" : null;
    return {
      brand: el("#field-brand").value.trim(),
      name: el("#field-name").value.trim(),
      gender: el("#field-gender").value,
      family: el("#field-family").value,
      intensity: el("#field-intensity").value,
      sillage: Number(el("#field-sillage").value),
      longevity: Number(el("#field-longevity").value),
      price: Number(el("#field-price").value) || 0,
      rating: Number(el("#field-rating").value) || 0,
      badge: badge || null,
      badgeLabel,
      image: el("#field-image").value.trim(),
      description: el("#field-description").value.trim(),
      concentration: el("#field-concentration").value.trim(),
      releaseYear: el("#field-release-year").value ? Number(el("#field-release-year").value) : null,
      fragranticaUrl: el("#field-fragrantica-url").value.trim(),
      bestseller: el("#field-bestseller").checked,
      new: el("#field-new").checked,
      published: el("#field-published").checked,
      notesTop: getTagValues(el("#field-notes-top")),
      notesHeart: getTagValues(el("#field-notes-heart")),
      notesBase: getTagValues(el("#field-notes-base")),
      occasions: els(".admin-chip.is-active", el("#field-occasions")).map((c) => c.dataset.value),
      seasons: els(".admin-chip.is-active", el("#field-seasons")).map((c) => c.dataset.value),
    };
  }

  async function submitForm(e) {
    e.preventDefault();
    const payload = collectFormPayload();
    if (!payload.brand || !payload.name) {
      el("#form-error").textContent = "Marque et nom sont requis.";
      return;
    }
    try {
      if (state.editing.mode === "edit") {
        await apiFetch(`/api/admin/catalog?id=${encodeURIComponent(state.editing.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/catalog", { method: "POST", body: JSON.stringify(payload) });
      }
      closeForm();
      await refreshCatalog();
      setTab("catalogue");
    } catch (error) {
      el("#form-error").textContent = error.message || "Erreur lors de l'enregistrement.";
    }
  }

  async function deleteProductById(id) {
    if (!confirm("Supprimer ce parfum du catalogue admin ?")) return;
    await apiFetch(`/api/admin/catalog?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await refreshCatalog();
  }

  // ── Init
  function bindEvents() {
    el("#login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const token = el("#login-token").value.trim();
      if (token) tryLogin(token);
    });

    el("#logout-btn").addEventListener("click", () => logout());

    els(".admin-tab").forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));

    el("#new-product-btn").addEventListener("click", () => openForm(blankDraft(), "create"));

    el("#catalogue-list").addEventListener("click", (e) => {
      const row = e.target.closest(".admin-row");
      if (!row) return;
      const product = state.catalogProducts.find((p) => p.id === row.dataset.id);
      if (e.target.dataset.action === "edit") openForm(product, "edit");
      if (e.target.dataset.action === "delete") deleteProductById(product.id);
    });

    el("#import-list").addEventListener("click", async (e) => {
      if (e.target.dataset.action !== "import") return;
      const row = e.target.closest(".admin-row");
      const brandId = row.dataset.brand;
      const name = decodeURIComponent(row.dataset.name);
      const rows = await loadCsvBrand(brandId);
      const csvRow = rows.find((r) => r.name === name);
      const brandLabel = CSV_BRANDS.find((b) => b.id === brandId).label;
      openForm({ ...blankDraft(), ...draftFromCsvRow(csvRow, brandLabel, brandId) }, "create");
    });

    ["#import-brand-filter", "#import-gender-filter", "#import-search"].forEach((sel) => {
      el(sel).addEventListener("input", () => renderImportTab());
    });

    el("#field-sillage").addEventListener("input", (e) => {
      el("#field-sillage-label").textContent = SILLAGE_LABELS[e.target.value];
    });
    el("#field-longevity").addEventListener("input", (e) => {
      el("#field-longevity-label").textContent = LONGEVITY_LABELS[e.target.value];
    });

    el("#admin-form").addEventListener("submit", submitForm);
    el("#form-cancel").addEventListener("click", closeForm);

    el("#field-occasions").addEventListener("click", (e) => {
      if (e.target.matches(".admin-chip")) e.target.classList.toggle("is-active");
    });
    el("#field-seasons").addEventListener("click", (e) => {
      if (e.target.matches(".admin-chip")) e.target.classList.toggle("is-active");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    if (state.token) tryLogin(state.token);
    else showLogin();
  });
})();
