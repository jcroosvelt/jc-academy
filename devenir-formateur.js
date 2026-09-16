// assets/js/app/pages/devenir-formateur.js
//
// Reprend renderBecomeTeacher() du prototype à l'identique visuellement.
// Différence assumée : le prototype acceptait une candidature de
// visiteur non connecté (profile_id: null) — mais alors l'approbation
// (approve-teacher-application) ne peut attribuer le rôle "teacher" à
// personne, et la policy RLS "user_insert_own_application" (0006)
// exige de toute façon auth.uid() = profile_id. On demande donc de se
// connecter d'abord, ce qui rend le workflow d'approbation cohérent de
// bout en bout plutôt que de créer des candidatures orphelines.

import { supabase } from "./supabase-client.js";
import { wireNav } from "./nav.js";

export async function render(root) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const formSection = !session
    ? `
    <div class="auth-card" style="margin:0;">
      <h3 style="margin-top:0;">Postuler comme formateur</h3>
      <p class="sub" style="text-align:left;margin-bottom:20px;">Connectez-vous d'abord pour envoyer votre candidature — nous devons pouvoir vous attribuer le rôle formateur une fois approuvée.</p>
      <a href="/connexion?redirect=/devenir-formateur" data-spa-link class="btn btn-primary btn-block" style="display:block;margin-bottom:10px;">Se connecter</a>
      <a href="/inscription" data-spa-link class="btn btn-outline btn-block" style="display:block;">Créer un compte</a>
    </div>`
    : `
    <div class="auth-card" style="margin:0;">
      <h3 style="margin-top:0;">Postuler comme formateur</h3>
      <p class="sub" style="text-align:left;margin-bottom:20px;">Remplissez ce formulaire, notre équipe vous recontactera sous 48h.</p>
      <div class="field"><label>Nom complet</label><input type="text" id="taName" placeholder="Votre nom complet"></div>
      <div class="field"><label>E-mail</label><input type="email" id="taEmail" value="${session.user.email}" disabled style="opacity:.6;"></div>
      <div class="field"><label>Téléphone</label><input type="tel" id="taPhone" placeholder="+509 00 00 0000"></div>
      <div class="field"><label>Domaine d'expertise</label><select id="taDomain">
        <option>Développement Web</option><option>Data Science & IA</option><option>Marketing Digital</option><option>Gestion de Projet</option><option>Cybersécurité</option><option>Autre</option>
      </select></div>
      <div class="field"><label>Présentez votre expérience</label><textarea id="taExperience" rows="4" placeholder="Décrivez votre parcours et votre expertise..."></textarea></div>
      <div class="field"><label>CV / Portfolio (lien)</label><input type="text" id="taPortfolio" placeholder="https://..."></div>
      <div id="taError" class="hidden" style="color:#D64545;font-size:13px;margin-bottom:14px;"></div>
      <button class="btn btn-primary btn-block" id="taSubmitBtn">Envoyer ma candidature</button>
    </div>`;

  root.innerHTML = `
  <section class="page-header">
    <div class="container">
      <div class="eyebrow" style="background:rgba(255,255,255,.12);color:#fff;">Rejoignez notre équipe</div>
      <h1>Devenez formateur sur JC Academy</h1>
      <p>Partagez votre expertise avec des milliers d'apprenants et développez votre impact.</p>
    </div>
  </section>

  <div class="container" style="padding:44px 24px 70px;">
    <div class="split-hero">
      <div>
        <h2 style="font-size:26px;">Pourquoi enseigner avec nous ?</h2>
        <div class="step-list">
          <div class="step-item"><div class="num">1</div><div><h4>Un large public</h4><p>Touchez des dizaines de milliers d'apprenants motivés à travers toute la région.</p></div></div>
          <div class="step-item"><div class="num">2</div><div><h4>Des outils simples</h4><p>Notre plateforme facilite la création de modules, quiz et supports vidéo.</p></div></div>
          <div class="step-item"><div class="num">3</div><div><h4>Une rémunération valorisante</h4><p>Percevez des revenus sur vos formations payantes, en toute transparence.</p></div></div>
          <div class="step-item"><div class="num">4</div><div><h4>Un accompagnement dédié</h4><p>Notre équipe pédagogique vous aide à structurer et lancer votre cours.</p></div></div>
        </div>
      </div>
      ${formSection}
    </div>
  </div>`;

  root.querySelector("#taSubmitBtn")?.addEventListener("click", async () => {
    const full_name = root.querySelector("#taName").value.trim();
    const phone = root.querySelector("#taPhone").value.trim();
    const domain = root.querySelector("#taDomain").value;
    const experience = root.querySelector("#taExperience").value.trim();
    const portfolio_url = root.querySelector("#taPortfolio").value.trim();
    const errEl = root.querySelector("#taError");
    errEl.classList.add("hidden");

    if (!full_name) {
      errEl.textContent = "Merci de renseigner votre nom complet.";
      errEl.classList.remove("hidden");
      return;
    }

    const btn = root.querySelector("#taSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Envoi en cours…";

    const { error } = await supabase.from("teacher_applications").insert({
      profile_id: session.user.id,
      full_name,
      email: session.user.email,
      phone,
      domain,
      experience,
      portfolio_url,
    });

    btn.disabled = false;
    btn.textContent = "Envoyer ma candidature";

    if (error) {
      errEl.textContent = "Erreur lors de l'envoi : " + error.message;
      errEl.classList.remove("hidden");
      return;
    }

    root.querySelector(".auth-card").innerHTML = `
      <h3 style="margin-top:0;">Candidature envoyée !</h3>
      <p class="sub" style="text-align:left;">Notre équipe l'examinera et vous recontactera sous 48h.</p>
      <a href="/" data-spa-link class="btn btn-primary btn-block" style="display:block;margin-top:14px;">Retour à l'accueil</a>`;
    wireNav(root);
  });

  wireNav(root);
}
