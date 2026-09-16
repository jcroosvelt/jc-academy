// assets/js/shared/format.js
//
// Petits utilitaires d'affichage repris À L'IDENTIQUE du prototype
// (mêmes couleurs, même format de prix), pour que plusieurs pages
// (accueil, cours, produits, dashboards) puissent les réutiliser sans
// dupliquer le code — voir §4 du cahier des charges (séparation des
// responsabilités).

// Palette de couleurs des vignettes de cours/produits — ordre et valeurs
// hexadécimales identiques au prototype (variable `palette`).
export const palette = ["#0C2C74", "#123A94", "#B57200", "#1D9A6C", "#7A3E9D", "#B23B3B"];

// Taux de change par défaut si la table site_content n'a pas encore la
// clé "exchange_rate_htg_per_usd" (même valeur par défaut que le
// prototype : 1 USD ≈ 131 HTG).
export const DEFAULT_EXCHANGE_RATE = 131;

/**
 * Formate un prix en HTG à partir d'un prix en USD, comme fmtHTG() dans
 * le prototype. Un prix à 0 affiche "Gratuit" plutôt que "0 HTG".
 */
export function fmtHTG(priceUsd, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  return priceUsd === 0 ? "Gratuit" : `${Math.round(priceUsd * exchangeRate).toLocaleString("fr-FR")} HTG`;
}

export function fmtUSD(priceUsd) {
  return priceUsd === 0 ? "Gratuit" : `$${priceUsd} USD`;
}

/**
 * Échappe une chaîne avant de l'insérer dans du HTML (innerHTML).
 *
 * CORRECTION D'AUDIT (vérification finale) : aucune fonction de ce type
 * n'existait côté client dans toute l'application, alors que des champs
 * saisis par les utilisateurs (nom complet à l'inscription, bio
 * formateur, titre de cours, nom de destinataire de certificat...) sont
 * insérés directement dans du HTML un peu partout (accueil, listes de
 * cours/formateurs, tableaux admin). Sans ça, quelqu'un pouvait mettre
 * du code dans son propre nom et le faire exécuter dans le navigateur
 * d'un visiteur du site — ou pire, dans celui d'un admin consultant la
 * liste des utilisateurs, ce qui aurait pu lui faire exécuter n'importe
 * quelle action avec les droits admin (session déjà connectée).
 * Les Edge Functions publiques (course-page, product-page) avaient déjà
 * leur propre escapeHtml() ; celle-ci est l'équivalent côté client.
 */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Initiales d'un nom complet (ex: "Jean Charles" -> "JC"), comme dans le prototype. */
export function initials(name) {
  return (name || "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Étoiles pleines/vides pour une note sur 5, même rendu que renderStarsHTML() du prototype. */
export function renderStarsHTML(rating) {
  const full = Math.round(rating || 0);
  const star = `<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6 6.6.6-5 4.4 1.5 6.5L12 16.8 6 20l1.5-6.5-5-4.4 6.6-.6L12 2.5Z"/></svg>`;
  return Array.from({ length: 5 }, (_, i) => (i < full ? star : "")).join("");
}
