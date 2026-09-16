// assets/js/dashboard-admin/dashboard-admin.js
//
// Port de renderAdminDashboard() du prototype. Onglets couverts :
// vue d'ensemble, cours (validation/rejet), formateurs, utilisateurs,
// contenu du site, articles, actualités, galerie, produits numériques,
// pages, paramètres du site, journal d'audit, mon profil.
//
// PAS ENCORE FAIT : paiements/remboursements admin, certificats admin
// (§18 les mentionne mais elles dépendent du LMS et de la facturation
// PDF, pas encore construits — voir la suite du README).
//
// Sécurité : la validation d'un cours, l'approbation d'un formateur et
// la suppression d'un utilisateur ne sont JAMAIS un .update() direct
// depuis ce fichier — toujours une Edge Function qui vérifie le rôle
// admin côté serveur et écrit dans audit_logs (voir §8 et §27). Le CMS
// (articles/actualités/galerie/produits/pages/contenu du site) reste en
// appel direct Supabase protégé par RLS admin-only : ce ne sont pas des
// actions financières ou de changement de rôle, le niveau de risque ne
// justifie pas une Edge Function dédiée pour chacune.

import { requireRole } from "./auth-guard.js";
import { supabase } from "./supabase-client.js";
import { fmtHTG, initials, escapeHtml } from "./format.js";
import { getSiteContent } from "./site-content.js";
import { avatarUploadFieldHTML, wireAvatarUpload } from "./avatar-upload.js";
import { imageUploadFieldHTML, wireImageUpload } from "./image-upload.js";
import { richTextEditorHTML, wireRichTextEditor, getRichTextContent } from "./rich-text-editor.js";

