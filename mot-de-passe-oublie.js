// assets/js/app/pages/mot-de-passe-oublie.js
//
// CORRECTION D'AUDIT : renderForgotPassword() du prototype affichait un
// message de succès directement, sans jamais appeler Supabase — aucun
// e-mail n'était réellement envoyé. Ici, un vrai appel à
// resetPasswordForEmail() envoie le lien de réinitialisation.

import { supabase } from "./supabase-client.js";
import { wireNav } from "./nav.js";

export async function render(root) {
  root.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo"><img src="/logo-icon.png" alt="JC Academy"></div>
      <h2>Mot de passe oublié</h2>
      <p class="sub">Entrez votre e-mail, nous vous enverrons un lien pour le réinitialiser.</p>

      <div id="forgotForm">
        <div class="field"><label>E-mail</label><input type="email" id="forgotEmail" placeholder="vous@exemple.com"></div>
        <div id="forgotError" class="hidden" style="color:#D64545;font-size:13px;margin-bottom:14px;"></div>
        <button class="btn btn-primary btn-block" id="forgotBtn">Envoyer le lien</button>
      </div>

      <div id="forgotSuccess" class="hidden" style="text-align:center;">
        <p style="font-size:15px;margin-bottom:10px;">Un lien de réinitialisation a été envoyé à<br><b id="forgotSentEmail"></b></p>
        <p class="small-muted">Cliquez sur le lien reçu par e-mail pour choisir un nouveau mot de passe.</p>
      </div>

      <p class="auth-switch"><a href="/connexion" data-spa-link>&larr; Retour à la connexion</a></p>
    </div>
  </div>`;

  root.querySelector("#forgotBtn").addEventListener("click", async () => {
    const email = root.querySelector("#forgotEmail").value.trim();
    const errEl = root.querySelector("#forgotError");
    errEl.classList.add("hidden");
    if (!email) {
      errEl.textContent = "Merci de renseigner votre e-mail.";
      errEl.classList.remove("hidden");
      return;
    }

    const btn = root.querySelector("#forgotBtn");
    btn.disabled = true;
    btn.textContent = "Envoi…";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });

    btn.disabled = false;
    btn.textContent = "Envoyer le lien";

    // Même message affiché que l'e-mail existe ou non chez nous, pour ne
    // pas révéler à un tiers quels e-mails sont enregistrés.
    if (error && error.status !== 400) {
      errEl.textContent = "Une erreur est survenue. Réessayez.";
      errEl.classList.remove("hidden");
      return;
    }

    root.querySelector("#forgotForm").classList.add("hidden");
    root.querySelector("#forgotSentEmail").textContent = email;
    root.querySelector("#forgotSuccess").classList.remove("hidden");
  });

  wireNav(root);
}
