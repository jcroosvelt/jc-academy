// assets/js/shared/course-card.js
//
// Port fidèle de courseCardHTML() du prototype (même HTML, mêmes classes
// CSS, donc même rendu visuel). Deux différences volontaires, dictées
// par la nouvelle architecture (pas de changement de design) :
//   - la carte est un vrai <a href="/cours/<slug>">, plus un
//     onclick="go('course-detail', ...)" : chaque cours a maintenant sa
//     propre page réelle (voir supabase/functions/course-page).
//   - le bouton favoris n'utilise plus onclick="toggleWishlist(...)"
//     (fonction globale à l'ancienne) mais un data-attribute + un
//     addEventListener posé par attachCourseCardHandlers(), plus adapté
//     à des modules ES isolés.

import { palette, fmtHTG, escapeHtml } from "./format.js";

const HEART_FILLED =
  '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="none"><path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9Z"/></svg>';
const HEART_OUTLINE =
  '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9Z"/></svg>';

/**
 * @param {object} course { id, slug, title, category ('certificat'|'diplome'),
 *   price_usd, duration_text, students_count, rating }
 * @param {string[]} wishlistIds ids des cours déjà mis en favoris par l'utilisateur connecté
 * @param {number} exchangeRate taux HTG/USD courant (voir site_content)
 */
export function courseCardHTML(course, wishlistIds = [], exchangeRate) {
  const inWishlist = wishlistIds.includes(course.id);
  const free = Number(course.price_usd) === 0;
  const colorSeed = typeof course.id === "string" ? course.id.charCodeAt(0) : course.id;

  return `
  <a href="/cours/${course.slug}" class="course-card" style="position:relative;">
    <div class="course-thumb" style="background:linear-gradient(135deg, ${palette[colorSeed % palette.length]} 0%, var(--navy-dark) 100%);">
      <button class="wishlist-btn ${inWishlist ? "active" : ""}" data-wishlist-toggle="${course.id}" aria-label="Favoris">${inWishlist ? HEART_FILLED : HEART_OUTLINE}</button>
      <span class="course-cat">${course.category === "certificat" ? "Certificat" : "Diplôme"}</span>
    </div>
    <div class="course-body">
      <div class="course-tags">
        <span class="badge ${free ? "badge-free" : "badge-paid"}">${free ? "Gratuit" : "Payant"}</span>
        <span class="badge ${course.category === "certificat" ? "badge-certificat" : "badge-diplome"}">${course.category === "certificat" ? "Certificat" : "Diplôme"}</span>
      </div>
      <h3>${escapeHtml(course.title)}</h3>
      <div class="course-meta">
        <span>⏱ ${escapeHtml(course.duration_text ?? "")}</span>
        <span><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg> ${(course.students_count ?? 0).toLocaleString("fr-FR")}</span>
      </div>
      <div class="course-foot">
        <span class="stars"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6 6.6.6-5 4.4 1.5 6.5L12 16.8 6 20l1.5-6.5-5-4.4 6.6-.6L12 2.5Z"/></svg> ${Number(course.rating || 0)}</span>
        <span class="price ${free ? "free" : ""}">${fmtHTG(Number(course.price_usd), exchangeRate)}</span>
      </div>
    </div>
  </a>`;
}

/**
 * À appeler une fois les cartes insérées dans le DOM : câble le bouton
 * favoris de chaque carte sans passer par une fonction globale.
 * `onToggle(courseId, button)` doit gérer l'écriture en base (table
 * wishlists) et renvoyer le nouvel état (true = ajouté).
 */
export function attachCourseCardHandlers(container, onToggle) {
  container.querySelectorAll("[data-wishlist-toggle]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const courseId = button.getAttribute("data-wishlist-toggle");
      const nowActive = await onToggle(courseId, button);
      button.classList.toggle("active", !!nowActive);
      button.innerHTML = nowActive ? HEART_FILLED : HEART_OUTLINE;
    });
  });
}