const NAV_ITEMS = [
  { id: "overview", label: "Vue d'ensemble", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>' },
  { id: "courses", label: "Cours", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 4C9 2 5 2 3 3v15c2-1 6-1 9 1 3-2 7-2 9-1V3c-2-1-6-1-9 1"/><path d="M12 4v16"/></svg>' },
  { id: "teachers", label: "Formateurs", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>' },
  { id: "users", label: "Utilisateurs", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 6.2a3.2 3.2 0 0 1 0 6.2"/><path d="M15.5 14.2a6.5 6.2 0 0 1 6 5.8"/></svg>' },
  { id: "certificates", label: "Certificats", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/></svg>' },
  { id: "content", label: "Contenu du site", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>' },
  { id: "articles", label: "Articles", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="5" width="14" height="14" rx="1"/><path d="M17 8h4v9a2 2 0 0 1-2 2H9"/><path d="M7 9h6"/><path d="M7 13h6"/><path d="M7 17h4"/></svg>' },
  { id: "news", label: "Actualités", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M3 10v4a1 1 0 0 0 1 1h2l7 4V5L6 9H4a1 1 0 0 0-1 1Z"/><path d="M17 8a4 4 0 0 1 0 8"/></svg>' },
  { id: "gallery", label: "Galerie", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5.5-5.5L5 21"/></svg>' },
  { id: "products", label: "Produits numériques", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M6 8h12l-1 13H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>' },
  { id: "pages", label: "Pages", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>' },
  { id: "audit-logs", label: "Journal d'audit", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>' },
  { id: "profile", label: "Mon profil", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>' },
  { id: "settings", label: "Paramètres du site", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"/></svg>' },
];

const NOT_YET_BUILT = new Set([]);

let profile = null;
let exchangeRate = 131;
let currentTab = "overview";
const pendingImage = {};

async function init() {
  profile = await requireRole(["admin"]);
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
        <span class="avatar" style="width:44px;height:44px;background:var(--gold);color:var(--navy-dark);">${initials(profile.full_name)}</span>
        <div><b>${profile.full_name}</b><span>Administrateur</span></div>
      </div>
      <nav class="dash-nav">
        ${NAV_ITEMS.map((n) => `<a href="#" data-tab="${n.id}" class="${n.id === currentTab ? "active" : ""}">${n.icon} ${n.label}</a>`).join("")}
        <a href="/"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> Retour au site</a>
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

  if (NOT_YET_BUILT.has(tab)) {
    const label = NAV_ITEMS.find((n) => n.id === tab)?.label ?? tab;
    main.innerHTML = `
      <h2 style="font-size:20px;margin-bottom:12px;">${label}</h2>
      <p class="small-muted">Cet onglet n'est pas encore construit dans cette étape de la migration. Il arrive dans une prochaine étape — voir le README du projet pour l'ordre prévu.</p>
    `;
    return;
  }

  if (tab === "overview") return renderOverview(main);
  if (tab === "courses") return renderCourses(main);
  if (tab === "teachers") return renderTeachers(main);
  if (tab === "users") return renderUsers(main);
  if (tab === "certificates") return renderCertificatesAdmin(main);
  if (tab === "content") return renderContent(main);
  if (tab === "articles") return renderArticles(main);
  if (tab === "news") return renderNews(main);
  if (tab === "gallery") return renderGallery(main);
  if (tab === "products") return renderProducts(main);
  if (tab === "pages") return renderPages(main);
  if (tab === "settings") return renderSettings(main);
  if (tab === "audit-logs") return renderAuditLogs(main);
  if (tab === "profile") return renderProfile(main);
}

async function callAdminFunction(name, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch(`${supabase.supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Erreur serveur");
  return result;
}

// ===================== Vue d'ensemble =====================

async function renderOverview(main) {
  const [{ count: publishedCourses }, { count: studentCount }, { count: teacherCount }, { data: pendingApps }] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "publie"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("teacher_applications").select("id, full_name, domain, status, applied_at").eq("status", "en_attente").order("applied_at", { ascending: false }),
  ]);

  main.innerHTML = `
    <div class="dash-welcome"><h2>Tableau de bord Administrateur</h2><p>Vue d'ensemble de la plateforme JC Academy.</p></div>
    <div class="dash-stats">
      <div class="dash-stat-card"><b>${publishedCourses || 0}</b><span>Cours publiés</span></div>
      <div class="dash-stat-card"><b>${studentCount || 0}</b><span>Étudiants</span></div>
      <div class="dash-stat-card"><b>${teacherCount || 0}</b><span>Formateurs actifs</span></div>
      <div class="dash-stat-card"><b>${(pendingApps ?? []).length}</b><span>Candidatures en attente</span></div>
    </div>
    <h3 style="font-size:17px;margin-bottom:14px;">Demandes de formateurs en attente</h3>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Nom</th><th>Domaine</th><th>Date</th><th></th></tr></thead>
      <tbody>
        ${
          (pendingApps ?? []).length
            ? pendingApps
                .map(
                  (a) => `<tr>
          <td>${escapeHtml(a.full_name)}</td><td>${escapeHtml(a.domain)}</td><td>${new Date(a.applied_at).toLocaleDateString("fr-FR")}</td>
          <td>
            <button class="icon-btn" title="Approuver" data-approve-app="${a.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M20 6 9 17l-5-5"/></svg></button>
            <button class="icon-btn danger" title="Rejeter" data-reject-app="${a.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg></button>
          </td>
        </tr>`
                )
                .join("")
            : `<tr><td colspan="4" class="small-muted">Aucune candidature en attente.</td></tr>`
        }
      </tbody>
    </table></div>
  `;

  main.querySelectorAll("[data-approve-app]").forEach((btn) => btn.addEventListener("click", () => decideApplication(main, btn.getAttribute("data-approve-app"), "approuve")));
  main.querySelectorAll("[data-reject-app]").forEach((btn) => btn.addEventListener("click", () => decideApplication(main, btn.getAttribute("data-reject-app"), "rejete")));
}

async function decideApplication(main, applicationId, decision) {
  try {
    await callAdminFunction("approve-teacher-application", { applicationId, decision });
    renderOverview(main);
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

// ===================== Cours =====================

async function renderCourses(main) {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, category, price_usd, status, instructor:profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }

  const badge = { publie: { cls: "ok", label: "Publié" }, rejete: { cls: "blocked", label: "Rejeté" }, en_attente: { cls: "pending", label: "En attente" } };

  main.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;">
      <h2 style="font-size:20px;margin:0;">Gestion des cours (${courses.length})</h2>
    </div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Titre</th><th>Catégorie</th><th>Prix</th><th>Formateur</th><th>Statut</th><th></th></tr></thead>
      <tbody>
        ${courses
          .map((c) => {
            const b = badge[c.status] ?? badge.en_attente;
            return `<tr>
          <td>${escapeHtml(c.title)}</td>
          <td>${c.category === "certificat" ? "Certificat" : "Diplôme"}</td>
          <td>${fmtHTG(Number(c.price_usd), exchangeRate)}</td>
          <td>${escapeHtml(c.instructor?.full_name ?? "—")}</td>
          <td><span class="status-pill ${b.cls}">${b.label}</span></td>
          <td>
            ${
              c.status === "en_attente"
                ? `<button class="icon-btn" title="Publier" data-approve-course="${c.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M20 6 9 17l-5-5"/></svg></button>
                   <button class="icon-btn danger" title="Rejeter" data-reject-course="${c.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg></button>`
                : ""
            }
          </td>
        </tr>`;
          })
          .join("")}
      </tbody>
    </table></div>
    ${!courses.length ? `<p class="small-muted">Aucun cours pour le moment.</p>` : ""}
  `;

  main.querySelectorAll("[data-approve-course]").forEach((btn) => btn.addEventListener("click", () => decideCourse(main, btn.getAttribute("data-approve-course"), "publie")));
  main.querySelectorAll("[data-reject-course]").forEach((btn) => btn.addEventListener("click", () => decideCourse(main, btn.getAttribute("data-reject-course"), "rejete")));
}

async function decideCourse(main, courseId, decision) {
  if (decision === "rejete" && !confirm("Rejeter ce cours ? Le formateur devra le soumettre à nouveau.")) return;
  try {
    await callAdminFunction("moderate-course", { courseId, decision });
    renderCourses(main);
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

// ===================== Formateurs =====================

async function renderTeachers(main) {
  const { data: teachers, error } = await supabase.from("profiles").select("id, full_name, bio").eq("role", "teacher");
  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }

  const { data: courseCounts } = await supabase.from("courses").select("instructor_id");
  const countByTeacher = {};
  (courseCounts ?? []).forEach((c) => (countByTeacher[c.instructor_id] = (countByTeacher[c.instructor_id] || 0) + 1));

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Formateurs</h2>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Nom</th><th>Bio</th><th>Cours (tous statuts)</th><th></th></tr></thead>
      <tbody>
        ${teachers
          .map(
            (t) => `<tr>
          <td>${escapeHtml(t.full_name)}</td><td class="small-muted">${escapeHtml((t.bio ?? "").slice(0, 60))}</td><td>${countByTeacher[t.id] || 0}</td>
          <td><button class="icon-btn danger" title="Supprimer" data-delete-user="${t.id}" data-user-name="${t.full_name.replace(/"/g, "&quot;")}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg></button></td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table></div>
    ${!teachers.length ? `<p class="small-muted">Aucun formateur pour le moment.</p>` : ""}
  `;

  wireDeleteUserButtons(main, () => renderTeachers(main));
}

// ===================== Utilisateurs =====================

async function renderUsers(main) {
  const { data: users, error } = await supabase.from("profiles").select("id, full_name, role, created_at").order("created_at", { ascending: false });
  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }

  const roleLabel = { admin: "Admin", teacher: "Formateur", student: "Étudiant" };

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Utilisateurs</h2>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Nom</th><th>Rôle</th><th>Inscrit le</th><th></th></tr></thead>
      <tbody>
        ${users
          .map(
            (u) => `<tr>
          <td>${escapeHtml(u.full_name)}</td><td>${roleLabel[u.role] ?? u.role}</td><td>${new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
          <td>${u.role !== "admin" ? `<button class="icon-btn danger" title="Supprimer" data-delete-user="${u.id}" data-user-name="${u.full_name.replace(/"/g, "&quot;")}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg></button>` : ""}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table></div>
  `;

  wireDeleteUserButtons(main, () => renderUsers(main));
}

function wireDeleteUserButtons(main, onDeleted) {
  main.querySelectorAll("[data-delete-user]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetUserId = btn.getAttribute("data-delete-user");
      const userName = btn.getAttribute("data-user-name");
      if (!confirm(`Supprimer définitivement le compte de ${userName} ? Cette action est irréversible.`)) return;
      try {
        await callAdminFunction("delete-user", { targetUserId });
        onDeleted();
      } catch (err) {
        alert("Erreur : " + err.message);
      }
    });
  });
}

// ===================== Journal d'audit =====================

async function renderAuditLogs(main) {
  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("action, target_type, target_id, created_at, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Journal d'audit</h2>
    <p class="small-muted" style="margin-bottom:16px;">Les 100 dernières actions sensibles (approbations, rejets, suppressions), tracées côté serveur.</p>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Date</th><th>Administrateur</th><th>Action</th><th>Cible</th></tr></thead>
      <tbody>
        ${
          logs.length
            ? logs.map((l) => `<tr><td>${new Date(l.created_at).toLocaleString("fr-FR")}</td><td>${escapeHtml(l.actor?.full_name ?? "—")}</td><td>${l.action}</td><td>${l.target_type ?? ""} ${l.target_id ?? ""}</td></tr>`).join("")
            : `<tr><td colspan="4" class="small-muted">Aucune action enregistrée pour le moment.</td></tr>`
        }
      </tbody>
    </table></div>
  `;
}

// ===================== Mon profil =====================

async function renderProfile(main) {
  const { data: fullProfile } = await supabase.from("profiles").select("full_name, email, phone, bio, avatar_url").eq("id", profile.id).single();
  let pendingAvatarUrl = fullProfile.avatar_url || "";

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Mon profil</h2>
    <div style="max-width:480px;">
      ${avatarUploadFieldHTML("adminProfileAvatar", fullProfile.avatar_url)}
      <div class="field"><label>Nom complet</label><input type="text" id="adminProfileName" value="${fullProfile.full_name ?? ""}"></div>
      <div class="field"><label>E-mail</label><input type="email" value="${fullProfile.email}" disabled style="opacity:.6;"></div>
      <div class="field"><label>Téléphone</label><input type="tel" id="adminProfilePhone" value="${fullProfile.phone ?? ""}" placeholder="+509 00 00 0000"></div>
      <div class="field"><label>Bio</label><textarea id="adminProfileBio" rows="3">${fullProfile.bio ?? ""}</textarea></div>
      <button class="btn btn-primary" id="adminProfileSave">Enregistrer</button>
      <p id="adminProfileMessage" class="small-muted hidden" style="margin-top:10px;"></p>
    </div>
  `;

  wireAvatarUpload(main, "adminProfileAvatar", profile.id, (url) => (pendingAvatarUrl = url));

  main.querySelector("#adminProfileSave").addEventListener("click", async () => {
    const full_name = main.querySelector("#adminProfileName").value.trim();
    const phone = main.querySelector("#adminProfilePhone").value.trim();
    const bio = main.querySelector("#adminProfileBio").value.trim();
    const messageBox = main.querySelector("#adminProfileMessage");
    if (!full_name) {
      messageBox.textContent = "Le nom ne peut pas être vide.";
      messageBox.classList.remove("hidden");
      return;
    }
    const { error } = await supabase.from("profiles").update({ full_name, phone, bio, avatar_url: pendingAvatarUrl }).eq("id", profile.id);
    messageBox.textContent = error ? "Erreur : " + error.message : "Profil mis à jour !";
    messageBox.classList.remove("hidden");
    if (!error) {
      profile.full_name = full_name;
      document.querySelector(".dash-user b").textContent = full_name;
    }
  });
}

// ===================== Contenu du site =====================

const CONTENT_DB_KEYS = {
  motto: "motto",
  heroEyebrow: "hero_eyebrow",
  heroTitle: "hero_title",
  heroTitleAccent: "hero_title_accent",
  heroLead: "hero_lead",
  aboutMission: "about_mission",
  footerAbout: "footer_about",
  contactPhone: "contact_phone",
  contactPhone2: "contact_phone2",
  contactAddress: "contact_address",
  contactEmail: "contact_email",
  contactHours: "contact_hours",
};

async function renderContent(main) {
  const { content } = await getSiteContent();

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:6px;">Contenu du site</h2>
    <p class="small-muted" style="margin-bottom:24px;">Modifiez les textes affichés sur l'accueil, le pied de page et la page À propos.</p>
    <div style="max-width:560px;">
      <h4 style="font-size:14.5px;margin-bottom:10px;">Devise / slogan (barre du haut)</h4>
      <div class="field"><input type="text" id="siteMotto" value="${content.motto}"></div>

      <h4 style="font-size:14.5px;margin:20px 0 10px;">Section d'accueil (Hero)</h4>
      <div class="field"><label>Étiquette</label><input type="text" id="siteHeroEyebrow" value="${content.heroEyebrow}"></div>
      <div class="field"><label>Titre principal</label><input type="text" id="siteHeroTitle" value="${content.heroTitle}"></div>
      <div class="field"><label>Titre (accent)</label><input type="text" id="siteHeroTitleAccent" value="${content.heroTitleAccent}"></div>
      <div class="field"><label>Texte d'introduction</label><textarea id="siteHeroLead" rows="3">${content.heroLead}</textarea></div>

      <h4 style="font-size:14.5px;margin:20px 0 10px;">À propos</h4>
      <div class="field"><label>Texte de mission</label><textarea id="siteAboutMission" rows="3">${content.aboutMission}</textarea></div>

      <h4 style="font-size:14.5px;margin:20px 0 10px;">Pied de page</h4>
      <div class="field"><label>Description JC Academy</label><textarea id="siteFooterAbout" rows="3">${content.footerAbout}</textarea></div>

      <h4 style="font-size:14.5px;margin:20px 0 10px;">Coordonnées</h4>
      <div class="field"><label>Téléphone (1)</label><input type="text" id="siteContactPhone" value="${content.contactPhone}"></div>
      <div class="field"><label>Téléphone (2)</label><input type="text" id="siteContactPhone2" value="${content.contactPhone2 || ""}"></div>
      <div class="field"><label>Adresse</label><input type="text" id="siteContactAddress" value="${content.contactAddress}"></div>
      <div class="field"><label>E-mail</label><input type="text" id="siteContactEmail" value="${content.contactEmail}"></div>
      <div class="field"><label>Horaires</label><input type="text" id="siteContactHours" value="${content.contactHours}"></div>

      <button class="btn btn-primary" id="saveContentBtn">Enregistrer les modifications</button>
      <p id="contentMessage" class="small-muted hidden" style="margin-top:10px;"></p>
    </div>
  `;

  main.querySelector("#saveContentBtn").addEventListener("click", async () => {
    const rows = Object.entries(CONTENT_DB_KEYS).map(([jsKey, dbKey]) => ({
      key: dbKey,
      value: main.querySelector(`#site${jsKey.charAt(0).toUpperCase()}${jsKey.slice(1)}`)?.value ?? "",
    }));
    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
    const messageBox = main.querySelector("#contentMessage");
    messageBox.textContent = error ? "Erreur : " + error.message : "Contenu du site mis à jour !";
    messageBox.classList.remove("hidden");
  });
}

// ===================== Articles =====================

async function renderArticles(main) {
  const { data: articles, error } = await supabase.from("articles").select("id, title, tag, excerpt, author, content, image_url").order("published_at", { ascending: false });
  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }
  renderArticleEditor(main, articles, null);
}

function renderArticleEditor(main, articles, editing) {
  main.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;"><h2 style="font-size:20px;margin:0;">Gestion des articles (${articles.length})</h2></div>
    <div style="max-width:560px;margin-bottom:26px;">
      <h4 style="margin:0 0 14px;font-size:14.5px;">${editing ? "Modifier l'article" : "Nouvel article"}</h4>
      <div class="field"><label>Titre de l'article</label><input type="text" id="artTitle" value="${escapeHtml(editing?.title ?? "")}" placeholder="Titre..."></div>
      <div class="field"><label>Catégorie</label><input type="text" id="artTag" value="${escapeHtml(editing?.tag ?? "")}" placeholder="Ex: Carrière"></div>
      <div class="field"><label>Extrait (résumé affiché sur les cartes)</label><textarea id="artExcerpt" rows="2" placeholder="Résumé court...">${escapeHtml(editing?.excerpt ?? "")}</textarea></div>
      ${richTextEditorHTML("artBody", editing?.content ?? "", "Contenu de l'article")}
      <div class="field"><label>Auteur</label><input type="text" id="artAuthor" value="${escapeHtml(editing?.author ?? "")}" placeholder="Ex: Équipe JC Academy"></div>
      ${imageUploadFieldHTML("artImg", "Image de couverture", editing?.image_url)}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${editing ? `<button class="btn btn-outline btn-sm" id="artCancelBtn">Annuler</button>` : ""}
        <button class="btn btn-gold btn-sm" id="artSaveBtn">${editing ? "Enregistrer" : "Publier l'article"}</button>
      </div>
    </div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Titre</th><th>Catégorie</th><th>Auteur</th><th></th></tr></thead>
      <tbody>
        ${articles
          .map(
            (a) => `<tr><td>${escapeHtml(a.title)}</td><td>${escapeHtml(a.tag)}</td><td>${escapeHtml(a.author)}</td><td>
          <button class="icon-btn" data-edit-article="${a.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="icon-btn danger" data-delete-article="${a.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg></button>
        </td></tr>`
          )
          .join("")}
      </tbody>
    </table></div>
  `;

  wireImageUpload(main, "artImg", "articles", profile.id, (url) => (pendingImage.artImg = url));
  wireRichTextEditor(main, "artBody", "articles", profile.id);

  main.querySelector("#artCancelBtn")?.addEventListener("click", () => renderArticleEditor(main, articles, null));
  main.querySelector("#artSaveBtn").addEventListener("click", async () => {
    const title = main.querySelector("#artTitle").value.trim();
    if (!title) return alert("Merci de renseigner un titre.");
    const payload = {
      title,
      tag: main.querySelector("#artTag").value.trim() || "Général",
      excerpt: main.querySelector("#artExcerpt").value.trim(),
      author: main.querySelector("#artAuthor").value.trim() || "Administrateur",
      content: getRichTextContent(main, "artBody"),
    };
    if (pendingImage.artImg) payload.image_url = pendingImage.artImg;

    const { error } = editing
      ? await supabase.from("articles").update(payload).eq("id", editing.id)
      : await supabase.from("articles").insert(payload);
    if (error) return alert("Erreur : " + error.message);
    pendingImage.artImg = null;
    renderArticles(main);
  });

  main.querySelectorAll("[data-edit-article]").forEach((btn) =>
    btn.addEventListener("click", () => renderArticleEditor(main, articles, articles.find((a) => a.id === btn.getAttribute("data-edit-article"))))
  );
  main.querySelectorAll("[data-delete-article]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer cet article ?")) return;
      const { error } = await supabase.from("articles").delete().eq("id", btn.getAttribute("data-delete-article"));
      if (error) return alert("Erreur : " + error.message);
      renderArticles(main);
    })
  );
}

// ===================== Actualités =====================

async function renderNews(main) {
  const { data: news, error } = await supabase.from("news").select("id, title, excerpt, content, image_url, published_at").order("published_at", { ascending: false });
  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }
  renderNewsEditor(main, news, null);
}

function renderNewsEditor(main, news, editing) {
  main.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;"><h2 style="font-size:20px;margin:0;">Gestion des actualités (${news.length})</h2></div>
    <div style="max-width:560px;margin-bottom:26px;">
      <h4 style="margin:0 0 14px;font-size:14.5px;">${editing ? "Modifier l'actualité" : "Nouvelle actualité"}</h4>
      <div class="field"><label>Titre</label><input type="text" id="newsTitle" value="${escapeHtml(editing?.title ?? "")}" placeholder="Titre de l'actualité..."></div>
      <div class="field"><label>Résumé (affiché sur les cartes)</label><textarea id="newsExcerpt" rows="2" placeholder="Résumé court...">${escapeHtml(editing?.excerpt ?? "")}</textarea></div>
      ${richTextEditorHTML("newsBody", editing?.content ?? "", "Contenu")}
      ${imageUploadFieldHTML("newsImg", "Image", editing?.image_url)}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${editing ? `<button class="btn btn-outline btn-sm" id="newsCancelBtn">Annuler</button>` : ""}
        <button class="btn btn-gold btn-sm" id="newsSaveBtn">${editing ? "Enregistrer" : "Publier l'actualité"}</button>
      </div>
    </div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Titre</th><th>Date</th><th></th></tr></thead>
      <tbody>
        ${news
          .map(
            (n) => `<tr><td>${escapeHtml(n.title)}</td><td>${new Date(n.published_at).toLocaleDateString("fr-FR")}</td><td>
          <button class="icon-btn" data-edit-news="${n.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="icon-btn danger" data-delete-news="${n.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg></button>
        </td></tr>`
          )
          .join("")}
      </tbody>
    </table></div>
  `;

  wireImageUpload(main, "newsImg", "articles", profile.id, (url) => (pendingImage.newsImg = url));
  wireRichTextEditor(main, "newsBody", "articles", profile.id);

  main.querySelector("#newsCancelBtn")?.addEventListener("click", () => renderNewsEditor(main, news, null));
  main.querySelector("#newsSaveBtn").addEventListener("click", async () => {
    const title = main.querySelector("#newsTitle").value.trim();
    if (!title) return alert("Merci de renseigner un titre.");
    const payload = { title, excerpt: main.querySelector("#newsExcerpt").value.trim(), content: getRichTextContent(main, "newsBody") };
    if (pendingImage.newsImg) payload.image_url = pendingImage.newsImg;

    const { error } = editing ? await supabase.from("news").update(payload).eq("id", editing.id) : await supabase.from("news").insert(payload);
    if (error) return alert("Erreur : " + error.message);
    pendingImage.newsImg = null;
    renderNews(main);
  });

  main.querySelectorAll("[data-edit-news]").forEach((btn) => btn.addEventListener("click", () => renderNewsEditor(main, news, news.find((n) => n.id === btn.getAttribute("data-edit-news")))));
  main.querySelectorAll("[data-delete-news]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer cette actualité ?")) return;
      const { error } = await supabase.from("news").delete().eq("id", btn.getAttribute("data-delete-news"));
      if (error) return alert("Erreur : " + error.message);
      renderNews(main);
    })
  );
}

// ===================== Galerie =====================

async function renderGallery(main) {
  const { data: gallery, error } = await supabase.from("gallery").select("id, title, description, image_url").order("position");
  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }
  renderGalleryEditor(main, gallery, null);
}

function renderGalleryEditor(main, gallery, editing) {
  main.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;"><h2 style="font-size:20px;margin:0;">Gestion de la galerie (${gallery.length})</h2></div>
    <div style="max-width:520px;margin-bottom:26px;">
      <h4 style="margin:0 0 14px;font-size:14.5px;">${editing ? "Modifier la photo" : "Nouvelle photo"}</h4>
      <div class="field"><label>Titre de la photo</label><input type="text" id="galTitle" value="${escapeHtml(editing?.title ?? "")}" placeholder="Ex: Journée portes ouvertes"></div>
      <div class="field"><label>Description</label><input type="text" id="galDesc" value="${escapeHtml(editing?.description ?? "")}" placeholder="Courte description..."></div>
      ${imageUploadFieldHTML("galImg", "Photo", editing?.image_url)}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${editing ? `<button class="btn btn-outline btn-sm" id="galCancelBtn">Annuler</button>` : ""}
        <button class="btn btn-gold btn-sm" id="galSaveBtn">${editing ? "Enregistrer" : "Ajouter à la galerie"}</button>
      </div>
    </div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Titre</th><th>Description</th><th></th></tr></thead>
      <tbody>
        ${gallery
          .map(
            (g) => `<tr><td>${escapeHtml(g.title)}</td><td>${escapeHtml(g.description ?? "")}</td><td>
          <button class="icon-btn" data-edit-gallery="${g.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="icon-btn danger" data-delete-gallery="${g.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg></button>
        </td></tr>`
          )
          .join("")}
      </tbody>
    </table></div>
  `;

  wireImageUpload(main, "galImg", "gallery", profile.id, (url) => (pendingImage.galImg = url));

  main.querySelector("#galCancelBtn")?.addEventListener("click", () => renderGalleryEditor(main, gallery, null));
  main.querySelector("#galSaveBtn").addEventListener("click", async () => {
    const title = main.querySelector("#galTitle").value.trim();
    if (!title) return alert("Merci de renseigner un titre.");
    const payload = { title, description: main.querySelector("#galDesc").value.trim() };
    if (pendingImage.galImg) payload.image_url = pendingImage.galImg;

    const { error } = editing
      ? await supabase.from("gallery").update(payload).eq("id", editing.id)
      : await supabase.from("gallery").insert({ ...payload, position: gallery.length });
    if (error) return alert("Erreur : " + error.message);
    pendingImage.galImg = null;
    renderGallery(main);
  });

  main.querySelectorAll("[data-edit-gallery]").forEach((btn) => btn.addEventListener("click", () => renderGalleryEditor(main, gallery, gallery.find((g) => g.id === btn.getAttribute("data-edit-gallery")))));
  main.querySelectorAll("[data-delete-gallery]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer cette photo ?")) return;
      const { error } = await supabase.from("gallery").delete().eq("id", btn.getAttribute("data-delete-gallery"));
      if (error) return alert("Erreur : " + error.message);
      renderGallery(main);
    })
  );
}

// ===================== Produits numériques =====================

async function renderProducts(main) {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, title, tagline, description, price_usd, benefits, faq, file_path, cover_image_url, status")
    .order("created_at", { ascending: false });
  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }
  renderProductEditor(main, products, null);
}

function renderProductEditor(main, products, editing) {
  const benefitsText = editing?.benefits?.join("\n") ?? "";
  const faqText = editing?.faq?.map((f) => `${f.q} | ${f.a}`).join("\n") ?? "";

  main.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;"><h2 style="font-size:20px;margin:0;">Produits numériques (${products.length})</h2></div>
    <div style="max-width:560px;margin-bottom:26px;">
      <h4 style="margin:0 0 14px;font-size:14.5px;">${editing ? "Modifier le produit" : "Nouveau produit"}</h4>
      <div class="field"><label>Titre</label><input type="text" id="prodTitle" value="${escapeHtml(editing?.title ?? "")}" placeholder="Ex: Guide complet du freelance en Haïti"></div>
      <div class="field"><label>Accroche courte</label><input type="text" id="prodTagline" value="${escapeHtml(editing?.tagline ?? "")}" placeholder="Une phrase qui donne envie d'acheter"></div>
      <div class="field"><label>Description complète</label><textarea id="prodDesc" rows="3">${escapeHtml(editing?.description ?? "")}</textarea></div>
      <div class="field"><label>Prix (USD, 0 pour gratuit)</label><input type="number" id="prodPrice" value="${editing?.price_usd ?? 0}"></div>
      <div class="field"><label>Avantages (un par ligne)</label><textarea id="prodBenefits" rows="4" placeholder="Ex:&#10;PDF de 50 pages&#10;Modèles inclus">${benefitsText}</textarea></div>
      <div class="field"><label>FAQ (format Question | Réponse, une par ligne)</label><textarea id="prodFaq" rows="4" placeholder="Comment je reçois le produit ? | Par téléchargement immédiat.">${faqText}</textarea></div>
      <div class="field">
        <label>Fichier livré à l'acheteur (PDF, zip...)</label>
        <input type="file" id="prodFile">
        <p class="small-muted" style="margin-top:4px;">${editing?.file_path ? "Un fichier est déjà déposé — en choisir un nouveau le remplace." : "Aucun fichier déposé pour l'instant."}</p>
      </div>
      ${imageUploadFieldHTML("prodImg", "Image de couverture", editing?.cover_image_url)}
      <div class="field"><label>Statut</label><select id="prodStatus">
        <option value="brouillon" ${editing?.status === "brouillon" ? "selected" : ""}>Brouillon</option>
        <option value="publie" ${editing?.status === "publie" ? "selected" : ""}>Publié</option>
      </select></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${editing ? `<button class="btn btn-outline btn-sm" id="prodCancelBtn">Annuler</button>` : ""}
        <button class="btn btn-gold btn-sm" id="prodSaveBtn">${editing ? "Enregistrer" : "Créer le produit"}</button>
      </div>
    </div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Titre</th><th>Prix</th><th>Statut</th><th></th></tr></thead>
      <tbody>
        ${products
          .map(
            (p) => `<tr><td>${escapeHtml(p.title)}</td><td>${fmtHTG(Number(p.price_usd), exchangeRate)}</td><td><span class="status-pill ${p.status === "publie" ? "ok" : "pending"}">${p.status === "publie" ? "Publié" : "Brouillon"}</span></td><td>
          <button class="icon-btn" data-edit-product="${p.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="icon-btn danger" data-delete-product="${p.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg></button>
        </td></tr>`
          )
          .join("")}
      </tbody>
    </table></div>
  `;

  wireImageUpload(main, "prodImg", "products", profile.id, (url) => (pendingImage.prodImg = url));

  main.querySelector("#prodCancelBtn")?.addEventListener("click", () => renderProductEditor(main, products, null));
  main.querySelector("#prodSaveBtn").addEventListener("click", async () => {
    const title = main.querySelector("#prodTitle").value.trim();
    if (!title) return alert("Merci de renseigner un titre.");
    const benefits = main.querySelector("#prodBenefits").value.split("\n").map((s) => s.trim()).filter(Boolean);
    const faq = main
      .querySelector("#prodFaq")
      .value.split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const [q, ...rest] = line.split("|");
        return { q: (q || "").trim(), a: rest.join("|").trim() };
      })
      .filter((f) => f.q && f.a);

    const payload = {
      title,
      tagline: main.querySelector("#prodTagline").value.trim(),
      description: main.querySelector("#prodDesc").value.trim(),
      price_usd: parseFloat(main.querySelector("#prodPrice").value) || 0,
      benefits,
      faq,
      status: main.querySelector("#prodStatus").value,
    };
    if (pendingImage.prodImg) payload.cover_image_url = pendingImage.prodImg;

    const file = main.querySelector("#prodFile").files?.[0];
    if (file) {
      const path = `${Date.now()}-${file.name}`;
      // Bucket PRIVÉ (product-files) : aucune URL publique n'est générée
      // ici, seul le chemin est stocké — voir product-download/ pour la
      // génération d'une URL signée temporaire au moment de l'achat.
      const { error: uploadError } = await supabase.storage.from("product-files").upload(path, file, { upsert: true });
      if (uploadError) return alert("Erreur lors de l'envoi du fichier : " + uploadError.message);
      payload.file_path = path;
    }

    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return alert("Erreur : " + error.message);
    pendingImage.prodImg = null;
    renderProducts(main);
  });

  main.querySelectorAll("[data-edit-product]").forEach((btn) =>
    btn.addEventListener("click", () => renderProductEditor(main, products, products.find((p) => p.id === btn.getAttribute("data-edit-product"))))
  );
  main.querySelectorAll("[data-delete-product]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer ce produit ?")) return;
      const { error } = await supabase.from("products").delete().eq("id", btn.getAttribute("data-delete-product"));
      if (error) return alert("Erreur : " + error.message);
      renderProducts(main);
    })
  );
}

