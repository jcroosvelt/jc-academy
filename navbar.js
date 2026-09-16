// assets/js/app/navbar.js
//
// Port fidèle de l'ancienne fonction renderNavbar() du prototype
// (index.html, ligne ~1438) : mêmes classes CSS, même structure DOM,
// même logo. Seule la logique de navigation change :
//   - les liens vers des pages non sensibles (accueil, formateurs...)
//     restent gérés par le routeur SPA (data-spa-link)
//   - les liens vers des pages sensibles (cours, produits, mon espace)
//     sont maintenant de VRAIS liens <a href> vers des fichiers séparés
//   - "Mon espace" redirige vers le bon dashboard selon le rôle réel
//     (au lieu de l'ancien goToMySpace()/routeAfterLogin() basé sur un
//     état en mémoire)

import { supabase } from "./supabase-client.js";
import { escapeHtml } from "./format.js";

function initials(name) {
  return (name || "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Renvoie l'URL du dashboard correspondant au rôle réel de l'utilisateur,
 * lu depuis la table profiles (jamais depuis un état client modifiable).
 */
async function getMySpaceUrl(userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") return "/admin.html";
  if (profile?.role === "teacher") return "/espace-formateur.html";
  return "/tableau-de-bord.html";
}

async function getNotifications(userId) {
  const { data } = await supabase
    .from("notifications")
    .select("id, title, message, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

export async function renderNavbar() {
  const root = document.getElementById("navbar-root");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const loggedIn = !!session;
  let profile = null;
  let notifications = [];
  let mySpaceUrl = "/tableau-de-bord.html";

  if (loggedIn) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", session.user.id)
      .single();
    profile = data;
    notifications = await getNotifications(session.user.id);
    mySpaceUrl = await getMySpaceUrl(session.user.id);
  }
  const unread = notifications.filter((n) => !n.read_at).length;

  // Liens de la barre de navigation principale. Ceux qui pointent vers
  // une vraie page séparée n'ont pas data-spa-link ; ceux qui restent
  // gérés par le SPA (assets/js/app/router.js) l'ont.
  const links = [
    { href: "/", label: "Accueil", spa: true },
    { href: "/cours.html", label: "Nos Cours", spa: false },
    { href: "/formateurs", label: "Formateurs", spa: true },
    { href: "/produits.html", label: "Produits", spa: false },
    { href: "/devenir-formateur", label: "Devenir Formateur", spa: true },
  ];

  const bell = loggedIn
    ? `
    <div class="notif-bell-wrap">
      <button class="notif-bell" id="notifBellBtn" aria-label="Notifications">
        <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>${
          unread ? `<span class="notif-badge">${unread}</span>` : ""
        }
      </button>
      <div class="notif-dropdown hidden" id="notifDropdown">
        <div class="notif-dropdown-head">Notifications</div>
        ${
          notifications.length
            ? notifications
                .map(
                  (n) => `
          <div class="notif-item ${!n.read_at ? "unread" : ""}" data-notif-id="${n.id}" data-notif-link="${n.link ?? ""}" style="cursor:pointer;">
            <span class="notif-dot" style="${n.read_at ? "background:var(--border);" : ""}"></span>
            <div><div>${escapeHtml(n.title)}${n.message ? ` — ${escapeHtml(n.message)}` : ""}</div><div class="t">${timeAgo(n.created_at)}</div></div>
          </div>`
                )
                .join("")
            : `<div class="notif-item"><div><div class="small-muted">Aucune notification pour le moment.</div></div></div>`
        }
      </div>
    </div>`
    : "";

  const authButtons = loggedIn
    ? `
        ${bell}
        <a href="${mySpaceUrl}" class="navbar-userchip" style="display:flex;align-items:center;gap:8px;padding:6px 10px 6px 6px;border-radius:999px;border:1px solid var(--border);">
          <span class="avatar" style="width:28px;height:28px;font-size:11px;margin:0;">${initials(profile?.full_name)}</span>
          <span style="font-size:13px;font-weight:600;color:var(--navy-dark);">${escapeHtml(profile?.full_name ?? "")}</span>
        </a>`
    : `
        <a href="/connexion" data-spa-link><button class="btn btn-outline btn-sm">Se connecter</button></a>
        <a href="/inscription" data-spa-link><button class="btn btn-primary btn-sm">S'inscrire</button></a>`;

  root.innerHTML = `
  <div class="topbar">LEARN. LEAD. INSPIRE</div>
  <header class="navbar">
    <div class="container navbar-inner">
      <a href="/" class="brand" data-spa-link>
        <img src="/logo-icon.png" alt="JC Academy">
        <span class="brand-name">JC <span>Academy</span></span>
      </a>
      <nav class="nav-links" id="navLinks">
        ${links
          .map(
            (l) =>
              `<a href="${l.href}" ${l.spa ? "data-spa-link" : ""}>${l.label}</a>`
          )
          .join("")}
        ${loggedIn ? `<a href="${mySpaceUrl}">Mon espace</a>` : ""}
        <div class="mobile-auth-row" style="gap:10px;margin-top:8px;flex-wrap:wrap;">
          ${
            loggedIn
              ? `<a href="${mySpaceUrl}"><button class="btn btn-outline btn-sm">Mon espace</button></a>`
              : `<a href="/connexion" data-spa-link><button class="btn btn-outline btn-sm">Se connecter</button></a><a href="/inscription" data-spa-link><button class="btn btn-primary btn-sm">S'inscrire</button></a>`
          }
        </div>
      </nav>
      <div class="nav-actions">
        ${authButtons}
        <button class="nav-burger" onclick="document.getElementById('navLinks').classList.toggle('open')">&#9776;</button>
      </div>
    </div>
  </header>`;

  // Navigation SPA pour les liens marqués data-spa-link (pas de rechargement)
  root.querySelectorAll("[data-spa-link]").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const { navigate } = await import("./router.js");
      navigate(link.getAttribute("href"));
    });
  });

  document.getElementById("notifBellBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("notifDropdown")?.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    document.getElementById("notifDropdown")?.classList.add("hidden");
  });

  root.querySelectorAll("[data-notif-id]").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation();
      const notifId = item.getAttribute("data-notif-id");
      const link = item.getAttribute("data-notif-link");
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notifId);
      if (link) window.location.href = link;
      else item.classList.remove("unread");
    });
  });
}
