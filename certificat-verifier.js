// assets/js/certificat-verifier/certificat-verifier.js
//
// Page 100% publique : n'importe qui (recruteur, autre organisme) doit
// pouvoir vérifier un certificat sans se connecter, juste avec le code
// (URL du type /certificat-verifier.html?code=ABC123).
//
// Interroge la vue "certificate_verifications" (voir 0009_certificates.sql)
// plutôt que la table "certificates" directement : elle n'expose que les
// colonnes nécessaires à la vérification (jamais l'e-mail de réception ni
// l'identifiant de l'étudiant), et seulement pour les certificats déjà
// envoyés par un admin — jamais une demande encore en attente.

import { supabase } from "./supabase-client.js";
import { escapeHtml } from "./format.js";

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

async function verify() {
  const root = document.getElementById("page-root");

  if (!code) {
    root.innerHTML = `
      <div class="container" style="padding:70px 24px;max-width:480px;">
        <h1 style="font-size:22px;margin-bottom:16px;">Vérifier un certificat</h1>
        <form id="verify-form">
          <div class="field"><input type="text" name="code" placeholder="Code de vérification" required></div>
          <button type="submit" class="btn btn-primary btn-block">Vérifier</button>
        </form>
      </div>
    `;
    root.querySelector("#verify-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const value = e.target.code.value.trim();
      window.location.href = `/certificat-verifier.html?code=${encodeURIComponent(value)}`;
    });
    return;
  }

  const { data: certificate, error } = await supabase.from("certificate_verifications").select("*").eq("verification_code", code).single();

  root.innerHTML = `
    <div class="container" style="padding:70px 24px;max-width:480px;">
      ${
        error || !certificate
          ? `<h1 style="font-size:22px;">❌ Code invalide</h1><p class="small-muted">Ce code ne correspond à aucun certificat émis par JC Academy.</p>`
          : `
        <h1 style="font-size:22px;color:var(--success,#1D9A6C);">✓ Certificat authentique</h1>
        <div class="module" style="padding:20px;margin-top:16px;">
          <p style="margin:0 0 6px;"><b>Décerné à :</b> ${escapeHtml(certificate.recipient_name)}</p>
          <p style="margin:0 0 6px;"><b>Cours :</b> ${escapeHtml(certificate.course_title)}</p>
          <p style="margin:0 0 6px;"><b>Numéro :</b> ${escapeHtml(certificate.certificate_number)}</p>
          <p style="margin:0;"><b>Date d'émission :</b> ${new Date(certificate.issue_date).toLocaleDateString("fr-FR")}</p>
        </div>
      `
      }
      <p class="small-muted" style="margin-top:20px;"><a href="/certificat-verifier.html">Vérifier un autre code</a></p>
    </div>
  `;
}

verify();
