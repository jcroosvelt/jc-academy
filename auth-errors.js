// assets/js/shared/auth-errors.js
// Port de friendlyAuthError() du prototype — traduit les messages
// techniques de Supabase Auth en phrases compréhensibles.

export function friendlyAuthError(message) {
  const m = (message || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.";
  if (m.includes("email not confirmed")) return "Votre e-mail n'a pas encore été confirmé. Vérifiez votre boîte de réception (et vos spams) pour le lien de confirmation.";
  if (m.includes("user already registered") || m.includes("already registered")) return "Un compte existe déjà avec cet e-mail. Essayez de vous connecter plutôt.";
  if (m.includes("password") && (m.includes("6 characters") || m.includes("8 characters"))) return "Le mot de passe est trop court.";
  if (m.includes("rate limit")) return "Trop de tentatives. Merci de patienter quelques minutes avant de réessayer.";
  if (m.includes("network")) return "Problème de connexion internet. Vérifiez votre connexion et réessayez.";
  return message || "Une erreur est survenue. Merci de réessayer.";
}
