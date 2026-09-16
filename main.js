// assets/js/app/main.js
// Point d'entrée du SPA public. Charge la navbar/footer une seule fois,
// puis démarre le routeur (router.js) qui gère le contenu de #app-root.

import { renderNavbar } from "./navbar.js";
import { renderFooter } from "./footer.js";
import "./router.js"; // se démarre lui-même à l'import

renderNavbar();
renderFooter();
