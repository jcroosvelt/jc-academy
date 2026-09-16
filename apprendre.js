// assets/js/apprendre/apprendre.js
//
// La visionneuse de leçons (§9 du cahier des charges) : lecture
// théorique obligatoire -> vidéo -> quiz, module suivant débloqué
// seulement après réussite du quiz du précédent. Reprend l'accordéon du
// prototype (renderCourseDetail, onglet "programme") à l'identique
// visuellement.
//
// CORRECTION D'AUDIT CRITIQUE : le prototype envoyait les quiz (bonnes
// réponses incluses) et calculait le score entièrement côté navigateur.
// Ici, les questions viennent de l'Edge Function get-module-quiz (sans
// les réponses) et la correction vient de submit-quiz (seule à
// connaître les bonnes réponses et à pouvoir valider un module) — voir
// ces deux fichiers pour le détail. La lecture/vidéo restent de simples
// upserts directs (non sensibles, verrouillés par RLS + GRANT par
// colonne — voir 0008_lms_progress.sql), le quiz jamais.

import { supabase } from "./supabase-client.js";
import { escapeHtml } from "./format.js";

const params = new URLSearchParams(window.location.search);
const courseSlug = params.get("cours");

let course = null;
let modules = [];
let progressByModule = {};
let studentId = null;

// État de la vue quiz en cours (si l'utilisateur a cliqué "Commencer le quiz")
let activeQuiz = null; // { moduleId, moduleTitle, questions, index, answers }

async function init() {
  const root = document.getElementById("page-root");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace("/connexion?redirect=" + encodeURIComponent(window.location.pathname + window.location.search));
    return;
  }
  studentId = session.user.id;

  if (!courseSlug) {
    root.innerHTML = `<p>Cours introuvable.</p>`;
    return;
  }

  const { data: courseRow, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, title, category")
    .eq("slug", courseSlug)
    .single();

  if (courseError || !courseRow) {
    root.innerHTML = `<p>Ce cours n'existe pas.</p>`;
    return;
  }
  course = courseRow;

  const { data: enrollment } = await supabase.from("enrollments").select("student_id").eq("student_id", studentId).eq("course_id", course.id).maybeSingle();
  if (!enrollment) {
    root.innerHTML = `
      <div class="container" style="padding:70px 24px;text-align:center;">
        <h1 style="font-size:22px;">Vous n'êtes pas encore inscrit à ce cours</h1>
        <p class="small-muted">Inscrivez-vous pour accéder aux leçons.</p>
        <a href="/cours/${course.slug}" class="btn btn-primary" style="margin-top:20px;display:inline-block;">Voir la page du cours</a>
      </div>`;
    return;
  }

  await loadModulesAndProgress();
  renderAccordion(root);
}

async function loadModulesAndProgress() {
  const [{ data: moduleRows }, { data: progressRows }] = await Promise.all([
    supabase.from("modules").select("id, position, title, theory, video_url").eq("course_id", course.id).order("position"),
    supabase.from("module_progress").select("module_id, theory_read, video_watched, quiz_passed, quiz_score").eq("student_id", studentId).eq("course_id", course.id),
  ]);
  modules = moduleRows ?? [];
  progressByModule = {};
  (progressRows ?? []).forEach((row) => (progressByModule[row.module_id] = row));
}

function computeModuleStates() {
  return modules.map((m, idx) => {
    const prog = progressByModule[m.id] || {};
    const prevProg = idx > 0 ? progressByModule[modules[idx - 1].id] : null;
    const unlocked = idx === 0 || !!prevProg?.quiz_passed;
    return {
      ...m,
      number: idx + 1,
      unlocked,
      read: !!prog.theory_read,
      videoUnlocked: !!prog.theory_read,
      quizUnlocked: !!prog.video_watched,
      quizDone: !!prog.quiz_passed,
      quizScore: prog.quiz_score,
    };
  });
}

