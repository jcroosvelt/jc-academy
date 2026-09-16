// assets/js/app/pages/reinitialiser-mot-de-passe.js
//
// Supabase redirige ici avec un jeton de récupération dans l'URL après
// clic sur le lien reçu par e-mail (voir mot-de-passe-oublie.js) ;
// detectSessionInUrl (supabase-client.js) l'échange automatiquement
// contre une session temporaire, valable juste pour ce changement.

import { supabase } from "./supabase-client.js";

export async function render(root) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    root.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo"><img src="/logo-icon.png" alt="JC Academy"></div>
        <h2>Lien invalide ou expiré</h2>
        <p class="sub">Demandez un nouveau lien de réinitialisation.</p>
        <a href="/mot-de-passe-oublie" class="btn btn-primary btn-block" style="display:block;text-align:center;">Redemander un lien</a>
      </div>
    </div>`;
    return;
  }

  root.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo"><img src="/logo-icon.png" alt="JC Academy"></div>
      <h2>Choisir un nouveau mot de passe</h2>
      <p class="sub">Votre nouveau mot de passe doit contenir au moins 8 caractères.</p>

      <div class="field"><label>Nouveau mot de passe</label><input type="password" id="newPassword" placeholder="8 caractères minimum" minlength="8"></div>
      <div class="field"><label>Confirmer le mot de passe</label><input type="password" id="confirmPassword" placeholder="••••••••"></div>
      <div id="resetError" class="hidden" style="color:#D64545;font-size:13px;margin-bottom:14px;"></div>
      <button class="btn btn-primary btn-block" id="resetBtn">Réinitialiser le mot de passe</button>
    </div>
  </div>`;

  root.querySelector("#resetBtn").addEventListener("click", async () => {
    const newPassword = root.querySelector("#newPassword").value;
    const confirmPassword = root.querySelector("#confirmPassword").value;
    const errEl = root.querySelector("#resetError");
    errEl.classList.add("hidden");

    if (newPassword.length < 8) {
      errEl.textContent = "Le mot de passe doit faire au moins 8 caractères.";
      errEl.classList.remove("hidden");
      return;
    }
    if (newPassword !== confirmPassword) {
      errEl.textContent = "Les deux mots de passe ne correspondent pas.";
      errEl.classList.remove("hidden");
      return;
    }

    const btn = root.querySelector("#resetBtn");
    btn.disabled = true;
    btn.textContent = "Enregistrement…";

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      errEl.textContent = "Erreur : " + error.message;
      errEl.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Réinitialiser le mot de passe";
      return;
    }

    root.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card" style="text-align:center;">
        <div class="auth-logo"><img src="/logo-icon.png" alt="JC Academy"></div>
        <h2>Mot de passe mis à jour !</h2>
        <a href="/connexion" class="btn btn-primary btn-block" style="display:block;margin-top:14px;">Se connecter</a>
      </div>
    </div>`;
  });
}
