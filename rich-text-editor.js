// assets/js/shared/rich-text-editor.js
//
// Port de richTextEditorHTML() / rteExec() du prototype : même barre
// d'outils (police, taille, gras/italique/souligné, couleurs,
// alignement, lien, image), même zone éditable contenteditable.
//
// Différence assumée : rteInsertImage() du prototype encodait l'image
// choisie en base64 directement DANS le HTML stocké en base (content
// jsonb/text potentiellement énorme). Ici, l'image est envoyée dans le
// bucket Storage "articles" et seule son URL publique est insérée —
// cohérent avec la même correction déjà faite pour les avatars et les
// couvertures de cours (§26).

import { supabase } from "./supabase-client.js";

export function richTextEditorHTML(idPrefix, initialHtml, label = "Contenu") {
  return `
  <div class="field">
    <label>${label}</label>
    <div class="rte-toolbar">
      <select id="${idPrefix}Font" title="Police">
        <option value="">Police</option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="'Times New Roman',serif">Times New Roman</option>
        <option value="'Courier New',monospace">Courier New</option>
        <option value="Verdana">Verdana</option>
        <option value="'Sora',sans-serif">Sora</option>
      </select>
      <select id="${idPrefix}Size" title="Taille">
        <option value="">Taille</option>
        <option value="2">Petit</option>
        <option value="3">Normal</option>
        <option value="4">Moyen</option>
        <option value="5">Grand</option>
        <option value="6">Très grand</option>
        <option value="7">Titre</option>
      </select>
      <div class="rte-sep"></div>
      <button type="button" data-rte-cmd="bold" title="Gras"><b>G</b></button>
      <button type="button" data-rte-cmd="italic" title="Italique"><i>I</i></button>
      <button type="button" data-rte-cmd="underline" title="Souligné"><u>S</u></button>
      <div class="rte-sep"></div>
      <input type="color" title="Couleur du texte" id="${idPrefix}Color">
      <input type="color" title="Surlignage" id="${idPrefix}Hilite" value="#fff176">
      <div class="rte-sep"></div>
      <button type="button" data-rte-cmd="justifyLeft" title="Aligner à gauche">⇤</button>
      <button type="button" data-rte-cmd="justifyCenter" title="Centrer">≡</button>
      <button type="button" data-rte-cmd="justifyRight" title="Aligner à droite">⇥</button>
      <div class="rte-sep"></div>
      <button type="button" id="${idPrefix}LinkBtn" title="Insérer un lien">🔗</button>
      <button type="button" id="${idPrefix}ImgBtn" title="Insérer une image">🖼</button>
      <input type="file" accept="image/*" class="file-input-hidden" id="${idPrefix}ImgPick">
    </div>
    <div class="rte-content" id="${idPrefix}Editor" contenteditable="true">${initialHtml || ""}</div>
  </div>`;
}

/**
 * @param {string} bucket bucket Storage utilisé pour les images insérées (ex: "articles")
 * @param {string} ownerId utilisé comme dossier racine
 */
export function wireRichTextEditor(root, idPrefix, bucket, ownerId) {
  const editor = root.querySelector(`#${idPrefix}Editor`);
  let savedRange = null;

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  }
  ["mouseup", "keyup", "blur"].forEach((evt) => editor.addEventListener(evt, saveSelection));

  function exec(cmd, value) {
    editor.focus();
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    try {
      document.execCommand("styleWithCSS", false, true);
    } catch (e) {
      /* certains navigateurs n'ont plus cette commande, on continue sans */
    }
    document.execCommand(cmd, false, value);
    saveSelection();
  }

  root.querySelectorAll("[data-rte-cmd]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => exec(btn.getAttribute("data-rte-cmd")));
  });
  root.querySelector(`#${idPrefix}Font`)?.addEventListener("change", (e) => {
    exec("fontName", e.target.value);
    e.target.selectedIndex = 0;
  });
  root.querySelector(`#${idPrefix}Size`)?.addEventListener("change", (e) => {
    exec("fontSize", e.target.value);
    e.target.selectedIndex = 0;
  });
  root.querySelector(`#${idPrefix}Color`)?.addEventListener("input", (e) => exec("foreColor", e.target.value));
  root.querySelector(`#${idPrefix}Hilite`)?.addEventListener("input", (e) => exec("hiliteColor", e.target.value));
  root.querySelector(`#${idPrefix}LinkBtn`)?.addEventListener("click", () => {
    const url = prompt("URL du lien :", "https://");
    if (url) exec("createLink", url);
  });
  root.querySelector(`#${idPrefix}ImgBtn`)?.addEventListener("click", () => root.querySelector(`#${idPrefix}ImgPick`).click());
  root.querySelector(`#${idPrefix}ImgPick`)?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${ownerId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      alert("Impossible d'envoyer cette image.");
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);
    exec("insertImage", publicUrl);
  });
}

export function getRichTextContent(root, idPrefix) {
  return root.querySelector(`#${idPrefix}Editor`)?.innerHTML ?? "";
}
