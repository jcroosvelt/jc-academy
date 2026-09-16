// assets/js/produits/produits.js
//
// Page de LISTE des produits numériques (produits.html), même principe
// que cours.js. Le détail de chaque produit vit sur sa propre vraie page
// /produits/<slug>, générée par l'Edge Function "product-page".
// Reprend le rendu de renderProducts() du prototype (page-header +
// course-grid), avec productCardHTML() pour chaque carte.

import { supabase } from "./supabase-client.js";
import { getSiteContent } from "./site-content.js";
import { productCardHTML } from "./product-card.js";

renderProductList();

async function renderProductList() {
  const root = document.getElementById("page-root");

  const [{ data: products, error }, { exchangeRate }] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, title, tagline, price_usd, cover_image_url")
      .eq("status", "publie")
      .order("created_at", { ascending: false }),
    getSiteContent(),
  ]);

  if (error) {
    root.innerHTML = `<p>Impossible de charger les produits pour le moment.</p>`;
    return;
  }

  root.innerHTML = `
    <section class="page-header">
      <div class="container">
        <div class="eyebrow" style="background:rgba(255,255,255,.12);color:#fff;">Boutique</div>
        <h1>Nos produits numériques</h1>
        <p>Ebooks, modèles et ressources téléchargeables pour aller plus loin dans votre apprentissage.</p>
      </div>
    </section>
    <div class="container" style="padding:44px 24px 70px;">
      ${
        products.length
          ? `<div class="course-grid">${products.map((p) => productCardHTML(p, exchangeRate)).join("")}</div>`
          : `<p class="small-muted">Aucun produit disponible pour le moment. Revenez bientôt !</p>`
      }
    </div>
  `;
}