// ===================== Pages =====================

async function renderPages(main) {
  const { data: pages, error } = await supabase.from("pages").select("id, title, slug, status").order("created_at");
  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }
  renderPageEditor(main, pages, null);
}

function renderPageEditor(main, pages, editing) {
  main.innerHTML = `
    <div class="section-head" style="margin-bottom:20px;"><h2 style="font-size:20px;margin:0;">Gestion des pages (${pages.length})</h2></div>
    <div style="max-width:520px;margin-bottom:26px;">
      <h4 style="margin:0 0 14px;font-size:14.5px;">${editing ? "Modifier la page" : "Nouvelle page"}</h4>
      <div class="field"><label>Titre de la page</label><input type="text" id="pageTitleInput" value="${escapeHtml(editing?.title ?? "")}" placeholder="Ex: Politique de remboursement"></div>
      <div class="field"><label>Slug (URL)</label><input type="text" id="pageSlugInput" value="${editing?.slug ?? ""}" placeholder="/politique-remboursement"></div>
      <div class="field"><label>Statut</label><select id="pageStatusInput">
        <option value="brouillon" ${editing?.status === "brouillon" ? "selected" : ""}>Brouillon</option>
        <option value="publiee" ${editing?.status === "publiee" ? "selected" : ""}>Publiée</option>
      </select></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${editing ? `<button class="btn btn-outline btn-sm" id="pageCancelBtn">Annuler</button>` : ""}
        <button class="btn btn-gold btn-sm" id="pageSaveBtn">${editing ? "Enregistrer" : "Créer la page"}</button>
      </div>
    </div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Titre</th><th>Slug</th><th>Statut</th><th></th></tr></thead>
      <tbody>
        ${pages
          .map(
            (p) => `<tr><td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.slug)}</td><td><span class="status-pill ${p.status === "publiee" ? "ok" : "pending"}">${p.status === "publiee" ? "Publiée" : "Brouillon"}</span></td><td>
          <button class="icon-btn" data-edit-page="${p.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          <button class="icon-btn danger" data-delete-page="${p.id}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg></button>
        </td></tr>`
          )
          .join("")}
      </tbody>
    </table></div>
  `;

  main.querySelector("#pageCancelBtn")?.addEventListener("click", () => renderPageEditor(main, pages, null));
  main.querySelector("#pageSaveBtn").addEventListener("click", async () => {
    const title = main.querySelector("#pageTitleInput").value.trim();
    if (!title) return alert("Merci de renseigner un titre.");
    const payload = {
      title,
      slug: main.querySelector("#pageSlugInput").value.trim() || "/" + title.toLowerCase().replace(/\s+/g, "-"),
      status: main.querySelector("#pageStatusInput").value,
    };
    const { error } = editing ? await supabase.from("pages").update(payload).eq("id", editing.id) : await supabase.from("pages").insert(payload);
    if (error) return alert("Erreur : " + error.message);
    renderPages(main);
  });

  main.querySelectorAll("[data-edit-page]").forEach((btn) => btn.addEventListener("click", () => renderPageEditor(main, pages, pages.find((p) => p.id === btn.getAttribute("data-edit-page")))));
  main.querySelectorAll("[data-delete-page]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer cette page ?")) return;
      const { error } = await supabase.from("pages").delete().eq("id", btn.getAttribute("data-delete-page"));
      if (error) return alert("Erreur : " + error.message);
      renderPages(main);
    })
  );
}

