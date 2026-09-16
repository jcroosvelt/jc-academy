// assets/js/cours/cours.js
//
// Port de renderCourses() du prototype : recherche, filtres (catégorie,
// gratuit/payant, niveau, durée, langue, prix), pagination — mêmes
// classes CSS, même disposition.
//
// CORRECTION §21/§22 : le prototype chargeait TOUS les cours en mémoire
// (COURSES) puis filtrait/paginait côté client avec .filter()/.slice().
// Ici, la recherche, les filtres et la pagination sont de vraies
// requêtes Supabase (.ilike, .eq, .range, .limit) — seule la page
// demandée est jamais transférée au navigateur.

import { supabase } from "./supabase-client.js";
import { getSiteContent } from "./site-content.js";
import { courseCardHTML, attachCourseCardHandlers } from "./course-card.js";
import { getWishlistIds, toggleWishlist } from "./wishlist.js";

const COURSES_PER_PAGE = 6;
const LEVELS = ["Débutant", "Intermédiaire", "Avancé", "Tous niveaux"];

const initialParams = new URLSearchParams(window.location.search);
const filters = {
  search: "",
  category: ["certificat", "diplome"].includes(initialParams.get("categorie")) ? initialParams.get("categorie") : "all",
  type: initialParams.get("gratuit") === "1" ? "free" : "all",
  level: "all",
  duration: "all",
  lang: "all",
  price: "all",
  page: 1,
};

let exchangeRate = 131;
let wishlistIds = [];

const root = document.getElementById("page-root");
init();

async function init() {
  ({ exchangeRate } = await getSiteContent());
  wishlistIds = await getWishlistIds();
  await renderPage();
}

async function fetchCourses() {
  let query = supabase.from("courses").select("id, slug, title, category, price_usd, duration_text, students_count, rating, level, lang, weeks", { count: "exact" }).eq("status", "publie");

  if (filters.search.trim()) query = query.ilike("title", `%${filters.search.trim()}%`);
  if (filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.type === "free") query = query.eq("price_usd", 0);
  if (filters.type === "paid") query = query.gt("price_usd", 0);
  if (filters.level !== "all") query = query.eq("level", filters.level);
  if (filters.lang !== "all") query = query.eq("lang", filters.lang);
  if (filters.duration === "short") query = query.lte("weeks", 4);
  if (filters.duration === "medium") query = query.gte("weeks", 5).lte("weeks", 12);
  if (filters.duration === "long") query = query.gt("weeks", 12);
  if (filters.price === "free") query = query.eq("price_usd", 0);
  if (filters.price === "low") query = query.gt("price_usd", 0).lte("price_usd", 50);
  if (filters.price === "mid") query = query.gte("price_usd", 50).lte("price_usd", 200);
  if (filters.price === "high") query = query.gt("price_usd", 200);

  const from = (filters.page - 1) * COURSES_PER_PAGE;
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, from + COURSES_PER_PAGE - 1);

  return { data: data ?? [], error, total: count ?? 0 };
}

