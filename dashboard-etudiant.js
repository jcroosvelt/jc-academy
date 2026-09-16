// assets/js/dashboard-etudiant/dashboard-etudiant.js
//
// Port fidèle de renderDashboard() du prototype (state.dashTab) : même
// sidebar, mêmes 7 onglets (vue d'ensemble, mes cours, favoris,
// certificats, paiements, profil, paramètres), mêmes classes CSS.
//
// Correction d'audit sur les onglets : le squelette précédent avait
// supposé deux onglets "avis" et "notifications" qui n'existent pas
// dans le vrai design du prototype (les avis se donnent depuis la page
// d'un cours, les notifications sont la cloche de la navbar — déjà
// repérée comme TODO dans navbar.js). Retirés ici pour rester fidèle.
//
// Sécurité : la faille "Supprimer mon compte" du prototype (qui ne
// faisait qu'un alert() + déconnexion, sans rien supprimer) est
// corrigée via une vraie Edge Function (supabase/functions/delete-account).

import { requireRole } from "./auth-guard.js";
import { supabase } from "./supabase-client.js";
import { fmtUSD, initials, escapeHtml } from "./format.js";
import { getSiteContent } from "./site-content.js";
import { courseCardHTML, attachCourseCardHandlers } from "./course-card.js";
import { toggleWishlist } from "./wishlist.js";
import { avatarUploadFieldHTML, wireAvatarUpload } from "./avatar-upload.js";

