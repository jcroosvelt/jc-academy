// assets/js/app/pages/formateurs.js
//
// Liste publique des formateurs — n'existait pas dans le prototype
// (seul un carrousel sur l'accueil montrait quelques formateurs, sans
// page dédiée). Chaque carte réutilise le style "instructor-card" déjà
// présent dans le CSS pour le carrousel de l'accueil, en grille plutôt
// qu'en défilement, avec un vrai lien vers /formateurs/<slug>.

import { supabase } from "./supabase-client.js";
import { initials, palette, escapeHtml } from "./format.js";

export async function render(root) {
  const { data: teachers, error } = await supabase
    .from("profiles")
    .select("full_name, bio, slug")
    .eq("role", "teacher")
    .eq("profile_public", true)
    .order("full_name");

  if (error) {
    root.innerHTML = `<p>Impossible de charger les formateurs pour le moment.</p>`;
    return;
  }

  root.innerHTML = `
    <section class="page-header">
      <div class="container">
        <div class="eyebrow" style="background:rgba(255,255,255,.12);color:#fff;">Notre équipe</div>
        <h1>Nos formateurs</h1>
        <p>Des experts reconnus dans leur domaine, prêts à vous accompagner.</p>
      </div>
    </section>
    <div class="container" style="padding:44px 24px 70px;">
      ${
        teachers.length
          ? `<div class="course-grid">
        ${teachers
          .map(
            (t, idx) => `
          <a href="/formateurs/${t.slug}" class="instructor-card" style="text-decoration:none;color:inherit;display:block;">
            <div class="avatar" style="background:${palette[idx % palette.length]}">${initials(t.full_name)}</div>
            <h4>${escapeHtml(t.full_name)}</h4>
            <div class="role">Formateur JC Academy</div>
            <p>${escapeHtml((t.bio ?? "").slice(0, 110))}${t.bio && t.bio.length > 110 ? "…" : ""}</p>
          </a>`
          )
          .join("")}
      </div>`
          : `<p class="small-muted">Aucun formateur public pour le moment.</p>`
      }
    </div>
  `;
}
