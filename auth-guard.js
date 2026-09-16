// assets/js/shared/auth-guard.js
//
// À inclure en haut de chaque page privée (tableau-de-bord, espace-formateur,
// admin/*). Remplace l'ancien contrôle fait uniquement dans la fonction
// go() du prototype (ROUTE_ROLES vérifié seulement en JS navigateur).
//
// IMPORTANT : ce fichier protège l'AFFICHAGE (niveau 1 de la sécurité).
// Il ne remplace PAS les policies RLS (niveau 3) ni la vérification dans
// les Edge Functions (niveau 2) pour les actions sensibles. Un utilisateur
// technique peut toujours appeler l'API Supabase directement : c'est RLS
// qui doit l'en empêcher, pas ce fichier.

import { supabase } from "./supabase-client.js";

/**
 * @param {("student"|"teacher"|"admin")[]} allowedRoles
 * @returns {Promise<{id:string, email:string, role:string, full_name:string}>}
 */
export async function requireRole(allowedRoles) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.replace("/connexion/?redirect=" + encodeURIComponent(location.pathname));
    throw new Error("Non authentifié");
  }

  // Le rôle est TOUJOURS lu depuis la table `profiles` en base, jamais
  // depuis un champ modifiable côté client (localStorage, JWT custom claim
  // non signé, etc.).
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    window.location.replace("/connexion/");
    throw new Error("Profil introuvable");
  }

  if (!allowedRoles.includes(profile.role)) {
    window.location.replace("/?erreur=acces-refuse");
    throw new Error("Rôle insuffisant");
  }

  return profile;
}
