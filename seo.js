// assets/js/app/seo.js
// Reprend le rôle de l'ancienne fonction updateSEO(page) du prototype.
// Comme tout ceci reste dans un seul fichier index.html (SPA), le SEO
// par page dépend de JS exécuté après chargement — c'est une limite
// acceptée pour ces pages-là (contenu éditorial, pas les pages
// commerciales comme /cours/ ou /produits/ qui, elles, sont de vrais
// fichiers séparés avec de vraies balises <meta> en dur pour un
// meilleur référencement).

const SEO_BY_ROUTE = {
  home: { title: "JC Academy — Formations en ligne certifiantes", description: "Apprenez avec JC Academy." },
  about: { title: "À propos — JC Academy", description: "À propos de JC Academy." },
  contact: { title: "Contact — JC Academy", description: "Contactez JC Academy." },
  faq: { title: "FAQ — JC Academy", description: "Questions fréquentes." },
  articles: { title: "Articles — JC Academy", description: "Nos derniers articles." },
  actualites: { title: "Actualités — JC Academy", description: "Nos dernières actualités." },
  formateurs: { title: "Nos formateurs — JC Academy", description: "Découvrez nos formateurs." },
  "devenir-formateur": { title: "Devenir formateur — JC Academy", description: "Rejoignez JC Academy en tant que formateur." },
  connexion: { title: "Connexion — JC Academy", description: "Connectez-vous à votre compte." },
  inscription: { title: "Inscription — JC Academy", description: "Créez votre compte." },
  "mot-de-passe-oublie": { title: "Mot de passe oublié — JC Academy", description: "Réinitialisez votre mot de passe." },
  "reinitialiser-mot-de-passe": { title: "Nouveau mot de passe — JC Academy", description: "Choisissez un nouveau mot de passe." },
  verification: { title: "Vérification de compte — JC Academy", description: "Confirmez votre adresse e-mail." },
};

const NOINDEX_ROUTES = new Set(["connexion", "inscription", "mot-de-passe-oublie", "reinitialiser-mot-de-passe", "verification"]);

export function updateSEO(routeName, params = {}) {
  const meta = SEO_BY_ROUTE[routeName] ?? SEO_BY_ROUTE.home;
  document.title = meta.title;

  setMetaTag("name", "description", meta.description);
  setMetaTag("name", "robots", NOINDEX_ROUTES.has(routeName) ? "noindex, nofollow" : "index, follow");
  setMetaTag("property", "og:title", meta.title);
  setMetaTag("property", "og:description", meta.description);
  setMetaTag("property", "og:url", window.location.href);
  setMetaTag("property", "og:type", "website");
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", meta.title);
  setMetaTag("name", "twitter:description", meta.description);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", `${window.location.origin}${window.location.pathname}`);

  // Pour article-detail / actualite-detail / formateur-profil : le titre
  // réel (issu de la base) doit être injecté par le module de page
  // lui-même une fois les données chargées (voir pages/article-detail.js).
}

export function setMetaTag(attr, key, content) {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}
