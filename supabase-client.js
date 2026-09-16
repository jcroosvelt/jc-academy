// assets/js/shared/supabase-client.js
//
// Point d'entrée UNIQUE pour parler à Supabase depuis le navigateur.
// Utilise la clé PUBLIQUE (anon key) — jamais la clé de service.
// Toute opération sensible (paiement, certificat, téléchargement de
// produit numérique) ne passe PAS par ce client : elle passe par une
// Supabase Edge Function (voir /supabase/functions), qui, elle,
// tourne sur un serveur et peut utiliser des secrets en toute sécurité.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://tzgwhhxxozujxnjjpucg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6Z3doaHh4b3p1anhuampwdWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzYwODMsImV4cCI6MjEwNDc1MjA4M30.Ot_PopgHqL7zMbv-0Co23V_8EGCQyRU4NCecfVsKWVs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
