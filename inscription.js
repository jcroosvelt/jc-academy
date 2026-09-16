// assets/js/app/pages/inscription.js
// Version simplifiée (une seule étape : nom, e-mail, mot de passe) de
// renderRegister() du prototype, qui avait 3 étapes (téléphone/ville
// puis avatar/bio en plus) — ces compléments de profil restent
// modifiables depuis "Mon profil" une fois connecté, pas indispensables
// à la création du compte elle-même. Vraie confirmation d'e-mail
// Supabase, aucun code inventé côté client (cf. audit initial).

import { supabase } from "./supabase-client.js";
import { friendlyAuthError } from "./auth-errors.js";
import { wireNav } from "./nav.js";

export async function render(root) {
  root.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo"><img src="/logo-icon.png" alt="JC Academy"></div>
      <h2>Créer votre compte</h2>
      <p class="sub">Rejoignez JC Academy en quelques secondes</p>

      <div id="registerForm">
        <div class="field"><label>Prénom et nom</label><input type="text" id="regFullName" placeholder="Ex: Jean Charles"></div>
        <div class="field"><label>Adresse e-mail</label><input type="email" id="regEmail" placeholder="vous@exemple.com"></div>
        <div class="field"><label>Créer un mot de passe</label><input type="password" id="regPassword" placeholder="8 caractères minimum" minlength="8"></div>
        <div id="regError" class="hidden" style="color:#D64545;font-size:13px;margin-bottom:14px;"></div>
        <button class="btn btn-primary btn-block" id="regBtn">Créer mon compte</button>
      </div>

      <div id="regSuccess" class="hidden" style="text-align:center;">
        <p style="font-size:15px;margin-bottom:10px;">Un e-mail de confirmation a été envoyé à<br><b id="regSentEmail"></b></p>
        <p class="small-muted">Cliquez sur le lien reçu par e-mail pour activer votre compte.</p>
        <a href="/connexion" data-spa-link class="btn btn-primary btn-block" style="display:block;margin-top:16px;">Aller à la connexion</a>
      </div>

      <p class="auth-switch">Déjà inscrit ? <a href="/connexion" data-spa-link>Se connecter</a></p>
    </div>
  </div>`;

  root.querySelector("#regBtn").addEventListener("click", async () => {
    const fullName = root.querySelector("#regFullName").value.trim();
    const email = root.querySelector("#regEmail").value.trim();
    const password = root.querySelector("#regPassword").value;
    const errEl = root.querySelector("#regError");
    errEl.classList.add("hidden");

    if (!fullName || !email || password.length < 8) {
      errEl.textContent = "Merci de remplir tous les champs (mot de passe : 8 caractères minimum).";
      errEl.classList.remove("hidden");
      return;
    }

    const btn = root.querySelector("#regBtn");
    btn.disabled = true;
    btn.textContent = "Création du compte…";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/verification` },
    });

    btn.disabled = false;
    btn.textContent = "Créer mon compte";

    if (error) {
      errEl.textContent = friendlyAuthError(error.message);
      errEl.classList.remove("hidden");
      return;
    }

    root.querySelector("#registerForm").classList.add("hidden");
    root.querySelector("#regSentEmail").textContent = email;
    root.querySelector("#regSuccess").classList.remove("hidden");
  });

  wireNav(root);
}
