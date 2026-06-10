// ============================================================
// Korei — main.js
// Interactions UI : FAQ, menu, filtres, favoris, recherche, cartes, étoiles
// ============================================================

// ── FAQ accordion
function toggleFaq(btn) {
  const item = btn.closest(".faq-item");
  const isOpen = item.classList.contains("open");
  document
    .querySelectorAll(".faq-item.open")
    .forEach((i) => i.classList.remove("open"));
  if (!isOpen) item.classList.add("open");
}

// ── Menu mobile
function toggleMenu() {
  const menu = document.getElementById("mobileMenu");
  menu.classList.toggle("open");
  document.body.style.overflow = menu.classList.contains("open")
    ? "hidden"
    : "";
}

// ── Filtres marques
document.querySelectorAll(".brand-chip").forEach((chip) => {
  chip.addEventListener("click", function () {
    document
      .querySelectorAll(".brand-chip")
      .forEach((c) => c.classList.remove("active"));
    this.classList.add("active");
  });
});

// ── Favoris
document.querySelectorAll(".card-fav").forEach((btn) => {
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    const icon = this.querySelector("i");
    icon.style.color =
      icon.style.color === "rgb(232, 64, 64)" ? "" : "#e84040";
  });
});

// ── Search overlay
function toggleSearch() {
  const overlay = document.getElementById("searchOverlay");
  overlay.classList.toggle("open");
  if (overlay.classList.contains("open")) {
    document.body.style.overflow = "hidden";
    overlay.querySelector(".search-overlay-input").focus();
  } else {
    document.body.style.overflow = "";
  }
}
document
  .getElementById("searchOverlay")
  .addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleSearch();
  });

// ── Card price buttons
document.querySelectorAll(".product-card").forEach((card) => {
  const priceEl = card.querySelector(".card-price");
  const price = priceEl?.textContent.trim() ?? "";
  if (priceEl) priceEl.style.display = "none";
  const btn = document.createElement("button");
  btn.className = "card-add";
  btn.textContent = price;
  btn.setAttribute("aria-label", "Voir le produit");
  btn.addEventListener("click", (e) => e.stopPropagation());
  card.querySelector(".card-body")?.appendChild(btn);
});

// ── Stars display
document.querySelectorAll(".card-rating").forEach((el) => {
  const match = el.textContent.match(/[\d.]+/);
  const score = match ? parseFloat(match[0]) : NaN;
  if (isNaN(score)) return;
  const full = Math.floor(score);
  const pct = Math.round((score % 1) * 100);
  const hasPartial = pct > 0;
  const empty = 5 - full - (hasPartial ? 1 : 0);
  const partial = hasPartial
    ? `<span class="star-half-wrap"><span class="star-half-fill" style="width:${pct}%">★</span><span class="star-half-bg">★</span></span>`
    : "";
  el.innerHTML =
    `<span class="star">${"★".repeat(full)}</span>` +
    partial +
    `<span class="star-empty">${"★".repeat(empty)}</span>` +
    ` <span>${score}</span>`;
});
