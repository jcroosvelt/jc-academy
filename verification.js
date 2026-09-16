// assets/js/app/pages/verification.js
//
// CORRECTION DE FAILLE : l'ancien prototype acceptait n'importe quel code
// à 6 chiffres. Ici, deux mécanismes réels possibles :
//
// 1. Lien de confirmation par email (recommandé, déjà branché dans
//    inscription.js via emailRedirectTo) : Supabase détecte le token
//    dans l'URL automatiquement (detectSessionInUrl: true dans
//    supabase-client.js) — pas besoin de code à taper.
// 2. Vrai code OTP à 6 chiffres vérifié par supabase.auth.verifyOtp().

import { supabase } from "./supabase-client.js";

export async function render(root) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    root.innerHTML = `<p>Votre compte est confirmé. <a href="/tableau-de-bord.html">Accéder à mon espace</a></p>`;
    return;
  }

  // TODO: reprendre le HTML exact de l'étape OTP de renderRegister() du
  // prototype si un vrai code par email/SMS est souhaité, branché sur
  // supabase.auth.verifyOtp({ email, token, type: "signup" }).
  root.innerHTML = `<p>Un lien de confirmation vous a été envoyé par email.</p>`;
}
