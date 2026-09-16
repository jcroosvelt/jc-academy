// assets/js/app/pages/connexion.js
// Reprend le design exact de renderLogin() du prototype (auth-card).
// La logique était déjà correcte (signInWithPassword) — habillée ici
// avec le vrai HTML au lieu du formulaire brut provisoire.

import { supabase } from "./supabase-client.js";
import { friendlyAuthError } from "./auth-errors.js";
import { wireNav } from "./nav.js";

export async function render(root) {
  root.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo"><img src="/logo-icon.png" alt="JC Academy"></div>
      <h2>Content de vous revoir</h2>
      <p class="sub">Connectez-vous pour continuer votre apprentissage</p>

      <div class="field"><label>E-mail</label><input type="email" id="loginEmail" placeholder="vous@exemple.com"></div>
      <div class="field"><label>Mot de passe</label><input type="password" id="loginPassword" placeholder="••••••••"></div>
      <div id="loginError" class="hidden" style="color:#D64545;font-size:13px;margin-bottom:14px;"></div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:20px;font-size:13px;">
        <a href="/mot-de-passe-oublie" data-spa-link style="color:var(--navy);font-weight:600;">Mot de passe oublié ?</a>
      </div>
      <button class="btn btn-primary btn-block" id="loginBtn">Se connecter</button>
      <p class="auth-switch">Pas encore de compte ? <a href="/inscription" data-spa-link>S'inscrire</a></p>
    </div>
  </div>`;

  root.querySelector("#loginBtn").addEventListener("click", async () => {
    const email = root.querySelector("#loginEmail").value.trim();
    const password = root.querySelector("#loginPassword").value;
    const errEl = root.querySelector("#loginError");
    errEl.classList.add("hidden");

    if (!email || !password) {
      errEl.textContent = "Merci de renseigner e-mail et mot de passe.";
      errEl.classList.remove("hidden");
      return;
    }

    const btn = root.querySelector("#loginBtn");
    btn.disabled = true;
    btn.textContent = "Connexion…";

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.textContent = "Se connecter";

    if (error) {
      errEl.textContent = friendlyAuthError(error.message);
      errEl.classList.remove("hidden");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get("redirect") || "/tableau-de-bord.html";
  });

  wireNav(root);
}