function renderAccordion(root) {
  const states = computeModuleStates();
  const allDone = states.length > 0 && states.every((m) => m.quizDone);

  root.innerHTML = `
    <div class="container" style="padding:44px 24px 70px;">
      <a href="/tableau-de-bord.html" style="font-size:13px;color:var(--text-muted);">&larr; Retour à mon tableau de bord</a>
      <h1 style="margin:14px 0 6px;">${escapeHtml(course.title)}</h1>
      <p class="small-muted" style="margin-bottom:24px;">Chaque module contient une partie théorique à lire, obligatoire avant de débloquer la vidéo correspondante, suivie d'un quiz de validation.</p>

      <div style="max-width:760px;">
        ${states
          .map(
            (m) => `
        <div class="module">
          <div class="module-head" data-toggle-module="${m.id}">
            <div class="module-head-left">
              <div class="module-num">${m.number}</div>
              <div>
                <h4>Module ${m.number} — ${escapeHtml(m.title)}</h4>
                <div class="status">${
                  !m.unlocked
                    ? "🔒 Module verrouillé"
                    : m.quizDone
                    ? "✓ Terminé"
                    : m.read
                    ? "▶ Vidéo disponible"
                    : "Lecture requise"
                }</div>
              </div>
            </div>
            <span data-chevron="${m.id}">▾</span>
          </div>
          <div class="module-body" data-body="${m.id}">
            ${
              !m.unlocked
                ? `<p class="locked-text" style="padding:6px 0;">🔒 Ce module se débloque après la réussite du quiz du module précédent.</p>`
                : `
              <div class="module-step">
                <div class="step-icon ${m.read ? "done" : ""}">${m.read ? "✓" : "📖"}</div>
                <div class="step-content">
                  <h5>Partie théorique (lecture obligatoire)</h5>
                  ${m.theory ? `<p style="white-space:pre-wrap;">${escapeHtml(m.theory)}</p>` : `<p>Support de cours détaillé à lire intégralement avant de continuer.</p>`}
                  ${!m.read ? `<button class="btn btn-outline btn-sm" data-mark-read="${m.id}">J'ai terminé la lecture</button>` : `<span class="small-muted">✓ Lecture terminée</span>`}
                </div>
              </div>
              <div class="module-step">
                <div class="step-icon ${m.videoUnlocked ? "done" : "locked"}">${m.videoUnlocked ? "▶" : "🔒"}</div>
                <div class="step-content">
                  <h5>Vidéo du module</h5>
                  ${
                    m.videoUnlocked
                      ? `<p>Vidéo débloquée.</p><button class="btn btn-primary btn-sm" data-watch-video="${m.id}" data-video-url="${m.video_url ?? ""}">${m.quizUnlocked ? "Revoir la vidéo" : "Regarder la vidéo"}</button>`
                      : `<p class="locked-text">Se débloque après la lecture de la partie théorique.</p>`
                  }
                </div>
              </div>
              <div class="module-step">
                <div class="step-icon ${m.quizDone ? "done" : m.quizUnlocked ? "" : "locked"}">${m.quizDone ? "✓" : "❓"}</div>
                <div class="step-content">
                  <h5>Quiz de fin de module</h5>
                  ${
                    m.quizDone
                      ? `<p class="small-muted">Quiz réussi — score obtenu : ${m.quizScore != null ? m.quizScore + "%" : "—"}</p>`
                      : m.quizUnlocked
                      ? `<button class="btn btn-primary btn-sm" data-start-quiz="${m.id}" data-module-title="${m.title.replace(/"/g, "&quot;")}">Commencer le quiz</button>`
                      : `<p class="locked-text">Disponible après le visionnage de la vidéo.</p>`
                  }
                </div>
              </div>
              `
            }
          </div>
        </div>`
          )
          .join("")}

        <div class="module" style="border-color:var(--gold);">
          <div class="module-head" style="background:#FFF8EA;">
            <div class="module-head-left">
              <div class="module-num" style="background:var(--gold);color:var(--navy-dark);">🎓</div>
              <div>
                <h4>Examen final / Projet à soumettre</h4>
                <div class="status">${allDone ? "Disponible — contactez votre formateur pour la suite" : "🔒 Se débloque après validation de tous les modules"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-toggle-module]").forEach((head) => {
    head.addEventListener("click", () => {
      const id = head.getAttribute("data-toggle-module");
      root.querySelector(`[data-body="${id}"]`)?.classList.toggle("open");
    });
  });

  root.querySelectorAll("[data-mark-read]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await supabase.from("module_progress").upsert(
        { student_id: studentId, course_id: course.id, module_id: btn.getAttribute("data-mark-read"), theory_read: true },
        { onConflict: "student_id,module_id" }
      );
      await loadModulesAndProgress();
      renderAccordion(root);
    })
  );

  root.querySelectorAll("[data-watch-video]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const videoUrl = btn.getAttribute("data-video-url");
      if (videoUrl) window.open(videoUrl, "_blank");
      await supabase.from("module_progress").upsert(
        { student_id: studentId, course_id: course.id, module_id: btn.getAttribute("data-watch-video"), video_watched: true },
        { onConflict: "student_id,module_id" }
      );
      await loadModulesAndProgress();
      renderAccordion(root);
    })
  );

  root.querySelectorAll("[data-start-quiz]").forEach((btn) =>
    btn.addEventListener("click", () => startQuiz(root, btn.getAttribute("data-start-quiz"), btn.getAttribute("data-module-title")))
  );
}

