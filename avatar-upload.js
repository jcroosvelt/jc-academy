// assets/js/shared/avatar-upload.js
//
// Port du widget d'avatar du prototype (imageUploadFieldAvatar() /
// previewAvatar()) : même rendu visuel (cercle + "Ajouter une photo").
// Différence assumée : le prototype stockait l'image en base64 DANS la
// colonne profiles.avatar_url (previewAvatar -> readAsDataURL), ce qui
// alourdit chaque ligne de la table et n'a pas sa place en base de
// données. Ici, le fichier est envoyé dans le bucket Storage "avatars"
// (§26 du cahier des charges) et seule l'URL publique est stockée.

import { supabase } from "./supabase-client.js";

export function avatarUploadFieldHTML(idPrefix, existingUrl) {
  return `
  <div style="text-align:center;margin-bottom:20px;">
    <label for="${idPrefix}File" style="cursor:pointer;display:inline-block;">
      <img id="${idPrefix}Preview" src="${existingUrl || ""}" alt="" style="${existingUrl ? "display:block;" : "display:none;"}width:90px;height:90px;border-radius:50%;object-fit:cover;margin:0 auto;">
      <div id="${idPrefix}Placeholder" class="avatar-upload" style="${existingUrl ? "display:none;" : ""}">Ajouter<br>une photo</div>
    </label>
    <input type="file" accept="image/*" id="${idPrefix}File" class="file-input-hidden">
    <p id="${idPrefix}Error" class="small-muted hidden" style="color:var(--danger,#B23B3B);margin-top:6px;"></p>
  </div>`;
}

/**
 * Câble le widget inséré par avatarUploadFieldHTML(). À l'upload,
 * envoie le fichier dans Storage et renvoie son URL publique via
 * onUploaded(url) — c'est à l'appelant de décider quand persister
 * cette URL en base (généralement au clic sur "Enregistrer").
 */
export function wireAvatarUpload(root, idPrefix, userId, onUploaded) {
  const input = root.querySelector(`#${idPrefix}File`);
  const preview = root.querySelector(`#${idPrefix}Preview`);
  const placeholder = root.querySelector(`#${idPrefix}Placeholder`);
  const errorBox = root.querySelector(`#${idPrefix}Error`);

  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    errorBox.classList.add("hidden");

    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

    if (uploadError) {
      errorBox.textContent = "Impossible d'envoyer cette image. Réessayez.";
      errorBox.classList.remove("hidden");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    preview.src = publicUrl;
    preview.style.display = "block";
    if (placeholder) placeholder.style.display = "none";
    onUploaded(publicUrl);
  });
}
