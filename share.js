// share.js — Bouton "Partager" réutilisable pour JC Academy
//
// Pourquoi ce fichier existe : WhatsApp, Facebook et les autres réseaux ne
// lisent JAMAIS le JavaScript d'une page pour préparer un aperçu — ils lisent
// uniquement le code HTML brut. Donc pour qu'un aperçu (titre, image, texte)
// s'affiche correctement pour une page dynamique (un cours précis, un
// formateur précis...), il faut leur donner un lien qui passe par une
// fonction serveur qui prépare déjà les bonnes balises AVANT que WhatsApp ne
// les lise. C'est le rôle des liens /c/ /p/ /a/ /n/ /f/ ci-dessous.
//
// Ce script ne remplace donc PAS les balises <meta property="og:..."> dans
// le <head> de chaque page (qui restent nécessaires pour Google et pour un
// premier affichage), il fournit juste le bon lien à partager.
//
// Utilisation : ajoutez <script src="share.js"></script> avant la fermeture
// de </body>, puis sur votre bouton :
//   <button data-share-type="course" data-share-id="mon-cours">Partager</button>
// et, une fois vos données chargées en JavaScript, complétez si besoin :
//   bouton.dataset.shareTitle = course.title;

const SHARE_PREFIXES = {
  course: 'c',       // cours -> course-detail.html
  product: 'p',      // produit numérique -> product-detail.html
  article: 'a',      // article de blog -> article.html
  actualite: 'n',     // actualité -> actualite.html
  formateur: 'f',     // profil formateur -> formateur-profil.html
};

async function shareContent(type, id, title){
  const prefix = SHARE_PREFIXES[type];
  if (!prefix){
    console.error('share.js : type de partage inconnu ->', type);
    return;
  }
  if (!id){
    console.error('share.js : identifiant manquant pour le partage');
    return;
  }
  const shareUrl = `${window.location.origin}/${prefix}/${id}`;
  const shareTitle = title || document.title;

  if (navigator.share){
    try {
      await navigator.share({ title: shareTitle, url: shareUrl });
    } catch (_e) {
      // L'utilisateur a annulé le partage, ou l'a fermé — rien à faire.
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    alert('Lien copié : ' + shareUrl);
  } catch (_e) {
    // Dernier recours si le presse-papiers n'est pas accessible.
    prompt('Copiez ce lien :', shareUrl);
  }
}

// Attache automatiquement le comportement à tout bouton portant l'attribut
// data-share-type, sans avoir à écrire un addEventListener sur chaque page.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-share-type]');
  if (!btn) return;
  shareContent(btn.dataset.shareType, btn.dataset.shareId, btn.dataset.shareTitle);
});

window.shareContent = shareContent;