// ===================== Paramètres du site =====================

async function renderSettings(main) {
  const { content } = await getSiteContent();

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Paramètres du site</h2>
    <div style="max-width:480px;">
      <div class="field"><label>E-mail de contact</label><input type="email" id="siteSettingsEmail" value="${content.contactEmail}"></div>
      <div class="field"><label>Taux de change indicatif (1 USD =)</label>
        <div style="display:flex;align-items:center;gap:8px;">
          <input type="number" id="siteExchangeRate" value="${exchangeRate}" step="0.01">
          <span class="small-muted">HTG</span>
        </div>
      </div>
      <button class="btn btn-primary" id="saveSettingsBtn">Enregistrer</button>
      <p id="settingsMessage" class="small-muted hidden" style="margin-top:10px;"></p>
    </div>
  `;

  main.querySelector("#saveSettingsBtn").addEventListener("click", async () => {
    const messageBox = main.querySelector("#settingsMessage");
    const rateVal = parseFloat(main.querySelector("#siteExchangeRate").value);
    if (isNaN(rateVal) || rateVal <= 0) {
      messageBox.textContent = "Merci de saisir un taux de change valide.";
      messageBox.classList.remove("hidden");
      return;
    }
    const email = main.querySelector("#siteSettingsEmail").value.trim();
    const rows = [
      { key: "exchange_rate_htg_per_usd", value: String(rateVal) },
      { key: "contact_email", value: email },
    ];
    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
    messageBox.textContent = error ? "Erreur : " + error.message : "Paramètres enregistrés !";
    messageBox.classList.remove("hidden");
    if (!error) exchangeRate = rateVal;
  });
}

// ===================== Certificats =====================
//
// PAS de génération automatique : JC conçoit chaque certificat avec ses
// propres outils, en dehors de la plateforme. Ce que fait cet onglet :
// lister les demandes, laisser l'admin déposer le fichier fini (bucket
// Storage "certificates") et renseigner un numéro + un code de
// vérification, ce qui fait apparaître le certificat sur la page
// "Mes certificats" de l'étudiant et le rend vérifiable publiquement.

async function renderCertificatesAdmin(main) {
  const { data: certificates, error } = await supabase
    .from("certificates")
    .select("id, student_id, recipient_name, recipient_email, status, certificate_number, verification_code, file_url, created_at, student:profiles(full_name), course:courses(title)")
    .order("created_at", { ascending: false });

  if (error) {
    main.innerHTML = `<p>Erreur de chargement.</p>`;
    return;
  }

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:6px;">Demandes de certificats</h2>
    <p class="small-muted" style="margin-bottom:20px;">Les certificats sont conçus hors plateforme. Déposez ici le fichier fini pour qu'il apparaisse chez l'étudiant.</p>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Étudiant</th><th>Cours</th><th>Demandé le</th><th>Statut</th><th></th></tr></thead>
      <tbody>
        ${certificates
          .map(
            (c) => `<tr>
          <td>${escapeHtml(c.recipient_name)}<br><span class="small-muted">${escapeHtml(c.recipient_email)}</span></td>
          <td>${escapeHtml(c.course?.title ?? "—")}</td>
          <td>${new Date(c.created_at).toLocaleDateString("fr-FR")}</td>
          <td><span class="status-pill ${c.status === "envoye" ? "ok" : "pending"}">${c.status === "envoye" ? "Envoyé" : "En attente"}</span></td>
          <td>${c.status === "envoye" ? `<span class="small-muted">N° ${c.certificate_number ?? "—"}</span>` : `<button class="icon-btn" data-open-send="${c.id}" title="Déposer le certificat"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 21h14"/></svg></button>`}</td>
        </tr>
        <tr class="cert-send-row hidden" data-send-row="${c.id}"><td colspan="5">
          <div style="max-width:420px;padding:14px 0;">
            <div class="field"><label>Fichier du certificat (PDF ou image)</label><input type="file" accept="application/pdf,image/*" id="certFile-${c.id}"></div>
            <div class="field"><label>Numéro de certificat</label><input type="text" id="certNumber-${c.id}" placeholder="Ex: JCA-2026-0001"></div>
            <div class="field"><label>Code de vérification</label><input type="text" id="certCode-${c.id}" value="${cryptoRandomCode()}"></div>
            <button class="btn btn-gold btn-sm" data-send-cert="${c.id}">Envoyer à l'étudiant</button>
            <p class="small-muted hidden" id="certSendMsg-${c.id}" style="margin-top:8px;"></p>
          </div>
        </td></tr>`
          )
          .join("")}
      </tbody>
    </table></div>
    ${!certificates.length ? `<p class="small-muted">Aucune demande de certificat pour le moment.</p>` : ""}
  `;

  main.querySelectorAll("[data-open-send]").forEach((btn) => {
    btn.addEventListener("click", () => {
      main.querySelector(`[data-send-row="${btn.getAttribute("data-open-send")}"]`)?.classList.toggle("hidden");
    });
  });

  main.querySelectorAll("[data-send-cert]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const certId = btn.getAttribute("data-send-cert");
      const fileInput = main.querySelector(`#certFile-${certId}`);
      const number = main.querySelector(`#certNumber-${certId}`).value.trim();
      const code = main.querySelector(`#certCode-${certId}`).value.trim();
      const msgBox = main.querySelector(`#certSendMsg-${certId}`);
      const file = fileInput.files?.[0];

      if (!file || !number || !code) {
        msgBox.textContent = "Merci de fournir le fichier, un numéro et un code.";
        msgBox.classList.remove("hidden");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Envoi…";

      const path = `${certId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("certificates").upload(path, file, { upsert: true });
      if (uploadError) {
        msgBox.textContent = "Erreur d'envoi du fichier : " + uploadError.message;
        msgBox.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = "Envoyer à l'étudiant";
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("certificates").getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("certificates")
        .update({ file_url: publicUrl, certificate_number: number, verification_code: code, issue_date: new Date().toISOString().slice(0, 10), status: "envoye" })
        .eq("id", certId);

      if (updateError) {
        msgBox.textContent = "Erreur : " + updateError.message;
        msgBox.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = "Envoyer à l'étudiant";
        return;
      }

      const sentCert = certificates.find((c) => c.id === certId);
      if (sentCert) {
        await supabase.from("notifications").insert({
          user_id: sentCert.student_id,
          type: "certificate_sent",
          title: "Votre certificat est prêt !",
          message: `Votre certificat pour "${sentCert.course?.title ?? "votre cours"}" est disponible.`,
          link: "/tableau-de-bord.html",
        });
      }

      renderCertificatesAdmin(main);
    });
  });
}

function cryptoRandomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(36))
    .join("")
    .toUpperCase()
    .slice(0, 8);
}

init();