// ===================== Quiz =====================

async function callFunction(name, body) {
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

async function startQuiz(root, moduleId, moduleTitle) {
  try {
    const { questions } = await callFunction("get-module-quiz", { moduleId });
    if (!questions.length) {
      alert("Ce module n'a pas encore de quiz.");
      return;
    }
    activeQuiz = { moduleId, moduleTitle, questions, index: 0, answers: {} };
    renderQuiz(root);
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

function renderQuiz(root) {
  const { questions, index, moduleTitle, answers } = activeQuiz;
  const q = questions[index];
  const total = questions.length;

  root.innerHTML = `
    <div class="container" style="padding:44px 24px 70px;">
      <div class="quiz-shell">
        <a href="#" id="quitQuizLink" style="font-size:13px;color:var(--text-muted);">&larr; Quitter le quiz</a>
        <h2 style="margin:14px 0 6px;">Quiz — ${escapeHtml(moduleTitle)}</h2>
        <p class="small-muted" style="margin:0 0 20px;">Question ${index + 1} sur ${total}</p>
        <div class="quiz-progress">${questions.map((_, i) => `<div class="${i <= index ? "done" : ""}"></div>`).join("")}</div>
        <p class="quiz-question">${escapeHtml(q.question)}</p>
        ${q.options
          .map(
            (opt, i) => `
          <div class="quiz-option ${answers[q.id] === i ? "selected" : ""}" data-select-option="${i}">
            <span class="quiz-letter">${String.fromCharCode(65 + i)}</span> ${escapeHtml(opt)}
          </div>`
          )
          .join("")}
        <div style="display:flex;justify-content:space-between;margin-top:24px;">
          <button class="btn btn-outline" id="quizPrevBtn" ${index === 0 ? "disabled" : ""}>Précédent</button>
          ${
            index < total - 1
              ? `<button class="btn btn-primary" id="quizNextBtn" ${answers[q.id] === undefined ? "disabled" : ""}>Suivant</button>`
              : `<button class="btn btn-gold" id="quizSubmitBtn" ${answers[q.id] === undefined ? "disabled" : ""}>Terminer le quiz</button>`
          }
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-select-option]").forEach((el) =>
    el.addEventListener("click", () => {
      activeQuiz.answers[q.id] = Number(el.getAttribute("data-select-option"));
      renderQuiz(root);
    })
  );
  root.querySelector("#quitQuizLink").addEventListener("click", (e) => {
    e.preventDefault();
    activeQuiz = null;
    renderAccordion(root);
  });
  root.querySelector("#quizPrevBtn").addEventListener("click", () => {
    activeQuiz.index--;
    renderQuiz(root);
  });
  root.querySelector("#quizNextBtn")?.addEventListener("click", () => {
    activeQuiz.index++;
    renderQuiz(root);
  });
  root.querySelector("#quizSubmitBtn")?.addEventListener("click", () => finishQuiz(root));
}

async function finishQuiz(root) {
  try {
    const result = await callFunction("submit-quiz", { moduleId: activeQuiz.moduleId, answers: activeQuiz.answers });
    renderQuizResult(root, result);
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

function renderQuizResult(root, result) {
  root.innerHTML = `
    <div class="container" style="padding:60px 24px;">
      <div class="quiz-shell">
        <div class="quiz-result">
          <div class="score-circle"><b>${result.score}%</b><span class="small-muted">Score</span></div>
          <h2>${result.passed ? "Quiz réussi !" : "Quiz non validé"}</h2>
          <p class="small-muted">${result.correctCount} bonnes réponses sur ${result.totalQuestions}. ${result.passed ? "Le module suivant est maintenant débloqué." : "Revisionnez la vidéo puis retentez le quiz."}</p>
          <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;">
            <button class="btn btn-outline" id="backToCourseBtn">Retour au cours</button>
            ${!result.passed ? `<button class="btn btn-primary" id="retryQuizBtn">Recommencer</button>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#backToCourseBtn").addEventListener("click", async () => {
    activeQuiz = null;
    await loadModulesAndProgress();
    renderAccordion(root);
  });
  root.querySelector("#retryQuizBtn")?.addEventListener("click", () => {
    const { moduleId, moduleTitle } = activeQuiz;
    startQuiz(root, moduleId, moduleTitle);
  });
}

init();
