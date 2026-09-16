// assets/js/dashboard-formateur/dashboard-formateur.js
//
// Port fidèle de renderTeacherDashboard() du prototype : même sidebar,
// mêmes 8 onglets (vue d'ensemble, mes cours, créer un cours, étudiants,
// revenus, avis reçus, profil public, recevoir mes paiements).
//
// Correction d'audit : le squelette précédent interrogeait
// courses.teacher_id, qui n'existe pas — la vraie colonne est
// instructor_id (voir l'audit de l'étape "page d'accueil").
//
// Sécurité (§19) : la création de cours envoie toujours status =
// "en_attente" (jamais "publie" directement) — et depuis la migration
// 0005_rls_courses_modules.sql, ce n'est plus seulement une convention
// côté client mais une policy RLS qui l'impose réellement.

import { requireRole } from "./auth-guard.js";
import { supabase } from "./supabase-client.js";
import { fmtHTG, initials, renderStarsHTML, escapeHtml } from "./format.js";
import { getSiteContent } from "./site-content.js";
import { avatarUploadFieldHTML, wireAvatarUpload } from "./avatar-upload.js";
import { imageUploadFieldHTML, wireImageUpload } from "./image-upload.js";

const NAV_ITEMS = [
  { id: "overview", label: "Vue d'ensemble", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>' },
  { id: "my-courses", label: "Mes cours", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 4C9 2 5 2 3 3v15c2-1 6-1 9 1 3-2 7-2 9-1V3c-2-1-6-1-9 1"/><path d="M12 4v16"/></svg>' },
  { id: "create-course", label: "Créer un cours", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 5v14"/><path d="M5 12h14"/></svg>' },
  { id: "students", label: "Étudiants", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/></svg>' },
  { id: "revenue", label: "Revenus", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M9.5 15c.5 1 1.5 1.5 2.7 1.5 1.6 0 2.8-.9 2.8-2.1 0-1.4-1.2-1.9-2.9-2.3-1.7-.4-2.9-.9-2.9-2.3 0-1.2 1.2-2.1 2.8-2.1 1.2 0 2.2.5 2.7 1.5"/><path d="M12 6.5v11"/></svg>' },
  { id: "reviews", label: "Avis reçus", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6 6.6.6-5 4.4 1.5 6.5L12 16.8 6 20l1.5-6.5-5-4.4 6.6-.6L12 2.5Z"/></svg>' },
  { id: "profile", label: "Mon profil public", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>' },
  { id: "payments", label: "Recevoir mes paiements", icon: '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>' },
];

let profile = null;
let exchangeRate = 131;
let currentTab = "overview";

// État du constructeur de cours (perdu si on quitte l'onglet, comme le
// prototype avec son state.courseBuilderStep / state.builderModules).
let builderStep = 1;
let builderInfo = {};
let builderModules = [];
let moduleEditorOpen = false;
let moduleDraft = { title: "", theory: "", videoUrl: "", quiz: [] };

async function init() {
  profile = await requireRole(["teacher", "admin"]);
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
        <div><b>${escapeHtml(profile.full_name)}</b><span>Formateur</span></div>
      </div>
      <nav class="dash-nav">
        ${NAV_ITEMS.map((n) => `<a href="#" data-tab="${n.id}" class="${n.id === currentTab ? "active" : ""}">${n.icon} ${n.label}</a>`).join("")}
        <a href="/tableau-de-bord.html"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> Passer en vue étudiant</a>
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
  if (tab === "my-courses") return renderMyCourses(main);
  if (tab === "create-course") return renderCreateCourse(main);
  if (tab === "students") return renderStudents(main);
  if (tab === "revenue") return renderRevenue(main);
  if (tab === "reviews") return renderReviews(main);
  if (tab === "profile") return renderProfile(main);
  if (tab === "payments") return renderPayoutTab(main);
}

// ===================== Données communes =====================

async function loadMyCourses() {
  // RLS (teacher_read_own_courses) garantit déjà qu'on ne peut lire QUE
  // ses propres cours, quel que soit leur statut.
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, category, price_usd, status, students_count, rating")
    .eq("instructor_id", profile.id)
    .order("created_at", { ascending: false });
  return error ? [] : data;
}

const STATUS_BADGE = { publie: { cls: "ok", label: "Publié" }, rejete: { cls: "blocked", label: "Rejeté" }, en_attente: { cls: "pending", label: "En attente" }, brouillon: { cls: "pending", label: "Brouillon" } };

// ===================== Vue d'ensemble =====================

async function renderOverview(main) {
  const courses = await loadMyCourses();
  const courseIds = courses.map((c) => c.id);
  const { studentCount } = await loadStudentCount(courseIds);
  const { month } = await loadRevenue(courseIds);
  const rated = courses.filter((c) => c.rating > 0);
  const avgRating = rated.length ? (rated.reduce((a, c) => a + Number(c.rating), 0) / rated.length).toFixed(1) : "—";

  main.innerHTML = `
    <div class="dash-welcome"><h2>Bienvenue, ${escapeHtml(profile.full_name.split(" ")[0])} <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg></h2><p>Voici un aperçu de vos formations et de vos étudiants.</p></div>
    <div class="dash-stats">
      <div class="dash-stat-card"><b>${courses.length}</b><span>Cours (tous statuts)</span></div>
      <div class="dash-stat-card"><b>${studentCount}</b><span>Étudiants inscrits</span></div>
      <div class="dash-stat-card"><b>${avgRating}</b><span>Note moyenne</span></div>
      <div class="dash-stat-card"><b>${fmtHTG(month, exchangeRate)}</b><span>Revenus ce mois</span></div>
    </div>
    <h3 style="font-size:17px;margin-bottom:14px;">Mes cours</h3>
    ${
      courses.length
        ? courses
            .map((c) => {
              const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.en_attente;
              return `
        <div class="enrolled-card">
          <div class="enrolled-thumb"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 4C9 2 5 2 3 3v15c2-1 6-1 9 1 3-2 7-2 9-1V3c-2-1-6-1-9 1"/><path d="M12 4v16"/></svg></div>
          <div class="enrolled-info"><h4>${escapeHtml(c.title)}</h4><span class="small-muted">${(c.students_count ?? 0).toLocaleString("fr-FR")} étudiants · <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6 6.6.6-5 4.4 1.5 6.5L12 16.8 6 20l1.5-6.5-5-4.4 6.6-.6L12 2.5Z"/></svg> ${c.rating || "—"} · <span class="status-pill ${badge.cls}" style="margin-left:4px;">${badge.label}</span></span></div>
        </div>`;
            })
            .join("")
        : `<p class="small-muted">Vous n'avez pas encore créé de cours.</p>`
    }
  `;
}

async function loadStudentCount(courseIds) {
  if (!courseIds.length) return { studentCount: 0 };
  const { count } = await supabase.from("enrollments").select("student_id", { count: "exact", head: true }).in("course_id", courseIds);
  return { studentCount: count || 0 };
}

async function loadRevenue(courseIds) {
  if (!courseIds.length) return { total: 0, month: 0 };
  const { data } = await supabase
    .from("payments")
    .select("amount, currency, created_at")
    .eq("item_type", "course")
    .in("item_id", courseIds)
    .eq("status", "paid");
  const now = new Date();
  let total = 0,
    month = 0;
  (data ?? []).forEach((p) => {
    // Les montants en HTG sont reconvertis en USD pour pouvoir les
    // additionner avec les montants en USD (fmtHTG() attend un prix USD).
    const usdAmount = p.currency === "htg" ? Number(p.amount) / exchangeRate : Number(p.amount);
    total += usdAmount;
    const d = new Date(p.created_at);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) month += usdAmount;
  });
  return { total, month };
}

// ===================== Mes cours =====================

async function renderMyCourses(main) {
  const courses = await loadMyCourses();

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Mes cours</h2>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Titre</th><th>Catégorie</th><th>Prix</th><th>Étudiants</th><th>Statut</th></tr></thead>
      <tbody>
        ${courses
          .map((c) => {
            const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.en_attente;
            return `<tr><td>${escapeHtml(c.title)}</td><td>${c.category === "certificat" ? "Certificat" : "Diplôme"}</td><td>${fmtHTG(Number(c.price_usd), exchangeRate)}</td><td>${c.students_count || 0}</td><td><span class="status-pill ${badge.cls}">${badge.label}</span></td></tr>`;
          })
          .join("")}
      </tbody>
    </table></div>
    ${!courses.length ? `<p class="small-muted">Vous n'avez pas encore créé de cours.</p>` : ""}
  `;
}

// ===================== Créer un cours =====================

function renderCreateCourse(main) {
  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:6px;">Créer un nouveau cours</h2>
    <div class="steps" style="justify-content:flex-start;margin-bottom:24px;">
      <div class="step-dot ${builderStep === 1 ? "active" : "done"}">${builderStep > 1 ? '<svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M20 6 9 17l-5-5"/></svg>' : "1"}</div>
      <div class="step-line"></div>
      <div class="step-dot ${builderStep === 2 ? "active" : ""}">2</div>
      <span class="small-muted" style="margin-left:14px;">${builderStep === 1 ? "Étape 1 — Informations générales" : "Étape 2 — Modules, théorie, vidéo et quiz"}</span>
    </div>
    <div id="builderStepContent"></div>
  `;
  renderBuilderStep(main);
}

function renderBuilderStep(main) {
  const container = main.querySelector("#builderStepContent");
  if (builderStep === 1) {
    container.innerHTML = `
      <div style="max-width:560px;">
        <div class="field"><label>Titre du cours</label><input type="text" id="newCourseTitle" value="${escapeHtml(builderInfo.title || "")}" placeholder="Ex: Introduction au Cloud Computing"></div>
        <div class="field"><label>Catégorie</label><select id="newCourseCat"><option value="certificat" ${builderInfo.category === "certificat" ? "selected" : ""}>Programme Certificat</option><option value="diplome" ${builderInfo.category === "diplome" ? "selected" : ""}>Programme Diplôme</option></select></div>
        <div class="field"><label>Niveau</label><select id="newCourseLevel"><option>Débutant</option><option>Intermédiaire</option><option>Avancé</option><option>Tous niveaux</option></select></div>
        <div class="field"><label>Durée</label><input type="text" id="newCourseDuration" value="${builderInfo.duration || ""}" placeholder="Ex: 6 semaines"></div>
        <div class="field"><label>Prix (USD, 0 pour gratuit)</label><input type="number" id="newCoursePrice" value="${builderInfo.price ?? ""}" placeholder="0"></div>
        <div class="field"><label>Description</label><textarea id="newCourseDesc" rows="3" placeholder="Décrivez votre cours...">${escapeHtml(builderInfo.description || "")}</textarea></div>
        ${imageUploadFieldHTML("courseImg", "Image de couverture du cours", builderInfo.coverImageUrl)}
        <button class="btn btn-primary" id="toModuleStepBtn">Continuer vers les modules &rarr;</button>
      </div>
    `;
    wireImageUpload(container, "courseImg", "course-covers", profile.id, (url) => (builderInfo.coverImageUrl = url));
    container.querySelector("#toModuleStepBtn").addEventListener("click", () => {
      const title = container.querySelector("#newCourseTitle").value.trim();
      if (!title) return alert("Merci de renseigner un titre de cours.");
      builderInfo = {
        ...builderInfo,
        title,
        category: container.querySelector("#newCourseCat").value,
        level: container.querySelector("#newCourseLevel").value,
        duration: container.querySelector("#newCourseDuration").value.trim(),
        price: container.querySelector("#newCoursePrice").value,
        description: container.querySelector("#newCourseDesc").value.trim(),
      };
      builderStep = 2;
      renderCreateCourse(main);
    });
  } else {
    container.innerHTML = `
      <div style="max-width:640px;">
        <h4 style="font-size:15px;margin-bottom:10px;">Modules ajoutés (${builderModules.length})</h4>
        ${builderModules.length === 0 ? `<p class="small-muted" style="margin-bottom:16px;">Aucun module pour l'instant. Ajoutez votre premier module ci-dessous.</p>` : ""}
        ${builderModules
          .map(
            (m, idx) => `
          <div class="builder-module-card">
            <div><b style="font-size:13.5px;">Module ${idx + 1} — ${escapeHtml(m.title)}</b><div class="small-muted">${m.theory ? "Texte ✓" : "Sans texte"} · ${m.videoUrl ? "Vidéo ✓" : "Sans vidéo"} · ${m.quiz.length} question(s)</div></div>
            <button class="icon-btn danger" data-remove-module="${idx}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg></button>
          </div>`
          )
          .join("")}

        ${!moduleEditorOpen ? `<button class="btn btn-outline btn-sm" id="openModuleEditorBtn" style="margin:10px 0 24px;">+ Ajouter un module</button>` : renderModuleEditorHTML()}

        <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-outline" id="backToStep1Btn">&larr; Retour</button>
          <button class="btn btn-gold" id="publishCourseBtn">Envoyer pour approbation</button>
        </div>
      </div>
    `;
    wireStep2Handlers(main, container);
  }
}

function renderModuleEditorHTML() {
  return `
  <div class="module" style="padding:20px;margin:14px 0 24px;border-color:var(--gold);">
    <h4 style="margin:0 0 14px;font-size:14.5px;">Nouveau module</h4>
    <div class="field"><label>Titre du module</label><input type="text" id="modTitle" value="${escapeHtml(moduleDraft.title || "")}" placeholder="Ex: Les bases du HTML"></div>
    <div class="field"><label>Contenu théorique (texte obligatoire avant la vidéo)</label><textarea id="modTheory" rows="4" placeholder="Rédigez le contenu que l'étudiant doit lire...">${moduleDraft.theory || ""}</textarea></div>
    <div class="field"><label>URL de la vidéo (YouTube, Vimeo...)</label><input type="text" id="modVideo" value="${moduleDraft.videoUrl || ""}" placeholder="https://..."></div>
    <h5 style="font-size:13.5px;margin:18px 0 10px;">Quiz du module</h5>
    <div id="quizQuestionsList">
      ${moduleDraft.quiz
        .map(
          (q, qi) => `
        <div class="quiz-q-card">
          <div class="field" style="margin-bottom:10px;"><label>Question ${qi + 1}</label><input type="text" id="qz_${qi}_q" value="${q.q || ""}" placeholder="Intitulé de la question"></div>
          ${[0, 1, 2, 3]
            .map(
              (oi) => `
          <div class="opt-row">
            <input type="radio" name="qz_${qi}_correct" value="${oi}" ${q.correct === oi ? "checked" : ""}>
            <input type="text" id="qz_${qi}_opt${oi}" value="${(q.options && q.options[oi]) || ""}" placeholder="Option ${String.fromCharCode(65 + oi)}">
          </div>`
            )
            .join("")}
          <button class="icon-btn danger" data-remove-question="${qi}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg> Retirer cette question</button>
        </div>`
        )
        .join("")}
    </div>
    <button class="btn btn-outline btn-sm" id="addQuizQuestionBtn">+ Ajouter une question</button>
    <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
      <button class="btn btn-outline btn-sm" id="cancelModuleBtn">Annuler</button>
      <button class="btn btn-gold btn-sm" id="saveModuleBtn">Enregistrer ce module</button>
    </div>
  </div>`;
}

function syncModuleDraftFromDOM(container) {
  const titleEl = container.querySelector("#modTitle");
  if (!titleEl) return;
  moduleDraft.title = titleEl.value;
  moduleDraft.theory = container.querySelector("#modTheory").value;
  moduleDraft.videoUrl = container.querySelector("#modVideo").value;
  moduleDraft.quiz.forEach((q, qi) => {
    const qEl = container.querySelector(`#qz_${qi}_q`);
    if (!qEl) return;
    q.q = qEl.value;
    q.options = [0, 1, 2, 3].map((oi) => container.querySelector(`#qz_${qi}_opt${oi}`).value);
    const checked = container.querySelector(`input[name="qz_${qi}_correct"]:checked`);
    q.correct = checked ? parseInt(checked.value) : 0;
  });
}

function wireStep2Handlers(main, container) {
  container.querySelectorAll("[data-remove-module]").forEach((btn) =>
    btn.addEventListener("click", () => {
      builderModules.splice(Number(btn.getAttribute("data-remove-module")), 1);
      renderBuilderStep(main);
    })
  );

  container.querySelector("#openModuleEditorBtn")?.addEventListener("click", () => {
    moduleDraft = { title: "", theory: "", videoUrl: "", quiz: [] };
    moduleEditorOpen = true;
    renderBuilderStep(main);
  });
  container.querySelector("#cancelModuleBtn")?.addEventListener("click", () => {
    moduleEditorOpen = false;
    renderBuilderStep(main);
  });
  container.querySelector("#addQuizQuestionBtn")?.addEventListener("click", () => {
    syncModuleDraftFromDOM(container);
    moduleDraft.quiz.push({ q: "", options: ["", "", "", ""], correct: 0 });
    renderBuilderStep(main);
  });
  container.querySelectorAll("[data-remove-question]").forEach((btn) =>
    btn.addEventListener("click", () => {
      syncModuleDraftFromDOM(container);
      moduleDraft.quiz.splice(Number(btn.getAttribute("data-remove-question")), 1);
      renderBuilderStep(main);
    })
  );
  container.querySelector("#saveModuleBtn")?.addEventListener("click", () => {
    syncModuleDraftFromDOM(container);
    if (!moduleDraft.title) return alert("Merci de renseigner un titre de module.");
    builderModules.push(JSON.parse(JSON.stringify(moduleDraft)));
    moduleEditorOpen = false;
    renderBuilderStep(main);
  });

  container.querySelector("#backToStep1Btn").addEventListener("click", () => {
    builderStep = 1;
    renderCreateCourse(main);
  });
  container.querySelector("#publishCourseBtn").addEventListener("click", () => createTeacherCourse(main));
}

async function createTeacherCourse(main) {
  if (!builderInfo.title) return alert("Merci de compléter les informations du cours (étape 1).");
  if (builderModules.length === 0 && !confirm("Aucun module ajouté. Envoyer quand même le cours pour approbation ?")) return;

  const price = parseInt(builderInfo.price) || 0;

  // status volontairement forcé à "en_attente" ici — et depuis la
  // migration 0005, RLS refuserait de toute façon une autre valeur.
  const { data: courseRow, error: courseErr } = await supabase
    .from("courses")
    .insert({
      title: builderInfo.title,
      category: builderInfo.category,
      level: builderInfo.level,
      duration_text: builderInfo.duration || "4 semaines",
      weeks: 4,
      lang: "Français",
      price_usd: price,
      description: builderInfo.description || "Description à venir.",
      cover_image_url: builderInfo.coverImageUrl || null,
      instructor_id: profile.id,
      status: "en_attente",
    })
    .select()
    .single();

  if (courseErr) {
    alert("Erreur lors de la création du cours : " + courseErr.message);
    return;
  }

  for (let i = 0; i < builderModules.length; i++) {
    const m = builderModules[i];
    const { data: modRow, error: modErr } = await supabase
      .from("modules")
      .insert({ course_id: courseRow.id, position: i + 1, title: m.title || `Module ${i + 1}`, theory: m.theory || null, video_url: m.videoUrl || null })
      .select()
      .single();
    if (modErr) {
      console.error(modErr);
      continue;
    }
    if (m.quiz.length) {
      await supabase.from("quiz_questions").insert(
        m.quiz.map((q, qi) => ({ module_id: modRow.id, position: qi + 1, question: q.q || `Question ${qi + 1}`, options: q.options, correct_index: q.correct }))
      );
    }
  }

  alert(`Cours envoyé pour approbation ! Un administrateur va vérifier son contenu avant qu'il soit visible publiquement (${builderModules.length} module(s)).`);
  builderStep = 1;
  builderInfo = {};
  builderModules = [];
  currentTab = "my-courses";
  document.querySelectorAll("[data-tab]").forEach((l) => l.classList.toggle("active", l.getAttribute("data-tab") === "my-courses"));
  renderMyCourses(main);
}

// ===================== Étudiants =====================

async function renderStudents(main) {
  const courses = await loadMyCourses();
  const courseIds = courses.map((c) => c.id);

  let rows = [];
  if (courseIds.length) {
    const { data } = await supabase
      .from("enrollments")
      .select("progress, enrolled_at, student:profiles(full_name), course:courses(title)")
      .in("course_id", courseIds)
      .order("enrolled_at", { ascending: false });
    rows = data ?? [];
  }

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Étudiants</h2>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Nom</th><th>Cours</th><th>Progression</th><th>Inscrit le</th></tr></thead>
      <tbody>
        ${
          rows.length
            ? rows.map((r) => `<tr><td>${escapeHtml(r.student?.full_name ?? "Étudiant")}</td><td>${escapeHtml(r.course?.title ?? "")}</td><td>${r.progress ?? 0}%</td><td>${new Date(r.enrolled_at).toLocaleDateString("fr-FR")}</td></tr>`).join("")
            : `<tr><td colspan="4" class="small-muted">Aucun étudiant inscrit pour le moment.</td></tr>`
        }
      </tbody>
    </table></div>
  `;
}

// ===================== Revenus =====================

async function renderRevenue(main) {
  const courses = await loadMyCourses();
  const courseIds = courses.map((c) => c.id);
  const { total, month } = await loadRevenue(courseIds);

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Revenus</h2>
    <div class="dash-stats">
      <div class="dash-stat-card"><b>${fmtHTG(total, exchangeRate)}</b><span>Revenus totaux</span></div>
      <div class="dash-stat-card"><b>${fmtHTG(month, exchangeRate)}</b><span>Ce mois-ci</span></div>
      <div class="dash-stat-card"><b>${fmtHTG(total, exchangeRate)}</b><span>Disponible au retrait</span></div>
    </div>
    <button class="btn btn-primary btn-sm" id="requestWithdrawalBtn">Demander un retrait</button>
  `;
  main.querySelector("#requestWithdrawalBtn").addEventListener("click", () => {
    alert("Fonctionnalité de retrait à venir — contactez l'administrateur pour le moment.");
  });
}

// ===================== Avis reçus =====================

async function renderReviews(main) {
  const courses = await loadMyCourses();
  const courseIds = courses.map((c) => c.id);

  let reviews = [];
  if (courseIds.length) {
    const { data } = await supabase
      .from("reviews")
      .select("rating, comment, created_at, student:profiles(full_name)")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false });
    reviews = data ?? [];
  }

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Avis reçus</h2>
    ${
      reviews.length
        ? reviews
            .map(
              (r, idx) => `
      <div class="review-item">
        <div class="avatar" style="width:42px;height:42px;font-size:13px;">${initials(r.student?.full_name ?? "?")}</div>
        <div class="review-body"><div class="review-head"><b>${escapeHtml(r.student?.full_name ?? "Étudiant")}</b><span class="review-date">${new Date(r.created_at).toLocaleDateString("fr-FR")}</span></div><div class="stars">${renderStarsHTML(r.rating)}</div><p>${escapeHtml(r.comment ?? "")}</p></div>
      </div>`
            )
            .join("")
        : `<p class="small-muted">Aucun avis reçu pour le moment.</p>`
    }
  `;
}

// ===================== Profil public =====================

async function renderProfile(main) {
  const { data: fullProfile } = await supabase.from("profiles").select("full_name, bio, avatar_url").eq("id", profile.id).single();
  let pendingAvatarUrl = fullProfile.avatar_url || "";

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:20px;">Mon profil public</h2>
    <div style="max-width:480px;">
      ${avatarUploadFieldHTML("teacherProfileAvatar", fullProfile.avatar_url)}
      <div class="field"><label>Nom complet</label><input type="text" id="teacherProfileName" value="${escapeHtml(fullProfile.full_name ?? "")}"></div>
      <div class="field"><label>Bio</label><textarea id="teacherProfileBio" rows="4" placeholder="Présentez-vous aux étudiants...">${escapeHtml(fullProfile.bio ?? "")}</textarea></div>
      <button class="btn btn-primary" id="teacherProfileSave">Enregistrer</button>
      <p id="teacherProfileMessage" class="small-muted hidden" style="margin-top:10px;"></p>
    </div>
  `;

  wireAvatarUpload(main, "teacherProfileAvatar", profile.id, (url) => (pendingAvatarUrl = url));

  main.querySelector("#teacherProfileSave").addEventListener("click", async () => {
    const full_name = main.querySelector("#teacherProfileName").value.trim();
    const bio = main.querySelector("#teacherProfileBio").value.trim();
    const messageBox = main.querySelector("#teacherProfileMessage");
    if (!full_name) {
      messageBox.textContent = "Le nom ne peut pas être vide.";
      messageBox.classList.remove("hidden");
      return;
    }
    const { error } = await supabase.from("profiles").update({ full_name, bio, avatar_url: pendingAvatarUrl }).eq("id", profile.id);
    messageBox.textContent = error ? "Erreur : " + error.message : "Profil mis à jour !";
    messageBox.classList.remove("hidden");
    if (!error) {
      profile.full_name = full_name;
      document.querySelector(".dash-user b").textContent = full_name;
    }
  });
}

// ===================== Recevoir mes paiements =====================

async function renderPayoutTab(main) {
  const { data: fullProfile } = await supabase.from("profiles").select("payout_info").eq("id", profile.id).single();
  const info = fullProfile?.payout_info || {};

  main.innerHTML = `
    <h2 style="font-size:20px;margin-bottom:6px;">Recevoir mes paiements</h2>
    <p class="small-muted" style="margin-bottom:20px;">Les paiements sont versés une fois par mois, entre le <b>25 et le 5</b> du mois suivant.</p>
    <div style="max-width:480px;">
      <div class="field"><label>Méthode de réception</label><select id="payoutMethod">
        <option value="moncash" ${info.method === "moncash" ? "selected" : ""}>MonCash</option>
        <option value="natcash" ${info.method === "natcash" ? "selected" : ""}>NatCash</option>
        <option value="banque" ${info.method === "banque" ? "selected" : ""}>Virement bancaire</option>
      </select></div>
      <div class="field"><label>Numéro / Compte de réception</label><input type="text" id="payoutAccount" value="${info.account || ""}" placeholder="Ex: +509 00 00 0000 ou numéro de compte"></div>
      <div class="field"><label>Nom complet du titulaire</label><input type="text" id="payoutName" value="${info.holderName || ""}" placeholder="Nom tel qu'enregistré chez le fournisseur"></div>
      <button class="btn btn-primary" id="payoutSaveBtn">Enregistrer</button>
      <p id="payoutMessage" class="small-muted hidden" style="margin-top:10px;"></p>
    </div>
  `;

  main.querySelector("#payoutSaveBtn").addEventListener("click", async () => {
    const account = main.querySelector("#payoutAccount").value.trim();
    const holderName = main.querySelector("#payoutName").value.trim();
    const messageBox = main.querySelector("#payoutMessage");
    if (!account || !holderName) {
      messageBox.textContent = "Merci de remplir tous les champs.";
      messageBox.classList.remove("hidden");
      return;
    }
    const payout_info = { method: main.querySelector("#payoutMethod").value, account, holderName };
    const { error } = await supabase.from("profiles").update({ payout_info }).eq("id", profile.id);
    messageBox.textContent = error ? "Erreur : " + error.message : "Coordonnées enregistrées !";
    messageBox.classList.remove("hidden");
  });
}

init();
