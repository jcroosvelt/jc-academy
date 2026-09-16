// assets/js/app/pages/formateur-profil.js
//
// Page profil d'un formateur, avec la liste de TOUS ses cours ET
// produits numériques en vente sur le site (demande explicite : la page
// "Nos formateurs" doit permettre de voir tout ce qu'un formateur a
// publié). Accessible depuis l'accueil (SPA), et aussi liée depuis le
// tableau de bord étudiant, l'espace formateur et l'admin (voir leurs
// dashboards respectifs).

import { supabase } from "./supabase-client.js";
import { escapeHtml } from "./format.js";

export async function render(root, params) {
  const { data: teacher, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, slug")
    .eq("slug", params.slug)
    .eq("role", "teacher")
    .single();

  if (error || !teacher) {
    root.innerHTML = `<p>Formateur introuvable.</p>`;
    return;
  }

  document.title = teacher.full_name + " — Formateur JC Academy";

  const [{ data: courses }, { data: products }] = await Promise.all([
    // Sur "courses", le lien vers le formateur s'appelle instructor_id
    // (colonne réelle existante, vue dans le prototype) — pas teacher_id.
    supabase
      .from("courses")
      .select("id, slug, title, price_usd")
      .eq("instructor_id", teacher.id)
      .eq("status", "publie"),
    // Sur "products", c'est bien teacher_id : colonne ajoutée exprès par
    // la migration 0002 (n'existait pas dans le prototype).
    supabase
      .from("products")
      .select("id, slug, title, price_usd")
      .eq("teacher_id", teacher.id)
      .eq("status", "publie"),
  ]);

  // TODO: reprendre le rendu exact du prototype (instructor-profile),
  // sans changer le design. Les liens pointent vers les vraies pages
  // dédiées /cours/<slug> et /produits/<slug>.
  root.innerHTML = `
    <section>
      <h1>${escapeHtml(teacher.full_name)}</h1>
      <p>${escapeHtml(teacher.bio ?? "")}</p>

      <h2>Cours proposés</h2>
      <ul>
        ${(courses ?? []).map((c) => `<li><a href="/cours/${c.slug}">${escapeHtml(c.title)} — ${c.price_usd} $</a></li>`).join("") || "<li>Aucun cours publié pour le moment.</li>"}
      </ul>

      <h2>Produits numériques proposés</h2>
      <ul>
        ${(products ?? []).map((p) => `<li><a href="/produits/${p.slug}">${escapeHtml(p.title)} — ${p.price_usd} $</a></li>`).join("") || "<li>Aucun produit publié pour le moment.</li>"}
      </ul>
    </section>
  `;
}
