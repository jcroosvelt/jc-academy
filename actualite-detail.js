// assets/js/app/pages/actualite-detail.js
import { supabase } from "./supabase-client.js";
import { escapeHtml } from "./format.js";
import { setMetaTag } from "./seo.js";

export async function render(root, params) {
  // CORRECTION D'AUDIT (vérification finale) : même bug que article-detail.js
  // — "slug"/"status" n'existent pas sur "news" (voir 0000_schema_de_base.sql).
  // L'URL /actualites/:id utilise le vrai id (home.js : href="/actualites/${n.id}").
  const { data: actualite, error } = await supabase
    .from("news")
    .select("title, content, published_at")
    .eq("id", params.slug)
    .single();

  if (error || !actualite) {
    root.innerHTML = `<p>Actualité introuvable.</p>`;
    return;
  }

  document.title = actualite.title + " — JC Academy";

  const plainText = (actualite.content ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = plainText.slice(0, 155);
  setMetaTag("name", "description", description);
  setMetaTag("property", "og:title", actualite.title);
  setMetaTag("property", "og:description", description);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", `${window.location.origin}${window.location.pathname}`);

  // content = HTML volontaire (éditeur riche admin), title échappé par cohérence.
  root.innerHTML = `
    <article class="container" style="padding:44px 24px 70px;max-width:760px;">
      <h1>${escapeHtml(actualite.title)}</h1>
      <p class="small-muted">${new Date(actualite.published_at).toLocaleDateString("fr-FR")}</p>
      <div>${actualite.content ?? ""}</div>
    </article>
  `;
}
