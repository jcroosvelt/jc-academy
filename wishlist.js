// assets/js/shared/wishlist.js
//
// Port de la logique de state.wishlist / toggleWishlist() du prototype,
// mais sans état global mutable : chaque page lit/écrit directement dans
// la table `wishlists`, protégée par RLS (un étudiant ne voit et ne
// modifie que ses propres favoris — §6 du cahier des charges).

import { supabase } from "./supabase-client.js";

/** Renvoie la liste des ids de cours favoris de l'utilisateur connecté, ou [] si non connecté. */
export async function getWishlistIds() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase.from("wishlists").select("course_id").eq("student_id", session.user.id);
  if (error) return [];
  return data.map((row) => row.course_id);
}

/**
 * Ajoute/retire un cours des favoris. Renvoie true si le cours est
 * maintenant en favoris, false sinon. Redirige vers la connexion si
 * l'utilisateur n'est pas connecté (comme le prototype).
 */
export async function toggleWishlist(courseId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "/connexion";
    return false;
  }

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("student_id", session.user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlists").delete().eq("id", existing.id);
    return false;
  }

  await supabase.from("wishlists").insert({ student_id: session.user.id, course_id: courseId });
  return true;
}
