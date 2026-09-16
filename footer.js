// assets/js/app/footer.js
//
// Port fidèle de l'ancienne fonction renderFooter() du prototype
// (index.html, ligne ~1493) : mêmes classes CSS, même structure,
// même logo wordmark, mêmes réseaux sociaux et coordonnées réelles.
// TODO: à terme, ces coordonnées (SITE_CONTENT) devront venir de la
// table site_settings (CMS, §17 du cahier des charges) plutôt que
// d'être en dur ici — pour l'instant, ce sont les vraies valeurs déjà
// utilisées dans le prototype.

const SITE_CONTENT = {
  motto: "Learn. Lead. Inspire",
  footerAbout:
    "JC Academy est une plateforme de formation en ligne certifiante qui vous aide à apprendre de nouvelles compétences, obtenir des certifications reconnues et faire progresser votre carrière.",
  contactPhone: "+509 42 75 5464",
  contactPhone2: "+509 55 26 2356",
  contactAddress: "Port-au-Prince, Haïti",
  contactEmail: "contact@jcacademy.com",
};

export function renderFooter() {
  const root = document.getElementById("footer-root");

  root.innerHTML = `
  <footer>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <img src="/logo-wordmark.png" alt="JC Academy">
          <p>${SITE_CONTENT.footerAbout}</p>
          <div class="social-row" style="margin-top:16px;">
            <a href="https://www.facebook.com/share/1LfvYQFkDj/" target="_blank" rel="noopener" aria-label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.53 17.52 2.04 12 2.04S2 6.53 2 12.06c0 5 3.66 9.14 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.9h-2.34v7c4.78-.76 8.44-4.9 8.44-9.9Z"/></svg>
            </a>
            <a href="https://www.instagram.com/jcacademyht" target="_blank" rel="noopener" aria-label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.55.55.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43-.26.66-.6 1.21-1.15 1.76-.55.55-1.1.9-1.76 1.15-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47-.66-.26-1.21-.6-1.76-1.15-.55-.55-.9-1.1-1.15-1.76-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76.55-.55 1.1-.9 1.76-1.15.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.28 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.4-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z"/></svg>
            </a>
            <a href="https://youtube.com/@jcacademyht" target="_blank" rel="noopener" aria-label="YouTube">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.75s-.23-1.63-.94-2.35c-.9-.95-1.9-.95-2.36-1.01C16.9 3.1 12 3.1 12 3.1h-.01s-4.9 0-8.2.29c-.46.06-1.46.06-2.36 1.01-.71.72-.94 2.35-.94 2.35S.2 8.66.2 10.57v1.79c0 1.91.29 3.82.29 3.82s.23 1.63.94 2.35c.9.95 2.08.92 2.6 1.02 1.9.18 8.02.29 8.02.29s4.91-.01 8.2-.3c.46-.06 1.46-.06 2.36-1.01.71-.72.94-2.35.94-2.35s.29-1.91.29-3.82v-1.79c0-1.91-.29-3.82-.29-3.82ZM9.6 14.6V8.4l6.2 3.1-6.2 3.1Z"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h5>À propos de nous</h5>
          <ul>
            <li><a href="/a-propos" data-spa-link>Notre mission</a></li>
            <li><a href="/formateurs" data-spa-link>Nos formateurs</a></li>
            <li><a href="/devenir-formateur" data-spa-link>Carrières</a></li>
            <li><a href="/contact" data-spa-link>Partenaires</a></li>
          </ul>
        </div>
        <div>
          <h5>Plateforme</h5>
          <ul>
            <li><a href="/cours.html">Nos cours</a></li>
            <li><a href="/cours.html?filtre=gratuit">Cours gratuits</a></li>
            <li><a href="/devenir-formateur" data-spa-link>Devenir formateur</a></li>
            <li><a href="/a-propos" data-spa-link>Certificats</a></li>
          </ul>
        </div>
        <div>
          <h5>Contact</h5>
          <ul>
            <li><a href="mailto:${SITE_CONTENT.contactEmail}">${SITE_CONTENT.contactEmail}</a></li>
            <li><a href="tel:${SITE_CONTENT.contactPhone.replace(/\s/g, "")}">${SITE_CONTENT.contactPhone}</a></li>
            <li><a href="tel:${SITE_CONTENT.contactPhone2.replace(/\s/g, "")}">${SITE_CONTENT.contactPhone2}</a></li>
            <li><a href="/contact" data-spa-link>${SITE_CONTENT.contactAddress}</a></li>
            <li><a href="/contact" data-spa-link>Centre d'aide</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} JC Academy. Tous droits réservés.</span>
        <span style="display:flex;gap:14px;flex-wrap:wrap;">
          <a href="/a-propos" data-spa-link>À propos</a>
          <a href="/contact" data-spa-link>Contact</a>
        </span>
        <span>${SITE_CONTENT.motto}</span>
      </div>
    </div>
  </footer>`;

  root.querySelectorAll("[data-spa-link]").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const { navigate } = await import("./router.js");
      navigate(link.getAttribute("href"));
    });
  });
}
