// assets/js/shared/product-card.js
//
// Port fidèle de productCardHTML() du prototype : réutilise les mêmes
// classes que la carte de cours (course-card, course-thumb, course-body,
// course-foot) — c'était déjà le cas dans le prototype, donc même rendu
// visuel garanti. Seul changement : un vrai lien /produits/<slug> au
// lieu de onclick="go('product-detail', ...)".

import { fmtHTG, escapeHtml } from "./format.js";

export function productCardHTML(product, exchangeRate) {
  const free = Number(product.price_usd) === 0;
  return `
  <a href="/produits/${product.slug}" class="course-card">
    <div class="course-thumb" style="${product.cover_image_url ? `background-image:url('${escapeHtml(product.cover_image_url)}');background-size:cover;background-position:center;` : `background:linear-gradient(135deg, var(--gold) 0%, var(--navy) 100%);`}">
      <span class="course-cat">Produit numérique</span>
    </div>
    <div class="course-body">
      <h3>${escapeHtml(product.title)}</h3>
      <p style="font-size:12.5px;color:var(--text-muted);margin:0;">${escapeHtml(product.tagline ?? "")}</p>
      <div class="course-foot">
        <span></span>
        <span class="price ${free ? "free" : ""}">${fmtHTG(Number(product.price_usd), exchangeRate)}</span>
      </div>
    </div>
  </a>`;
}
