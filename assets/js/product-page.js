/**
 * Kōrei — Fiche produit (page dédiée)
 * Construit les 11 sections de la fiche produit à partir des données du
 * catalogue (KoreiProductStore) et des rendus partagés exposés par main.js
 * (window.KoreiUI). Isolé de main.js pour rester maintenable.
 */
(function (global) {
  const site = global.KoreiSite;
  const store = global.KoreiProductStore;
  const ui = global.KoreiUI || {};

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
  }

  // ── Familles olfactives (contenu éditorial générique, réel — non spécifique au produit)
  const FAMILY_INFO = {
    oriental: {
      label: "Oriental",
      icon: "ti-flame",
      originality: 88,
      desc: "Chaleureuse et enveloppante, la famille orientale marie épices, résines et notes ambrées pour une signature sensuelle et intense, souvent portée en soirée.",
    },
    boisé: {
      label: "Boisé",
      icon: "ti-trees",
      originality: 75,
      desc: "Structurée autour de bois nobles — santal, cèdre, vétiver — la famille boisée apporte profondeur, sillage et une élégance résolument intemporelle.",
    },
    cuir: {
      label: "Cuir",
      icon: "ti-shirt",
      originality: 92,
      desc: "Animale et texturée, la famille cuir évoque le cuir tanné et les accords fumés, pour un caractère affirmé et résolument moderne.",
    },
    floral: {
      label: "Floral",
      icon: "ti-flower",
      originality: 55,
      desc: "Bouquet de fleurs blanches, de rose ou de jasmin, la famille florale incarne l'élégance classique — féminine, lumineuse et raffinée.",
    },
    aromatique: {
      label: "Aromatique",
      icon: "ti-leaf",
      originality: 60,
      desc: "Fraîche et herbacée, la famille aromatique puise dans la lavande, le romarin et les herbes méditerranéennes pour une signature vive et naturelle.",
    },
    gourmand: {
      label: "Gourmand",
      icon: "ti-cookie",
      originality: 70,
      desc: "Sucrée et réconfortante, la famille gourmande joue sur la vanille, le caramel et les notes comestibles pour une fragrance chaleureuse et addictive.",
    },
    fruity: {
      label: "Fruité",
      icon: "ti-apple",
      originality: 50,
      desc: "Juteuse et pétillante, la famille fruitée met en avant des notes de fruits mûrs pour une ouverture gourmande et vitaminée.",
    },
  };
  const DEFAULT_FAMILY = { label: "Signature", icon: "ti-droplet", originality: 65, desc: "Une composition à la classification singulière, pensée pour se distinguer." };

  function familyInfo(product) {
    return FAMILY_INFO[product.family] || DEFAULT_FAMILY;
  }


  // ── Galerie (duplique l'unique photo tant qu'il n'y a pas plusieurs angles réels)
  function galleryImages(product, basePath) {
    const src = ui.productImageSrc ? ui.productImageSrc(product, basePath) : null;
    if (!src) return [];
    if (Array.isArray(product.images) && product.images.length) {
      return product.images.map((p) => (site?.withBase ? site.withBase(p, basePath) : `${basePath}${p}`));
    }
    return Array(5).fill(src);
  }

  function renderBadges(product) {
    const badges = [`<span class="pdp-badge pdp-badge--authentic"><i class="ti ti-shield-check"></i>Authentique</span>`];
    if (product.badge === "exclusive") {
      badges.push(`<span class="pdp-badge pdp-badge--limited">Édition limitée</span>`);
    }
    return badges.join("");
  }

  function uniqueNotes(product) {
    const seen = new Set();
    return [...(product.notesTop || []), ...(product.notesHeart || []), ...(product.notesBase || [])].filter((note) => {
      const key = note.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function renderGallery(product, basePath) {
    const images = galleryImages(product, basePath);
    const alt = `${product.brand} ${product.name}`;
    const notes = uniqueNotes(product);
    return `
      <div class="pdp-gallery">
        <div class="pdp-gallery__thumbs">
          ${images
            .map(
              (src, i) => `
            <button class="pdp-thumb${i === 0 ? " is-active" : ""}" type="button" data-thumb-index="${i}" aria-label="Photo ${i + 1}">
              <img src="${src}" alt="" loading="lazy" />
            </button>`
            )
            .join("")}
        </div>
        <div class="pdp-gallery__mainstack">
          <div class="pdp-gallery__main">
            <div class="pdp-badges">${renderBadges(product)}</div>
            <img class="pdp-gallery__main-img" id="pdp-main-img" src="${images[0] || ""}" alt="${alt}" onerror="this.style.opacity=0" />
          </div>
          ${
            notes.length
              ? `
          <div class="pdp-gallery__notes">
            ${notes
              .map(
                (note) => `
              <span class="pdp-gallery__note" title="${note}">
                ${ui.noteImageHtml ? ui.noteImageHtml(note, basePath) : ""}
              </span>`
              )
              .join("")}
          </div>`
              : ""
          }
        </div>
      </div>`;
  }

  function initGallery(root, images) {
    const mainImg = root.querySelector("#pdp-main-img");
    const thumbs = Array.from(root.querySelectorAll(".pdp-thumb"));
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        thumbs.forEach((t) => t.classList.remove("is-active"));
        thumb.classList.add("is-active");
        if (mainImg) mainImg.src = images[Number(thumb.dataset.thumbIndex)];
      });
    });
  }

  // ── Formats & prix
  function getFormats(product) {
    const price2 = product.price;
    const price5 = Math.round(product.price * 2.2);
    const price10 = Math.round(product.price * 3.8);
    const priceFlacon = product.flaconPrice || Math.round(product.price * 9.5);
    return [
      { vol: "2 ml", price: price2 },
      { vol: "5 ml", price: price5 },
      { vol: "10 ml", price: price10 },
      { vol: "Flacon", price: priceFlacon },
    ];
  }

  function renderFormats(formats) {
    return `
      <div class="pdp-formats" role="radiogroup" aria-label="Format">
        ${formats
          .map(
            (f, i) => `
          <button class="pdp-format${i === 0 ? " is-active" : ""}" type="button" role="radio" aria-checked="${i === 0}" data-price="${f.price}" data-vol="${f.vol.replace(/\s+/g, "").toLowerCase()}">
            <span class="pdp-format__vol">${f.vol}</span>
            <span class="pdp-format__price">${f.price}€</span>
          </button>`
          )
          .join("")}
      </div>`;
  }

  // ── Section 1 : Hero
  function renderHero(product, basePath) {
    const formats = getFormats(product);
    return `
      <section class="pdp-hero">
        <div class="pdp-hero__grid">
          ${renderGallery(product, basePath)}
          <div class="pdp-info pdp-reveal">
            <div class="pdp-brand">${product.brand}</div>
            <h1 class="pdp-name">${product.name}</h1>
            <div class="pdp-rating-line">${ui.renderStars ? ui.renderStars(product.rating) : ""}</div>
            <p class="pdp-price-lead">À partir de <strong>${formats[0].price}€</strong></p>

            <span class="pdp-label">Choisir un format</span>
            ${renderFormats(formats)}

            <p class="pdp-desc">${product.description}</p>

            <div class="pdp-actions">
              <div class="pdp-actions__row">
                <button class="pdp-btn pdp-btn--primary" id="pdp-cta" type="button" disabled title="Bientôt disponible">
                  Bientôt disponible
                </button>
                <button class="pdp-btn pdp-btn--ghost" id="pdp-fav" type="button" aria-label="Ajouter aux favoris" aria-pressed="false">
                  <i class="ti ti-heart"></i>
                </button>
              </div>
              <button class="pdp-btn pdp-btn--outline" id="pdp-add-coffret" type="button">
                <i class="ti ti-package"></i>
                <span id="pdp-coffret-label">Ajouter à mon coffret</span>
              </button>
            </div>

            <div class="pdp-trust">
              <div class="pdp-trust__track">
                <div class="pdp-trust__item"><i class="ti ti-certificate"></i><span>Authentique</span></div>
                <div class="pdp-trust__item"><i class="ti ti-truck-delivery"></i><span>Livraison 24-48h</span></div>
                <div class="pdp-trust__item"><i class="ti ti-flask"></i><span>Préparé à la commande</span></div>
                <div class="pdp-trust__item"><i class="ti ti-bottle"></i><span>Flacon premium</span></div>
                <div class="pdp-trust__item"><i class="ti ti-certificate"></i><span>Authentique</span></div>
                <div class="pdp-trust__item"><i class="ti ti-truck-delivery"></i><span>Livraison 24-48h</span></div>
                <div class="pdp-trust__item"><i class="ti ti-flask"></i><span>Préparé à la commande</span></div>
                <div class="pdp-trust__item"><i class="ti ti-bottle"></i><span>Flacon premium</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  }

  function initHero(main, product) {
    const formatBtns = Array.from(main.querySelectorAll(".pdp-format"));
    const coffretBtn = main.querySelector("#pdp-add-coffret");
    const coffretLabel = main.querySelector("#pdp-coffret-label");
    const coffret = global.KoreiCoffret;

    const updateCoffretButton = () => {
      if (!coffretBtn) return;
      const vol = main.querySelector(".pdp-format.is-active")?.dataset.vol;
      if (!coffret || !coffret.isEligibleFormat(vol)) {
        coffretBtn.disabled = true;
        coffretBtn.classList.remove("is-active");
        if (coffretLabel) coffretLabel.textContent = "Coffrets : décants uniquement";
        return;
      }
      coffretBtn.disabled = false;
      const already = coffret.hasItem(product.id, vol);
      coffretBtn.classList.toggle("is-active", already);
      if (coffretLabel) coffretLabel.textContent = already ? "Déjà dans mon coffret — retirer" : "Ajouter à mon coffret";
    };

    formatBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        formatBtns.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-checked", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-checked", "true");
        updateCoffretButton();
      });
    });

    coffretBtn?.addEventListener("click", () => {
      const activeBtn = main.querySelector(".pdp-format.is-active");
      const vol = activeBtn?.dataset.vol;
      if (!coffret || !coffret.isEligibleFormat(vol)) return;
      if (coffret.hasItem(product.id, vol)) {
        coffret.removeItem(product.id, vol);
      } else {
        coffret.addItem({
          productId: product.id,
          name: product.name,
          brand: product.brand,
          format: vol,
          price: Number(activeBtn.dataset.price),
        });
      }
      updateCoffretButton();
    });

    updateCoffretButton();

    const favBtn = main.querySelector("#pdp-fav");
    favBtn?.addEventListener("click", () => {
      const isActive = favBtn.classList.toggle("is-active");
      favBtn.setAttribute("aria-pressed", String(isActive));
      const icon = favBtn.querySelector("i");
      if (icon) icon.className = isActive ? "ti ti-heart-filled" : "ti ti-heart";
    });
  }

  // ── Section 2 : Histoire
  function renderStory(product) {
    return `
      <section class="pdp-story">
        <div class="pdp-story__grid">
          <div class="pdp-story__text pdp-reveal">
            <div class="pdp-eyebrow">L'histoire</div>
            <p>
              Chez Kōrei, chaque flacon est choisi avec la même exigence : celle de maisons de
              parfumerie de niche qui refusent le compromis. <em>${product.name}</em> a rejoint
              notre sélection pour sa signature ${familyInfo(product).label.toLowerCase()} —
              une composition que nous avons voulu rendre accessible dès quelques millilitres,
              sans jamais transiger sur l'authenticité.
            </p>
            <p>
              Chaque décant est prélevé à la main depuis un flacon d'origine, dans le respect
              total du parfum et de la maison qui l'a créé. Vous recevez exactement la même
              fragrance que le flacon complet — simplement le format qui vous correspond.
            </p>
          </div>
          <div class="pdp-story__media pdp-reveal">
            ${site?.renderPlaceholder ? site.renderPlaceholder("lifestyle", { title: product.brand, subtitle: product.name }) : ""}
          </div>
        </div>
      </section>`;
  }

  // ── Section 4 : Famille olfactive
  function renderFamily(product) {
    const family = familyInfo(product);
    return `
      <section class="pdp-family">
        <div class="pdp-family__grid">
          <div class="pdp-family__media pdp-reveal">
            ${site?.renderPlaceholder ? site.renderPlaceholder("lifestyle", { title: family.label, subtitle: "Famille olfactive" }) : ""}
          </div>
          <div class="pdp-family__text pdp-reveal">
            <div class="pdp-eyebrow">Famille olfactive</div>
            <h2 class="pdp-family__name">${family.label}</h2>
            <p class="pdp-family__desc">${family.desc}</p>
          </div>
        </div>
      </section>`;
  }

  // ── Section 3 : Notes phares (façon Fragrantica — photo + libellé par note)
  function renderNoteCard(note) {
    return `
      <div class="pdp-note-card" title="${note}">
        ${ui.noteImageHtml ? ui.noteImageHtml(note, "../") : ""}
        <span>${note}</span>
      </div>`;
  }

  function renderNotesFeatured(product) {
    const tiers = [
      { label: "Notes de tête", notes: product.notesTop },
      { label: "Notes de cœur", notes: product.notesHeart },
      { label: "Notes de fond", notes: product.notesBase },
    ].filter((t) => t.notes.length);
    if (!tiers.length) return "";
    return `
      <section class="pdp-notes-featured pdp-reveal pdp-accordion" id="pdp-notes-featured">
        <button type="button" class="pdp-notes-featured__head pdp-accordion-head" aria-expanded="false">
          <h2>Notes phares</h2>
          <i class="ti ti-chevron-down pdp-accordion-chevron" aria-hidden="true"></i>
        </button>
        <div class="pdp-accordion-body"><div class="pdp-accordion-body-inner">
          ${tiers
            .map(
              (t) => `
            <div class="pdp-notes-tier">
              <div class="pdp-notes-tier__label">
                ${t.label} <i class="ti ti-info-circle" title="Notes perçues en ${t.label.split(" ").pop()}"></i>
              </div>
              <div class="pdp-notes-tier__row">
                ${t.notes.map(renderNoteCard).join("")}
              </div>
            </div>`
            )
            .join("")}
        </div></div>
      </section>`;
  }

  // ── Section 5 : Ressenti (façon Fragrantica — cartes avec l'option dominante mise en avant)
  const MOMENT_META = [
    { key: "soirée", label: "Soirée", icon: "ti-moon-stars" },
    { key: "quotidien", label: "Journée", icon: "ti-sun" },
    { key: "date", label: "Sortie nocturne", icon: "ti-glass-cocktail" },
    { key: "bureau", label: "Bureau", icon: "ti-building" },
  ];
  const SEASON_META = [
    { key: "automne", label: "Automne", icon: "ti-leaf" },
    { key: "hiver", label: "Hiver", icon: "ti-snowflake" },
    { key: "printemps", label: "Printemps", icon: "ti-flower" },
    { key: "été", label: "Été", icon: "ti-sun" },
  ];
  const LONGEVITY_META = [
    { level: 1, label: "Très faible", icon: "ti-battery" },
    { level: 2, label: "Faible", icon: "ti-battery-1" },
    { level: 3, label: "Modérée", icon: "ti-battery-2" },
    { level: 4, label: "Longue durée", icon: "ti-battery-4" },
    { level: 5, label: "Éternelle", icon: "ti-battery-charging" },
  ];
  const PROJECTION_META = [
    { level: 1, label: "Doux", icon: "ti-wifi-0" },
    { level: 2, label: "Modéré", icon: "ti-wifi-1" },
    { level: 3, label: "Fort", icon: "ti-wifi-2" },
    { level: 4, label: "Énorme", icon: "ti-wifi" },
  ];
  const LONGEVITY_LEVEL = { léger: 2, modéré: 3, intense: 5 };
  const PROJECTION_LEVEL = { léger: 1, modéré: 3, intense: 4 };

  function renderSentimentCard(item, isWinner) {
    return `
      <div class="pdp-sentiment-card${isWinner ? " is-winner" : ""}">
        <span class="pdp-sentiment-card__icon"><i class="ti ${item.icon}"></i></span>
        <span class="pdp-sentiment-card__label">${item.label}</span>
      </div>`;
  }

  function renderSentimentRow(label, cardsHtml) {
    return `
      <div class="pdp-sentiment-row">
        <div class="pdp-sentiment-row__label">${label} <i class="ti ti-info-circle"></i></div>
        <div class="pdp-sentiment-cards">${cardsHtml}</div>
      </div>`;
  }

  function renderSentiment(product) {
    const occasions = product.occasions || [];
    const seasons = product.seasons || [];
    const longevityLevel = product.longevity || LONGEVITY_LEVEL[product.intensity] || 3;
    const projectionLevel = product.sillage || PROJECTION_LEVEL[product.intensity] || 2;

    const momentCards = MOMENT_META.map((m) => renderSentimentCard(m, occasions.includes(m.key))).join("");
    const seasonCards = SEASON_META.map((s) => renderSentimentCard(s, seasons.includes(s.key))).join("");
    const longevityCards = LONGEVITY_META.map((l) => renderSentimentCard(l, l.level === longevityLevel)).join("");
    const projectionCards = PROJECTION_META.map((p) => renderSentimentCard(p, p.level === projectionLevel)).join("");

    return `
      <section class="pdp-sentiment pdp-reveal pdp-accordion">
        <button type="button" class="pdp-sentiment__head pdp-accordion-head" aria-expanded="false">
          <h2>Ressenti</h2>
          <i class="ti ti-chevron-down pdp-accordion-chevron" aria-hidden="true"></i>
        </button>
        <div class="pdp-accordion-body"><div class="pdp-accordion-body-inner">
          ${renderSentimentRow("Meilleur moment de la journée", momentCards)}
          ${renderSentimentRow("Meilleure saison pour porter", seasonCards)}
          ${renderSentimentRow("Longévité", longevityCards)}
          ${renderSentimentRow("Projection", projectionCards)}
        </div></div>
      </section>`;
  }

  // ── Sections 7/8 : Carousels produits
  function renderCarouselSection(id, eyebrow, title) {
    return `
      <section class="pdp-carousel-section">
        <div class="pdp-container">
          <div>
            <div class="pdp-eyebrow">${eyebrow}</div>
            <h2 class="pdp-title">${title}</h2>
          </div>
          <div class="pdp-carousel-nav">
            <button type="button" data-scroll-dir="-1" aria-label="Précédent"><i class="ti ti-chevron-left"></i></button>
            <button type="button" data-scroll-dir="1" aria-label="Suivant"><i class="ti ti-chevron-right"></i></button>
          </div>
        </div>
        <div class="pdp-carousel-track" id="${id}"></div>
      </section>`;
  }

  function initCarousel(section) {
    const track = section.querySelector(".pdp-carousel-track");
    if (!track) return;
    if (ui.initProductCarousel) {
      ui.initProductCarousel(track.id, { navSelector: ".pdp-carousel-nav", btnSelector: "button" });
      return;
    }
    section.querySelectorAll(".pdp-carousel-nav button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.scrollDir);
        track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: "smooth" });
      });
    });
  }

  // ── Section 9 : Avis clients (honnête — aucun faux avis fabriqué)
  function renderReviews(product) {
    const fr = product.fragrantica;
    const rating = fr?.rating || product.rating;
    const countLine = fr?.votes
      ? `Basé sur ${fr.votes.toLocaleString("fr-FR")} avis Fragrantica`
      : "Note Kōrei — avis clients à venir";
    return `
      <section class="pdp-reviews">
        <div class="pdp-head">
          <div class="pdp-eyebrow">Avis clients</div>
          <h2 class="pdp-title">Ce qu'ils en <em>pensent</em></h2>
        </div>
        <div class="pdp-reviews__panel pdp-reveal">
          <div class="pdp-reviews__score">${rating}</div>
          <div class="pdp-reviews__stars">${ui.renderStars ? ui.renderStars(rating).replace(` <span>${rating}</span>`, "") : ""}</div>
          <p class="pdp-reviews__count">${countLine}</p>
          <p class="pdp-reviews__empty">
            Les avis vérifiés Kōrei arrivent bientôt sur cette fiche. Soyez la première personne
            à partager votre expérience avec ce parfum.
          </p>
          <button class="pdp-btn pdp-btn--primary" type="button" disabled title="Bientôt disponible" style="max-width:240px;margin:0 auto">
            Laisser un avis
          </button>
        </div>
      </section>`;
  }

  // ── Section 10 : FAQ
  function renderFaq(product) {
    const items = [
      {
        q: "C'est quoi un décant ?",
        a: "Un décant est un petit flacon (2ml, 5ml ou 10ml) rempli directement depuis le flacon original. C'est le meilleur moyen de découvrir un parfum avant d'investir dans un flacon complet.",
      },
      {
        q: `${product.name} est-il 100% authentique ?`,
        a: "Oui, sans exception. Tous nos parfums proviennent directement des distributeurs officiels ou de maisons agréées — jamais de copies ni de contrefaçons.",
      },
      {
        q: "Quel format choisir ?",
        a: "Le 2ml convient pour découvrir la fragrance, le 5ml pour un usage régulier sur plusieurs semaines, et le 10ml pour les coups de cœur que vous voulez pouvoir porter durablement.",
      },
      {
        q: "Quels sont les délais de livraison ?",
        a: "Vos décants sont préparés à la commande puis expédiés sous 24 à 48h. Un email de suivi vous est envoyé dès l'expédition.",
      },
      {
        q: "Une question sur votre commande ?",
        a: "Notre service client vous répond sous 48h — via le conseiller olfactif ou par email, pour toute question sur une commande en cours.",
      },
    ];
    return `
      <section class="pdp-faq">
        <div class="pdp-head">
          <div class="pdp-eyebrow">Questions</div>
          <h2 class="pdp-title">Foire aux <em>questions</em></h2>
        </div>
        <div class="pdp-faq__list faq-list pdp-reveal">
          ${items
            .map(
              (it) => `
            <div class="faq-item">
              <button class="faq-question" onclick="toggleFaq(this)" type="button">
                <span>${it.q}</span>
                <i class="ti ti-plus faq-icon"></i>
              </button>
              <div class="faq-answer">${it.a}</div>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
  }

  // ── Section 11 : Garanties
  function renderGuarantees() {
    const items = [
      { icon: "ti-certificate", title: "Authentique", desc: "100% des flacons proviennent de distributeurs officiels." },
      { icon: "ti-lock", title: "Paiement sécurisé", desc: "Transactions chiffrées, aucune donnée bancaire conservée." },
      { icon: "ti-truck-delivery", title: "Expédition rapide", desc: "Préparation et envoi sous 24 à 48h partout en France." },
      { icon: "ti-headset", title: "Support dédié", desc: "Une question ? Notre équipe vous répond sous 48h." },
    ];
    return `
      <section class="pdp-guarantees">
        <div class="pdp-guarantees__grid">
          ${items
            .map(
              (it) => `
            <div class="pdp-guarantee pdp-reveal">
              <i class="ti ${it.icon}" aria-hidden="true"></i>
              <h3>${it.title}</h3>
              <p>${it.desc}</p>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
  }

  // ── Reveal au scroll
  function initReveal(main) {
    const targets = Array.from(main.querySelectorAll(".pdp-reveal"));
    if (!targets.length) return;
    const reveal = (el) => el.classList.add("is-visible");
    if (!("IntersectionObserver" in window)) {
      targets.forEach(reveal);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );
    targets.forEach((t) => observer.observe(t));
    // Filet de sécurité : un contenu jamais scrollé (page très longue, robot
    // d'indexation qui ne scrolle pas) doit rester lisible, jamais figé à opacity:0.
    setTimeout(() => targets.forEach(reveal), 4000);
  }

  function initAccordions(main) {
    main.querySelectorAll(".pdp-accordion-head").forEach((btn) => {
      btn.addEventListener("click", () => {
        const section = btn.closest(".pdp-accordion");
        const nowOpen = section.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(nowOpen));
      });
    });
  }

  // ── Init général
  function initProductPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const product = id && store ? store.getProductById(id) : null;
    const main = document.getElementById("product-main");
    if (!main) return;

    if (!product) {
      main.innerHTML = `
        <div class="pdp-not-found">
          <h1>Parfum introuvable</h1>
          <p>Ce produit n'existe pas ou a été retiré du catalogue.</p>
          <a href="../pages/catalogue.html" class="pdp-btn pdp-btn--primary" style="text-decoration:none;display:inline-flex">Retour au catalogue</a>
        </div>`;
      return;
    }

    site?.setPageMeta({
      title: `${product.name} — ${product.brand} | Korei`,
      description: `${product.description} Décant dès ${product.price}€.`,
      image: ui.productMetaImage ? ui.productMetaImage(product, "../") : undefined,
      path: `pages/product?id=${product.id}`,
      type: "product",
      basePath: "../",
    });
    if (ui.productSchema) site?.setJsonLd("korei-product-schema", ui.productSchema(product, "../"));
    if (ui.productBreadcrumbSchema) site?.setJsonLd("korei-product-breadcrumb-schema", ui.productBreadcrumbSchema(product));

    main.innerHTML = `
      <nav class="pdp-breadcrumb">
        <a href="../index.html">Accueil</a>
        <span>/</span>
        <a href="catalogue.html">Parfums</a>
        <span>/</span>
        <a href="brands.html?brand=${product.brandId}">${product.brand}</a>
        <span>/</span>
        <span>${product.name}</span>
      </nav>
      ${renderHero(product, "../")}
      ${renderNotesFeatured(product)}
      ${renderSentiment(product)}
      ${renderCarouselSection("pdp-similar", "Sélection", "Parfums similaires")}
      ${renderCarouselSection("pdp-suggested", "Découverte", "Vous pourriez aimer")}
      ${renderReviews(product)}
      ${renderFaq(product)}
      ${renderGuarantees()}
      ${renderFamily(product)}
      ${renderStory(product)}
    `;

    initGallery(main, galleryImages(product, "../"));
    initHero(main, product);
    initReveal(main);
    initAccordions(main);

    const similar = store
      .getProductsByFamily(product.family)
      .filter((p) => p.id !== product.id)
      .slice(0, 8);
    const similarSection = document.getElementById("pdp-similar")?.closest(".pdp-carousel-section");
    if (similarSection) {
      if (similar.length && ui.renderProducts) {
        ui.renderProducts(document.getElementById("pdp-similar"), similar, { basePath: "../" });
        initCarousel(similarSection);
      } else {
        similarSection.style.display = "none";
      }
    }

    const suggested = store
      .getBestsellers()
      .filter((p) => p.id !== product.id && !similar.some((s) => s.id === p.id))
      .slice(0, 8);
    const suggestedSection = document.getElementById("pdp-suggested")?.closest(".pdp-carousel-section");
    if (suggestedSection) {
      if (suggested.length && ui.renderProducts) {
        ui.renderProducts(document.getElementById("pdp-suggested"), suggested, { basePath: "../" });
        initCarousel(suggestedSection);
      } else {
        suggestedSection.style.display = "none";
      }
    }

    site?.initMediaSlots();
  }

  if (document.body.dataset.page === "product") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(initProductPage);
      });
    } else {
      Promise.resolve(global.KoreiShopifyCatalog?.load()).then(() => global.KoreiCatalogLoader?.load()).finally(initProductPage);
    }
  }
})(window);
