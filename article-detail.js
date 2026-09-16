// assets/js/app/pages/article-detail.js
import { supabase } from "./supabase-client.js";
import { escapeHtml } from "./format.js";
import { setMetaTag } from "./seo.js";

export async function render(root, params) {
  // CORRECTION D'AUDIT (vérification finale) : cette page interrogeait
  // encore une colonne "slug" et un statut "published" qui n'existent
  // pas sur "articles" (voir 0000_schema_de_base.sql — pas de colonne
  // status : un article existe ou n'existe pas, pas de brouillon pour
  // l'instant). L'URL /articles/:id utilise le vrai id (voir le lien
  // dans home.js : href="/articles/${a.id}"), jamais un slug.
  const { data: article, error } = await supabase
    .from("articles")
    .select("title, content, author, published_at")
    .eq("id", params.slug)
    .single();

  if (error || !article) {
    root.innerHTML = `<p>Article introuvable.</p>`;
    return;
  }

  document.title = article.title + " — JC Academy";

  const plainText = (article.content ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = plainText.slice(0, 155);
  setMetaTag("name", "description", description);
  setMetaTag("property", "og:title", article.title);
  setMetaTag("property", "og:description", description);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", `${window.location.origin}${window.location.pathname}`);

  // content vient de l'éditeur de texte riche admin (assets/js/shared/rich-text-editor.js) :
  // c'est du HTML volontairement, pas du texte à échapper — seul title
  // (aussi saisi par l'admin, mais affiché en <h1> brut) est échappé ici
  // par cohérence avec le reste de l'application.
  root.innerHTML = `
    <article class="container" style="padding:44px 24px 70px;max-width:760px;">
      <h1>${escapeHtml(article.title)}</h1>
      <p class="small-muted">${escapeHtml(article.author ?? "")} · ${new Date(article.published_at).toLocaleDateString("fr-FR")}</p>
      <div>${article.content ?? ""}</div>
    </article>
  `;
}
