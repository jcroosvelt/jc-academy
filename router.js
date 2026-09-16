// assets/js/app/router.js
//
// Mini-routeur pour LES SEULES pages non sensibles : home, about, contact,
// faq, articles, actualites, formateurs, connexion, inscription,
// mot-de-passe-oublie, reinitialiser-mot-de-passe, verification.
//
// C'est la même idée que l'ancienne fonction go(page, opts) du prototype,
// mais :
//  - elle ne gère plus JAMAIS de page sensible (paiement, dashboards,
//    admin) — celles-ci sont maintenant des vrais fichiers .html séparés
//    (voir /cours/, /produits/, /paiement/, /tableau-de-bord/,
//    /espace-formateur.html, /admin.html), donc plus besoin de vérifier des rôles
//    ici : tout ce qui passe par ce routeur est public par définition.
//  - chaque "page" est un module séparé dans assets/js/app/pages/*.js
//    au lieu d'une seule fonction render*() géante dans un seul fichier.

import { updateSEO } from "./seo.js";

const routes = {
  home: { path: "/", render: () => import("./home.js") },
  about: { path: "/a-propos", render: () => import("./about.js") },
  contact: { path: "/contact", render: () => import("./contact.js") },
  faq: { path: "/faq", render: () => import("./faq.js") },
  articles: { path: "/articles", render: () => import("./articles.js") },
  "article-detail": { path: "/articles/:slug", render: () => import("./article-detail.js") },
  actualites: { path: "/actualites", render: () => import("./actualites.js") },
  "actualite-detail": { path: "/actualites/:slug", render: () => import("./actualite-detail.js") },
  formateurs: { path: "/formateurs", render: () => import("./formateurs.js") },
  "formateur-profil": { path: "/formateurs/:slug", render: () => import("./formateur-profil.js") },
  "devenir-formateur": { path: "/devenir-formateur", render: () => import("./devenir-formateur.js") },
  connexion: { path: "/connexion", render: () => import("./connexion.js") },
  inscription: { path: "/inscription", render: () => import("./inscription.js") },
  "mot-de-passe-oublie": { path: "/mot-de-passe-oublie", render: () => import("./mot-de-passe-oublie.js") },
  "reinitialiser-mot-de-passe": {
    path: "/reinitialiser-mot-de-passe",
    render: () => import("./reinitialiser-mot-de-passe.js"),
  },
  verification: { path: "/verification", render: () => import("./verification.js") },
};

function matchRoute(pathname) {
  for (const [name, route] of Object.entries(routes)) {
    const pattern = "^" + route.path.replace(/:[^/]+/g, "([^/]+)") + "/?$";
    const match = pathname.match(new RegExp(pattern));
    if (match) {
      const paramNames = [...route.path.matchAll(/:([^/]+)/g)].map((m) => m[1]);
      const params = Object.fromEntries(paramNames.map((p, i) => [p, match[i + 1]]));
      return { name, params };
    }
  }
  return { name: "home", params: {} }; // TODO: remplacer par une vraie page 404
}

export async function navigate(pathname, { pushState = true } = {}) {
  const { name, params } = matchRoute(pathname);
  const route = routes[name];

  const root = document.getElementById("app-root");
  root.innerHTML = `<p>Chargement…</p>`;

  const module = await route.render();
  await module.render(root, params);

  updateSEO(name, params);

  if (pushState && window.location.pathname !== pathname) {
    window.history.pushState({ name, params }, "", pathname);
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

window.addEventListener("popstate", () => {
  navigate(window.location.pathname, { pushState: false });
});

// Point d'entrée : navigue vers l'URL actuelle au chargement.
navigate(window.location.pathname, { pushState: false });
