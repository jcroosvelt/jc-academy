// assets/js/shared/image-upload.js
//
// Généralise avatar-upload.js à n'importe quel bucket Storage (couverture
// de cours, plus tard produits/galerie/articles — §26 du cahier des
// charges). Même principe : le prototype encodait ces images en base64
// dans le HTML (imageUploadField() / getUploadedImage()), on envoie
// maintenant un vrai fichier dans Storage et on stocke son URL publique.

import { supabase } from "./supabase-client.js";

export function imageUploadFieldHTML(idPrefix, label, existingUrl) {
  return `
  <div class="field">
    <label>${label}</label>
    <input type="file" accept="image/*" id="${idPrefix}File">
    <div id="${idPrefix}Preview" style="margin-top:8px;${existingUrl ? "" : "display:none;"}">
      <img src="${existingUrl || ""}" alt="" style="max-width:220px;border-radius:8px;display:block;">
    </div>
    <p id="${idPrefix}Error" class="small-muted hidden" style="color:var(--danger,#B23B3B);margin-top:6px;"></p>
  </div>`;
}

/**
 * @param {string} bucket nom du bucket Storage (ex: "course-covers")
 * @param {string} ownerId utilisé comme dossier racine (RLS : chacun n'écrit que dans le sien)
 * @param {(url:string)=>void} onUploaded appelé avec l'URL publique une fois l'upload terminé
 */
export function wireImageUpload(root, idPrefix, bucket, ownerId, onUploaded) {
  const input = root.querySelector(`#${idPrefix}File`);
  const previewWrap = root.querySelector(`#${idPrefix}Preview`);
  const errorBox = root.querySelector(`#${idPrefix}Error`);

  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    errorBox.classList.add("hidden");

    const path = `${ownerId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });

    if (uploadError) {
      errorBox.textContent = "Impossible d'envoyer cette image. Réessayez.";
      errorBox.classList.remove("hidden");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    previewWrap.innerHTML = `<img src="${publicUrl}" alt="" style="max-width:220px;border-radius:8px;display:block;">`;
    previewWrap.style.display = "block";
    onUploaded(publicUrl);
  });
}
