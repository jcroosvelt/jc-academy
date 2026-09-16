// assets/js/shared/nav.js
//
// Le prototype utilisait onclick="go('courses', {...})" sur des
// <button>. On garde le même élément <button> (même design), mais on
// remplace l'ancien routeur global par deux comportements possibles,
// posés après le rendu :
//   - data-nav="/cours.html"      -> vraie page séparée, navigation classique
//   - data-spa-link href="/xxx"   -> reste dans le SPA (router.js), pas de rechargement
//
// Un seul appel à wireNav(root) après avoir inséré le HTML suffit à
// câbler tous les boutons/liens du fragment.
export function wireNav(root) {
  root.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => {
      window.location.href = el.getAttribute("data-nav");
    });
  });

  root.querySelectorAll("[data-spa-link]").forEach((el) => {
    el.addEventListener("click", async (event) => {
      event.preventDefault();
      const { navigate } = await import("./router.js");
      navigate(el.getAttribute("href") || el.getAttribute("data-spa-link"));
    });
  });
}
