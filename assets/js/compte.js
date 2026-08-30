/**
 * Korei — Mon espace (KOR-A9)
 *
 * Page compte sans authentification : elle résume ce que le visiteur a déjà
 * fait sur cet appareil (favoris, panier, coffret en cours). Le suivi de
 * commande reste chez Shopify, il n'y a rien à inventer ici.
 */
(function (global) {
  if (document.body.dataset.page !== "compte") return;

  const money = (v) =>
    global.KoreiProducts?.prixEuros(v) ?? `${Number(v || 0).toFixed(2).replace(".", ",")}\u00a0€`;

  function read(key) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function refresh() {
    const favs = read("korei-favorites") || [];
    setText("compte-fav-count", Array.isArray(favs) ? favs.length : 0);

    const items = read("korei-coffret") || [];
    const cart = global.KoreiCoffret;
    const state = cart?.getCartState ? cart.getCartState(items) : null;
    const qty = Array.isArray(items)
      ? items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
      : 0;
    setText("compte-cart-count", qty);
    setText("compte-cart-total", money(state ? state.total : 0));

    const sub = document.getElementById("compte-coffret-sub");
    if (sub && state) {
      const next = cart.getNextStep ? cart.getNextStep(state) : null;
      if (state.boxes > 0) {
        sub.textContent = `${state.boxes} coffret(s) complet(s) · −10 % et livraison offerte`;
      } else if (next) {
        sub.textContent = `Plus que ${next.missing} parfum(s) pour −10 %`;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
  global.KoreiCoffret?.onChange(refresh);
})(window);