async function renderPage() {
  root.innerHTML = `<p>Chargement…</p>`;
  const { data: courses, error, total } = await fetchCourses();

  if (error) {
    root.innerHTML = `<p>Impossible de charger les cours pour le moment.</p>`;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / COURSES_PER_PAGE));
  if (filters.page > totalPages) filters.page = totalPages;

  const priceLowLabel = Math.round(50 * exchangeRate).toLocaleString("fr-FR");
  const priceMidLabel = Math.round(200 * exchangeRate).toLocaleString("fr-FR");

  root.innerHTML = `
    <section class="page-header">
      <div class="container">
        <div class="eyebrow" style="background:rgba(255,255,255,.12);color:#fff;">Catalogue</div>
        <h1>Nos Cours</h1>
        <p>Explorez nos programmes certificat et diplôme, filtrez par catégorie ou recherchez le cours qu'il vous faut.</p>
      </div>
    </section>
    <div class="container" style="padding:32px 24px 70px;">
      <div class="search-bar">
        <input type="text" id="courseSearchInput" placeholder="Rechercher un cours (ex: Marketing, Data Science...)" value="${filters.search}">
        <button class="btn btn-primary btn-sm" id="courseSearchBtn">Rechercher</button>
      </div>

      <div class="filters-row">
        <span class="small-muted" style="margin-right:6px;">Catégorie :</span>
        <button class="filter-chip ${filters.category === "all" ? "active" : ""}" data-set-filter="category:all">Toutes</button>
        <button class="filter-chip ${filters.category === "certificat" ? "active" : ""}" data-set-filter="category:certificat">Programme Certificat</button>
        <button class="filter-chip ${filters.category === "diplome" ? "active" : ""}" data-set-filter="category:diplome">Programme Diplôme</button>
        <span style="width:1px;height:24px;background:var(--border);margin:0 6px;"></span>
        <span class="small-muted" style="margin-right:6px;">Type :</span>
        <button class="filter-chip ${filters.type === "all" ? "active" : ""}" data-set-filter="type:all">Tous</button>
        <button class="filter-chip ${filters.type === "free" ? "gold-active" : ""}" data-set-filter="type:free">Gratuit</button>
        <button class="filter-chip ${filters.type === "paid" ? "active" : ""}" data-set-filter="type:paid">Payant</button>
      </div>

      <div class="filters-row">
        <span class="small-muted" style="margin-right:6px;">Niveau :</span>
        <select id="filterLevel" style="padding:8px 12px;border-radius:8px;border:1.5px solid var(--border);font-size:13px;">
          <option value="all" ${filters.level === "all" ? "selected" : ""}>Tous les niveaux</option>
          ${LEVELS.map((l) => `<option value="${l}" ${filters.level === l ? "selected" : ""}>${l}</option>`).join("")}
        </select>
        <span class="small-muted" style="margin:0 6px;">Durée :</span>
        <select id="filterDuration" style="padding:8px 12px;border-radius:8px;border:1.5px solid var(--border);font-size:13px;">
          <option value="all" ${filters.duration === "all" ? "selected" : ""}>Toutes durées</option>
          <option value="short" ${filters.duration === "short" ? "selected" : ""}>Courte (&le; 4 semaines)</option>
          <option value="medium" ${filters.duration === "medium" ? "selected" : ""}>Moyenne (5-12 semaines)</option>
          <option value="long" ${filters.duration === "long" ? "selected" : ""}>Longue (&gt; 12 semaines)</option>
        </select>
        <span class="small-muted" style="margin:0 6px;">Langue :</span>
        <select id="filterLang" style="padding:8px 12px;border-radius:8px;border:1.5px solid var(--border);font-size:13px;">
          <option value="all" ${filters.lang === "all" ? "selected" : ""}>Toutes langues</option>
          <option value="Français" ${filters.lang === "Français" ? "selected" : ""}>Français</option>
          <option value="Anglais" ${filters.lang === "Anglais" ? "selected" : ""}>Anglais</option>
        </select>
        <span class="small-muted" style="margin:0 6px;">Prix :</span>
        <select id="filterPrice" style="padding:8px 12px;border-radius:8px;border:1.5px solid var(--border);font-size:13px;">
          <option value="all" ${filters.price === "all" ? "selected" : ""}>Tous les prix</option>
          <option value="free" ${filters.price === "free" ? "selected" : ""}>Gratuit</option>
          <option value="low" ${filters.price === "low" ? "selected" : ""}>Moins de ${priceLowLabel} HTG</option>
          <option value="mid" ${filters.price === "mid" ? "selected" : ""}>${priceLowLabel} - ${priceMidLabel} HTG</option>
          <option value="high" ${filters.price === "high" ? "selected" : ""}>Plus de ${priceMidLabel} HTG</option>
        </select>
      </div>

      <div class="results-count">${total} cours trouvé${total > 1 ? "s" : ""}</div>
      <div class="course-grid" style="margin-bottom:20px;">
        ${
          courses.length
            ? courses.map((c) => courseCardHTML(c, wishlistIds, exchangeRate)).join("")
            : `<p class="small-muted">Aucun cours ne correspond à votre recherche.</p>`
        }
      </div>

      ${
        totalPages > 1
          ? `<div class="pagination">
        <button class="page-btn" data-page="${filters.page - 1}" ${filters.page === 1 ? "disabled" : ""}>&#8592;</button>
        ${Array.from({ length: totalPages }, (_, i) => i + 1)
          .map((n) => `<button class="page-btn ${filters.page === n ? "active" : ""}" data-page="${n}">${n}</button>`)
          .join("")}
        <button class="page-btn" data-page="${filters.page + 1}" ${filters.page === totalPages ? "disabled" : ""}>&#8594;</button>
      </div>`
          : ""
      }
    </div>
  `;

  wireEvents();
  attachCourseCardHandlers(root, (courseId) => toggleWishlist(courseId));
}

function wireEvents() {
  const searchInput = root.querySelector("#courseSearchInput");
  function runSearch() {
    filters.search = searchInput.value;
    filters.page = 1;
    renderPage();
  }
  root.querySelector("#courseSearchBtn").addEventListener("click", runSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });

  root.querySelectorAll("[data-set-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [key, value] = btn.getAttribute("data-set-filter").split(":");
      filters[key] = value;
      filters.page = 1;
      renderPage();
    });
  });

  root.querySelector("#filterLevel").addEventListener("change", (e) => {
    filters.level = e.target.value;
    filters.page = 1;
    renderPage();
  });
  root.querySelector("#filterDuration").addEventListener("change", (e) => {
    filters.duration = e.target.value;
    filters.page = 1;
    renderPage();
  });
  root.querySelector("#filterLang").addEventListener("change", (e) => {
    filters.lang = e.target.value;
    filters.page = 1;
    renderPage();
  });
  root.querySelector("#filterPrice").addEventListener("change", (e) => {
    filters.price = e.target.value;
    filters.page = 1;
    renderPage();
  });

  root.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.getAttribute("data-page"));
      if (page < 1) return;
      filters.page = page;
      renderPage();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}