const NAV_ITEMS = [
  { id: "overview", label: "Vue d'ensemble", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>' },
  { id: "courses", label: "Mes cours", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 4C9 2 5 2 3 3v15c2-1 6-1 9 1 3-2 7-2 9-1V3c-2-1-6-1-9 1"/><path d="M12 4v16"/></svg>' },
  { id: "wishlist", label: "Favoris", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="none"><path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9Z"/></svg>' },
  { id: "certificates", label: "Mes certificats", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/></svg>' },
  { id: "payments", label: "Paiements & factures", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6"/><path d="M9 11h6"/></svg>' },
  { id: "profile", label: "Mon profil", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>' },
  { id: "settings", label: "Paramètres", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"/></svg>' },
];

let profile = null;
let exchangeRate = 131;
let currentTab = "overview";

async function init() {
  profile = await requireRole(["student", "teacher", "admin"]);
  ({ exchangeRate } = await getSiteContent());
  renderLayout();
  await renderTab(currentTab);
}

function renderLayout() {
  const root = document.getElementById("page-root");
  root.innerHTML = `
  <div class="dash-shell">
    <aside class="dash-sidebar">
      <div class="dash-user">
        <span class="avatar" style="width:44px;height:44px;">${initials(profile.full_name)}</span>
        <div><b>${escapeHtml(profile.full_name)}</b><span>${escapeHtml(profile.email)}</span></div>
      </div>
      <nav class="dash-nav">
        ${NAV_ITEMS.map((n) => `<a href="#" data-tab="${n.id}" class="${n.id === currentTab ? "active" : ""}">${n.icon} ${n.label}</a>`).join("")}
        <a href="#" class="logout" id="dashLogout"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg> Déconnexion</a>
      </nav>
    </aside>
    <div class="dash-main" id="dashMain"><p>Chargement…</p></div>
  </div>`;

  root.querySelectorAll("[data-tab]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      currentTab = link.getAttribute("data-tab");
      root.querySelectorAll("[data-tab]").forEach((l) => l.classList.toggle("active", l === link));
      renderTab(currentTab);
    });
  });

  root.querySelector("#dashLogout").addEventListener("click", async (event) => {
    event.preventDefault();
    await supabase.auth.signOut();
    window.location.href = "/";
  });
}

async function renderTab(tab) {
  const main = document.getElementById("dashMain");
  main.innerHTML = `<p>Chargement…</p>`;
  if (tab === "overview") return renderOverview(main);
  if (tab === "courses") return renderCourses(main);
  if (tab === "wishlist") return renderWishlist(main);
  if (tab === "certificates") return renderCertificates(main);
  if (tab === "payments") return renderPayments(main);
  if (tab === "profile") return renderProfile(main);
  if (tab === "settings") return renderSettings(main);
}

// ===================== Données communes =====================

async function loadEnrolledCourses() {
  const { data, error } = await supabase
    .from("enrollments")
    .select("progress, courses(id, slug, title, category, price_usd, duration_text, students_count, rating, instructor:profiles(full_name))")
    .eq("student_id", profile.id);
  if (error || !data) return [];
  return data.filter((e) => e.courses).map((e) => ({ ...e.courses, progress: e.progress ?? 0 }));
}

// ===================== Vue d'ensemble =====================

async function renderOverview(main) {
  const enrolled = await loadEnrolledCourses();
  const inProgress = enrolled.filter((c) => c.progress < 100);
  const completed = enrolled.filter((c) => c.progress === 100);

  const enrolledIds = enrolled.map((c) => c.id);
  let recommendedQuery = supabase
    .from("courses")
    .select("id, slug, title, category, price_usd, duration_text, students_count, rating")
    .eq("status", "publie")
    .limit(3);
  if (enrolledIds.length) recommendedQuery = recommendedQuery.not("id", "in", `(${enrolledIds.join(",")})`);
  const { data: recommended } = await recommendedQuery;

  const avgProgress = enrolled.length ? Math.round(enrolled.reduce((a, c) => a + c.progress, 0) / enrolled.length) : 0;

  main.innerHTML = `
    <div class="dash-welcome">
      <h2>Bon retour, ${escapeHtml(profile.full_name)} <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg></h2>
      <p>Vous avez ${inProgress.length} cours en cours et ${completed.length} cours terminé${completed.length > 1 ? "s" : ""}. Continuez sur votre lancée !</p>
    </div>
    <div class="dash-stats">
      <div class="dash-stat-card"><b>${enrolled.length}</b><span>Cours inscrits</span></div>
      <div class="dash-stat-card"><b>${completed.length}</b><span>Cours terminés</span></div>
      <div class="dash-stat-card"><b>${completed.length}</b><span>Certificats obtenus</span></div>
      <div class="dash-stat-card"><b>${avgProgress}%</b><span>Progression moyenne</span></div>
    </div>

    <h3 style="font-size:17px;margin-bottom:14px;">Reprendre où vous en étiez</h3>
    ${
      inProgress
        .map(
          (c) => `
      <div class="enrolled-card">
        <div class="enrolled-thumb"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 4C9 2 5 2 3 3v15c2-1 6-1 9 1 3-2 7-2 9-1V3c-2-1-6-1-9 1"/><path d="M12 4v16"/></svg></div>
        <div class="enrolled-info">
          <h4>${escapeHtml(c.title)}</h4>
          <div class="progress-bar"><div style="width:${c.progress}%"></div></div>
          <span class="small-muted">${c.progress}% complété</span>
        </div>
        <a href="/apprendre.html?cours=${c.slug}"><button class="btn btn-primary btn-sm">Continuer</button></a>
      </div>`
        )
        .join("") || `<p class="small-muted">Aucun cours en cours pour le moment.</p>`
    }

    <h3 style="font-size:17px;margin:28px 0 14px;">Recommandé pour vous</h3>
    <div class="course-grid">${(recommended ?? []).map((c) => courseCardHTML(c, [], exchangeRate)).join("")}</div>
  `;
}

// ===================== Mes cours =====================

async function renderCourses(main) {
  const enrolled = await loadEnrolledCourses();

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Mes cours</h2>
    ${enrolled
      .map(
        (c) => `
      <div class="enrolled-card">
        <div class="enrolled-thumb">${
          c.progress === 100
            ? '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>'
            : '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 4C9 2 5 2 3 3v15c2-1 6-1 9 1 3-2 7-2 9-1V3c-2-1-6-1-9 1"/><path d="M12 4v16"/></svg>'
        }</div>
        <div class="enrolled-info">
          <h4>${escapeHtml(c.title)}</h4>
          <div class="progress-bar"><div style="width:${c.progress}%"></div></div>
          <span class="small-muted">${c.progress}% complété · Formateur : ${escapeHtml(c.instructor?.full_name ?? "JC Academy")}</span>
        </div>
        <a href="/apprendre.html?cours=${c.slug}"><button class="btn ${c.progress === 100 ? "btn-outline" : "btn-primary"} btn-sm">${c.progress === 100 ? "Revoir" : "Continuer"}</button></a>
      </div>`
      )
      .join("")}
    ${!enrolled.length ? `<p class="small-muted">Vous n'êtes inscrit à aucun cours pour le moment.</p>` : ""}
  `;
}

// ===================== Favoris =====================

async function renderWishlist(main) {
  const { data: rows, error } = await supabase
    .from("wishlists")
    .select("course_id, courses(id, slug, title, category, price_usd, duration_text, students_count, rating)")
    .eq("student_id", profile.id);

  const courses = error ? [] : rows.filter((r) => r.courses).map((r) => r.courses);
  const wishlistIds = courses.map((c) => c.id);

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Mes favoris</h2>
    ${
      courses.length
        ? `<div class="course-grid">${courses.map((c) => courseCardHTML(c, wishlistIds, exchangeRate)).join("")}</div>`
        : `<p class="small-muted">Vous n'avez pas encore ajouté de cours à vos favoris. Cliquez sur le cœur <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9Z"/></svg> sur une carte de cours pour l'ajouter ici.</p>`
    }
  `;

  attachCourseCardHandlers(main, async (courseId, button) => {
    const nowActive = await toggleWishlist(courseId);
    if (!nowActive) {
      // Retiré des favoris : on fait disparaître la carte de cette liste,
      // comme dans le prototype (l'onglet ne montre que les favoris actuels).
      button.closest(".course-card")?.remove();
    }
    return nowActive;
  });
}

// ===================== Certificats =====================

async function renderCertificates(main) {
  const enrolled = await loadEnrolledCourses();
  const completed = enrolled.filter((c) => c.progress === 100);
  const inProgress = enrolled.filter((c) => c.progress < 100);

  const { data: certificates } = await supabase
    .from("certificates")
    .select("course_id, status, certificate_number, verification_code, file_url")
    .eq("student_id", profile.id);

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Mes certificats</h2>
    ${completed
      .map((c) => {
        const cert = (certificates ?? []).find((x) => x.course_id === c.id);
        return `
      <div class="cert-card" data-course-id="${c.id}">
        <div class="cert-icon"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/></svg></div>
        <div style="flex:1;">
          <h4 style="margin:0 0 3px;font-size:14.5px;">${escapeHtml(c.title)}</h4>
          ${
            !cert
              ? `<span class="small-muted">Cours terminé — vous pouvez demander votre certificat</span>`
              : cert.status === "envoye"
              ? `<span class="small-muted">Certificat envoyé · N° ${cert.certificate_number ?? "—"} · <a href="/certificat-verifier.html?code=${cert.verification_code}" target="_blank">Vérifier</a></span>`
              : `<span class="small-muted">Demande envoyée — en attente de traitement par un administrateur (1 à 2 jours ouvrés)</span>`
          }
        </div>
        ${!cert ? `<button class="btn btn-gold btn-sm" data-open-cert-form="${c.id}">Demander mon certificat</button>` : ""}
        ${cert?.status === "envoye" && cert.file_url ? `<a href="${cert.file_url}" target="_blank" class="btn btn-outline btn-sm">Télécharger</a>` : ""}
      </div>
      <div class="cert-request-form hidden" data-cert-form="${c.id}" style="max-width:420px;margin:-6px 0 18px 56px;">
        <div class="field"><label>Nom complet à afficher sur le certificat</label><input type="text" data-cert-name="${c.id}" value="${escapeHtml(profile.full_name)}"></div>
        <div class="field"><label>E-mail de réception</label><input type="email" data-cert-email="${c.id}" value="${profile.email}"></div>
        <button class="btn btn-gold btn-sm" data-submit-cert="${c.id}">Envoyer ma demande</button>
      </div>`;
      })
      .join("")}
    ${inProgress
      .map(
        (c) => `
      <div class="cert-card">
        <div class="cert-icon pending"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
        <div style="flex:1;">
          <h4 style="margin:0 0 3px;font-size:14.5px;">${escapeHtml(c.title)}</h4>
          <span class="small-muted">Disponible après réussite de tous les modules (${c.progress}% complété)</span>
        </div>
      </div>`
      )
      .join("")}
    ${!completed.length && !inProgress.length ? `<p class="small-muted">Aucun cours en cours ou terminé pour le moment.</p>` : ""}
    <p class="small-muted" style="margin-top:16px;">⏳ Une fois votre demande envoyée, un administrateur prépare votre certificat et vous l'envoie ici même — comptez 1 à 2 jours ouvrés.</p>
  `;

  main.querySelectorAll("[data-open-cert-form]").forEach((btn) => {
    btn.addEventListener("click", () => {
      main.querySelector(`[data-cert-form="${btn.getAttribute("data-open-cert-form")}"]`)?.classList.toggle("hidden");
    });
  });

  main.querySelectorAll("[data-submit-cert]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const courseId = btn.getAttribute("data-submit-cert");
      const recipient_name = main.querySelector(`[data-cert-name="${courseId}"]`).value.trim();
      const recipient_email = main.querySelector(`[data-cert-email="${courseId}"]`).value.trim();
      if (!recipient_name || !recipient_email) return alert("Merci de renseigner le nom et l'e-mail.");

      btn.disabled = true;
      btn.textContent = "Envoi…";
      const { error } = await supabase.from("certificates").insert({ student_id: profile.id, course_id: courseId, recipient_name, recipient_email });
      if (error) {
        alert("Erreur : " + error.message);
        btn.disabled = false;
        btn.textContent = "Envoyer ma demande";
        return;
      }
      renderCertificates(main);
    });
  });
}

// ===================== Paiements =====================

const METHOD_LABELS = { moncash: "MonCash", natcash: "NatCash", card: "Carte bancaire", paypal: "PayPal" };
const STATUS_LABELS = { paid: "Payé", pending: "En attente", processing: "En cours", failed: "Échoué", cancelled: "Annulé", refunded: "Remboursé", expired: "Expiré" };

async function renderPayments(main) {
  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, item_type, item_id, amount, currency, method, status, created_at")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }

  const titles = await loadItemTitles(payments);

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Paiements & factures</h2>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Référence</th><th>Article</th><th>Date</th><th>Montant</th><th>Méthode</th><th>Statut</th><th></th></tr></thead>
      <tbody>
        ${payments
          .map(
            (p) => `<tr>
          <td>${p.id.slice(0, 8).toUpperCase()}</td>
          <td>${titles[`${p.item_type}:${p.item_id}`] ?? "—"}</td>
          <td>${new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
          <td>${p.currency === "usd" ? fmtUSD(Number(p.amount)) : Number(p.amount).toLocaleString("fr-FR") + " HTG"}</td>
          <td>${METHOD_LABELS[p.method] ?? p.method}</td>
          <td><span class="status-pill ${p.status === "paid" ? "ok" : p.status === "failed" || p.status === "cancelled" ? "blocked" : "pending"}">${STATUS_LABELS[p.status] ?? p.status}</span></td>
          <td>
            ${p.status === "paid" ? `<button class="icon-btn" title="Télécharger la facture" data-invoice="${p.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg></button>` : ""}
            ${p.status === "paid" && p.item_type === "product" ? `<button class="icon-btn" title="Télécharger le produit" data-product-download="${p.item_id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M6 8h12l-1 13H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg></button>` : ""}
          </td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table></div>
    ${!payments.length ? `<p class="small-muted">Aucune transaction pour le moment.</p>` : ""}
  `;

  main.querySelectorAll("[data-invoice]").forEach((btn) => {
    btn.addEventListener("click", () => downloadInvoice(btn, btn.getAttribute("data-invoice")));
  });
  main.querySelectorAll("[data-product-download]").forEach((btn) => {
    btn.addEventListener("click", () => downloadProduct(btn, btn.getAttribute("data-product-download")));
  });
}

async function loadItemTitles(payments) {
  const courseIds = payments.filter((p) => p.item_type === "course").map((p) => p.item_id);
  const productIds = payments.filter((p) => p.item_type === "product").map((p) => p.item_id);
  const titles = {};

  if (courseIds.length) {
    const { data } = await supabase.from("courses").select("id, title").in("id", courseIds);
    (data ?? []).forEach((c) => (titles[`course:${c.id}`] = c.title));
  }
  if (productIds.length) {
    const { data } = await supabase.from("products").select("id, title").in("id", productIds);
    (data ?? []).forEach((p) => (titles[`product:${p.id}`] = p.title));
  }
  return titles;
}

// Facture PDF générée à la demande côté serveur (§12) — remplace
// l'ancien reçu .txt bricolé côté client. Rien n'est stocké : le PDF est
// reconstruit à chaque téléchargement à partir des données réelles du
// paiement, jamais depuis des valeurs saisies dans le navigateur.
async function downloadInvoice(button, paymentId) {
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.textContent = "…";

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/generate-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ paymentId }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "Erreur lors de la génération de la facture.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Facture-${paymentId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

// Téléchargement d'un produit numérique acheté (§14) : demande une URL
// signée à durée limitée au serveur, qui revérifie le paiement à chaque
// fois — jamais un lien permanent stocké côté client.
async function downloadProduct(button, productId) {
  const originalHTML = button.innerHTML;
  button.disabled = true;
  button.textContent = "…";

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/product-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ productId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Erreur lors du téléchargement.");
    window.location.href = result.url;
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.innerHTML = originalHTML;
  }
}

// ===================== Profil =====================

async function renderProfile(main) {
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, bio, avatar_url")
    .eq("id", profile.id)
    .single();

  let pendingAvatarUrl = fullProfile.avatar_url || "";

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Mon profil</h2>
    <div style="max-width:480px;">
      ${avatarUploadFieldHTML("studentProfileAvatar", fullProfile.avatar_url)}
      <div class="field"><label>Nom complet</label><input type="text" id="studentProfileName" value="${escapeHtml(fullProfile.full_name ?? "")}"></div>
      <div class="field"><label>E-mail</label><input type="email" value="${fullProfile.email}" disabled style="opacity:.6;"></div>
      <div class="field"><label>Téléphone</label><input type="tel" id="studentProfilePhone" value="${fullProfile.phone ?? ""}" placeholder="+509 00 00 0000"></div>
      <div class="field"><label>Bio</label><textarea id="studentProfileBio" rows="3">${escapeHtml(fullProfile.bio ?? "")}</textarea></div>
      <button class="btn btn-primary" id="studentProfileSave">Enregistrer</button>
      <p id="studentProfileMessage" class="small-muted hidden" style="margin-top:10px;"></p>
    </div>
  `;

  wireAvatarUpload(main, "studentProfileAvatar", profile.id, (url) => {
    pendingAvatarUrl = url;
  });

  main.querySelector("#studentProfileSave").addEventListener("click", async () => {
    const full_name = main.querySelector("#studentProfileName").value.trim();
    const phone = main.querySelector("#studentProfilePhone").value.trim();
    const bio = main.querySelector("#studentProfileBio").value.trim();
    const messageBox = main.querySelector("#studentProfileMessage");

    if (!full_name) {
      messageBox.textContent = "Le nom ne peut pas être vide.";
      messageBox.classList.remove("hidden");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name, phone, bio, avatar_url: pendingAvatarUrl })
      .eq("id", profile.id);

    messageBox.textContent = error ? "Erreur : " + error.message : "Profil mis à jour !";
    messageBox.classList.remove("hidden");
    if (!error) {
      profile.full_name = full_name;
      document.querySelector(".dash-user b").textContent = full_name;
    }
  });
}

// ===================== Paramètres =====================

async function renderSettings(main) {
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("notify_email, notify_platform, notify_newsletter, profile_public")
    .eq("id", profile.id)
    .single();

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Paramètres du compte</h2>
    <div style="max-width:480px;">
      <h4 style="font-size:14.5px;margin-bottom:12px;">Sécurité</h4>
      <div class="field"><label>Mot de passe actuel</label><input type="password" id="curPassword" placeholder="••••••••"></div>
      <div class="field"><label>Nouveau mot de passe</label><input type="password" id="newPassword" placeholder="8 caractères minimum" minlength="8"></div>
      <div class="field"><label>Confirmer le nouveau mot de passe</label><input type="password" id="confirmPassword" placeholder="••••••••"></div>
      <button class="btn btn-primary btn-sm" id="changePasswordBtn" style="margin-bottom:6px;">Changer le mot de passe</button>
      <p id="passwordMessage" class="small-muted hidden" style="margin-bottom:26px;"></p>

      <h4 style="font-size:14.5px;margin-bottom:12px;">Notifications</h4>
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;margin-bottom:10px;"><input type="checkbox" id="notifyEmail" ${fullProfile?.notify_email ? "checked" : ""}> Notifications par e-mail</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;margin-bottom:10px;"><input type="checkbox" id="notifyPlatform" ${fullProfile?.notify_platform ? "checked" : ""}> Notifications sur la plateforme</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;margin-bottom:16px;"><input type="checkbox" id="notifyNewsletter" ${fullProfile?.notify_newsletter ? "checked" : ""}> Newsletter & offres promotionnelles</label>

      <h4 style="font-size:14.5px;margin-bottom:12px;">Confidentialité</h4>
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;margin-bottom:16px;"><input type="checkbox" id="profilePublic" ${fullProfile?.profile_public ? "checked" : ""}> Rendre mon profil visible aux autres étudiants</label>
      <button class="btn btn-outline btn-sm" id="savePreferencesBtn" style="margin-bottom:26px;">Enregistrer mes préférences</button>
      <p id="preferencesMessage" class="small-muted hidden" style="margin-bottom:26px;"></p>

      <h4 style="font-size:14.5px;margin-bottom:12px;color:#B23B3B;">Zone de danger</h4>
      <button class="btn btn-outline btn-sm" id="deleteAccountBtn" style="border-color:#D64545;color:#D64545;">Supprimer mon compte</button>
      <p id="deleteAccountMessage" class="small-muted hidden" style="margin-top:10px;"></p>
    </div>
  `;

  main.querySelector("#changePasswordBtn").addEventListener("click", () => changePassword(main));
  main.querySelector("#savePreferencesBtn").addEventListener("click", () => savePreferences(main));
  main.querySelector("#deleteAccountBtn").addEventListener("click", () => deleteAccount(main));
}

async function changePassword(main) {
  const currentPassword = main.querySelector("#curPassword").value;
  const newPassword = main.querySelector("#newPassword").value;
  const confirmPassword = main.querySelector("#confirmPassword").value;
  const messageBox = main.querySelector("#passwordMessage");
  messageBox.classList.remove("hidden");

  if (newPassword.length < 8) {
    messageBox.textContent = "Le nouveau mot de passe doit faire au moins 8 caractères.";
    return;
  }
  if (newPassword !== confirmPassword) {
    messageBox.textContent = "La confirmation ne correspond pas au nouveau mot de passe.";
    return;
  }

  // On revérifie le mot de passe ACTUEL avant tout changement : sans
  // cela, quelqu'un qui trouve une session déjà ouverte pourrait
  // changer le mot de passe sans jamais le connaître.
  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword });
  if (reauthError) {
    messageBox.textContent = "Mot de passe actuel incorrect.";
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  messageBox.textContent = error ? "Erreur : " + error.message : "Mot de passe mis à jour !";
  if (!error) {
    main.querySelector("#curPassword").value = "";
    main.querySelector("#newPassword").value = "";
    main.querySelector("#confirmPassword").value = "";
  }
}

async function savePreferences(main) {
  const notify_email = main.querySelector("#notifyEmail").checked;
  const notify_platform = main.querySelector("#notifyPlatform").checked;
  const notify_newsletter = main.querySelector("#notifyNewsletter").checked;
  const profile_public = main.querySelector("#profilePublic").checked;
  const messageBox = main.querySelector("#preferencesMessage");

  const { error } = await supabase
    .from("profiles")
    .update({ notify_email, notify_platform, notify_newsletter, profile_public })
    .eq("id", profile.id);

  messageBox.textContent = error ? "Erreur : " + error.message : "Préférences enregistrées !";
  messageBox.classList.remove("hidden");
}

async function deleteAccount(main) {
  if (!confirm("Supprimer votre compte ? Cette action est irréversible.")) return;

  const messageBox = main.querySelector("#deleteAccountMessage");
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${supabase.supabaseUrl}/functions/v1/delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const result = await response.json();

  if (!response.ok) {
    messageBox.textContent = result.error || "Erreur lors de la suppression du compte.";
    messageBox.classList.remove("hidden");
    return;
  }

  await supabase.auth.signOut();
  window.location.href = "/";
}

init();
