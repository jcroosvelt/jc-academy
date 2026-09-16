// assets/js/app/pages/home.js
//
// Port fidèle de renderHome() du prototype (index.html original,
// ~ligne 1555) : mêmes sections, mêmes classes CSS, même contenu.
// Ce qui change uniquement :
//   - les données viennent de Supabase au lieu des tableaux JS globaux
//     COURSES/INSTRUCTORS/ARTICLES/NEWS/GALLERY du prototype ;
//   - les cartes de cours pointent vers de vraies pages /cours/<slug>
//     (voir assets/js/shared/course-card.js) au lieu de l'ancien routeur
//     go('course-detail', ...) ;
//   - les boutons utilisent data-nav/data-spa-link (voir shared/nav.js)
//     au lieu de onclick="go(...)".

import { supabase } from "./supabase-client.js";
import { getSiteContent } from "./site-content.js";
import { palette, initials, renderStarsHTML, escapeHtml } from "./format.js";
import { courseCardHTML, attachCourseCardHandlers } from "./course-card.js";
import { getWishlistIds, toggleWishlist } from "./wishlist.js";
import { wireNav } from "./nav.js";

export async function render(root) {
  root.innerHTML = `<p>Chargement…</p>`;

  const [{ content, exchangeRate }, featured, instructors, articles, news, gallery, wishlistIds] =
    await Promise.all([
      getSiteContent(),
      loadFeaturedCourses(),
      loadInstructors(),
      loadArticles(),
      loadNews(),
      loadGallery(),
      getWishlistIds(),
    ]);

  root.innerHTML = renderHomeHTML({ content, exchangeRate, featured, instructors, articles, news, gallery, wishlistIds });

  wireNav(root);
  attachCourseCardHandlers(root, (courseId) => toggleWishlist(courseId));
  wireCarousel(root, "instructorTrack");
  wireGallery(root);
  loadTestimonials(root); // asynchrone, remplit #testiTrack une fois prêt
}

// ===================== Chargement des données =====================

// Featured = les 6 premiers cours publiés par ordre de création, comme
// dans le prototype (COURSES.slice(0,6) après un tri par created_at
// croissant). À revoir plus tard si un vrai critère "mis en avant" est
// souhaité (§21/§22 : pour l'instant on garde le même comportement).
async function loadFeaturedCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, category, price_usd, duration_text, students_count, rating, instructor_id")
    .eq("status", "publie")
    .order("created_at", { ascending: true })
    .limit(6);
  if (error) return [];
  return data;
}

async function loadInstructors() {
  const { data: teachers, error } = await supabase.from("profiles").select("id, full_name, bio").eq("role", "teacher");
  if (error || !teachers?.length) return [];

  // Reprend la nuance du prototype : le libellé de rôle affiché dépend de
  // si le formateur a au moins un cours de catégorie "diplome".
  const { data: courseCats } = await supabase.from("courses").select("category, instructor_id").eq("status", "publie");

  return teachers.map((t) => {
    const hasDiplome = (courseCats ?? []).some((c) => c.instructor_id === t.id && c.category === "diplome");
    return {
      name: t.full_name,
      role: hasDiplome ? "Formateur" : "Formateur JC Academy",
      init: initials(t.full_name),
      bio: t.bio || "Formateur expert chez JC Academy.",
    };
  });
}

async function loadArticles() {
  const { data, error } = await supabase.from("articles").select("id, tag, title, excerpt, author, published_at, image_url").order("published_at", { ascending: false });
  if (error) return [];
  return data.map((a, i) => ({
    id: a.id,
    tag: a.tag,
    title: a.title,
    excerpt: a.excerpt,
    author: a.author,
    date: new Date(a.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    color: (i % 6) + 1,
    image: a.image_url || "",
  }));
}

async function loadNews() {
  const { data, error } = await supabase.from("news").select("id, title, excerpt, image_url, published_at").order("published_at", { ascending: false });
  if (error) return [];
  return data.map((n) => ({
    id: n.id,
    title: n.title,
    excerpt: n.excerpt,
    image: n.image_url || "",
    date: new Date(n.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
  }));
}

async function loadGallery() {
  const { data, error } = await supabase.from("gallery").select("id, title, description, image_url").order("position");
  if (error) return [];
  return data.map((g, i) => ({ title: g.title, desc: g.description, image: g.image_url || "", color: (i % 6) + 1 }));
}

async function loadTestimonials(root) {
  const track = root.querySelector("#testiTrack");
  const section = root.querySelector("#testimonialsSection");
  if (!track || !section) return;

  const { data } = await supabase
    .from("reviews")
    .select("*, student:profiles(full_name), course:courses(title)")
    .gte("rating", 4)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!data || !data.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";
  track.innerHTML = data
    .map(
      (r, idx) => `
    <div class="testimonial-card">
      <div class="stars">${renderStarsHTML(r.rating)}</div>
      <p class="quote">« ${escapeHtml(r.comment || "")} »</p>
      <div class="testimonial-who">
        <div class="avatar" style="background:${palette[idx % palette.length]}">${initials(r.student ? r.student.full_name : "?")}</div>
        <div><b>${escapeHtml(r.student ? r.student.full_name : "Étudiant")}</b><span>${escapeHtml(r.course ? r.course.title : "")}</span></div>
      </div>
    </div>`
    )
    .join("");
}

// ===================== Rendu HTML (identique au prototype) =====================

function renderHomeHTML({ content, exchangeRate, featured, instructors, articles, news, gallery, wishlistIds }) {
  return `
  <section class="hero">
    <div class="container hero-grid">
      <div>
        <div class="eyebrow">${content.heroEyebrow}</div>
        <h1>${content.heroTitle} <span class="accent">${content.heroTitleAccent}</span></h1>
        <p class="lead">${content.heroLead}</p>
        <div class="hero-ctas">
          <button class="btn btn-primary" data-nav="/cours.html">Découvrir les cours</button>
          <button class="btn btn-gold" data-nav="/cours.html?gratuit=1">Apprenez gratuitement</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="peak">
          <svg viewBox="0 0 400 400" style="width:100%;height:100%;">
            <polygon points="200,30 370,340 30,340" fill="#0C2C74"/>
            <polygon points="290,150 370,340 210,340" fill="#F5A800"/>
            <circle cx="200" cy="230" r="80" fill="none" stroke="#fff" stroke-width="14"/>
          </svg>
          <div class="peak-card" style="top:6%;left:-6%;"><span style="width:34px;height:34px;border-radius:50%;background:#E4F7EE;color:#1D9A6C;display:flex;align-items:center;justify-content:center;"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M20 6 9 17l-5-5"/></svg></span> Certificat délivré</div>
          <div class="peak-card" style="bottom:8%;right:-8%;"><span style="width:34px;height:34px;border-radius:50%;background:#E7ECF7;color:#0C2C74;display:flex;align-items:center;justify-content:center;"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/></svg></span> Programme diplôme</div>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <div class="tag-label">Nos programmes</div>
          <h2>Deux parcours, un même objectif : votre réussite</h2>
        </div>
        <button class="btn btn-outline" data-nav="/cours.html">Voir tous les programmes</button>
      </div>
      <div class="program-cards">
        <div class="program-card cert">
          <div class="program-icon"></div>
          <div>
            <h3>Programme Certificat</h3>
            <p>Des formations courtes et ciblées pour acquérir une compétence précise et obtenir un certificat reconnu en quelques semaines.</p>
          </div>
          <button class="btn btn-gold btn-sm" style="align-self:flex-start;" data-nav="/cours.html?categorie=certificat">Explorer &rarr;</button>
        </div>
        <div class="program-card diplome">
          <div class="program-icon"></div>
          <div>
            <h3>Programme Diplôme</h3>
            <p>Des cursus complets et approfondis, encadrés par des experts, menant à un diplôme valorisant votre parcours professionnel.</p>
          </div>
          <button class="btn btn-primary btn-sm" style="align-self:flex-start;background:var(--navy-dark);" data-nav="/cours.html?categorie=diplome">Explorer &rarr;</button>
        </div>
      </div>
    </div>
  </section>

  ${
    featured.length
      ? `
  <section class="section section-alt">
    <div class="container">
      <div class="section-head">
        <div>
          <div class="tag-label">Catalogue</div>
          <h2>Aperçu de nos cours</h2>
          <p>Un extrait de nos formations les plus suivies, gratuites et payantes.</p>
        </div>
        <button class="btn btn-outline" data-nav="/cours.html">Voir tous les cours</button>
      </div>
      <div class="course-grid">
        ${featured.map((c) => courseCardHTML(c, wishlistIds, exchangeRate)).join("")}
      </div>
    </div>
  </section>
  `
      : ""
  }

  <section class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <div class="tag-label">Nos formateurs</div>
          <h2>Apprenez auprès d'experts reconnus</h2>
        </div>
      </div>
      <div class="carousel-wrap">
        <div class="carousel-track" id="instructorTrack">
          ${instructors
            .map(
              (i, idx) => `
          <div class="instructor-card">
            <div class="avatar" style="background:${palette[idx % palette.length]}">${i.init}</div>
            <h4>${escapeHtml(i.name)}</h4>
            <div class="role">${escapeHtml(i.role)}</div>
            <p>${escapeHtml(i.bio)}</p>
          </div>`
            )
            .join("")}
        </div>
        <div class="carousel-nav">
          <button data-carousel="instructorTrack" data-dir="-1">&#8592;</button>
          <button data-carousel="instructorTrack" data-dir="1">&#8594;</button>
        </div>
      </div>
    </div>
  </section>

  <section class="section section-alt" id="testimonialsSection" style="display:none;">
    <div class="container">
      <div class="section-head">
        <div>
          <div class="tag-label">Témoignages</div>
          <h2>Ce que disent nos étudiants</h2>
        </div>
      </div>
      <div class="carousel-wrap">
        <div class="carousel-track" id="testiTrack"></div>
        <div class="carousel-nav">
          <button data-carousel="testiTrack" data-dir="-1">&#8592;</button>
          <button data-carousel="testiTrack" data-dir="1">&#8594;</button>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <div class="tag-label">Actualités</div>
          <h2>Les dernières nouvelles de JC Academy</h2>
        </div>
      </div>
      <div class="news-grid">
        ${news
          .map(
            (n) => `
        <a href="/actualites/${n.id}" class="news-card" style="display:block;cursor:pointer;">
          <div class="news-thumb" style="${n.image ? `background-image:url('${n.image}');background-size:cover;background-position:center;` : ""}">${n.image ? "" : '<div class="tri"></div>'}</div>
          <div class="news-body">
            <div class="news-date">${n.date}</div>
            <h4>${escapeHtml(n.title)}</h4>
            <p>${escapeHtml(n.excerpt)}</p>
          </div>
        </a>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container">
      <div class="section-head">
        <div>
          <div class="tag-label">Galerie</div>
          <h2>Notre plateforme en images</h2>
        </div>
      </div>
      <div class="gallery-slideshow" id="gallerySlideshow">
        ${gallery
          .map(
            (g, idx) => `
          <div class="gallery-slide ${idx === 0 ? "active" : ""}" data-idx="${idx}" style="${g.image ? `background-image:url('${g.image}');background-size:cover;background-position:center;` : `background:linear-gradient(135deg, ${palette[g.color % palette.length]} 0%, var(--navy-dark) 100%);`}">
            <div class="cap"><h4>${escapeHtml(g.title)}</h4><p>${escapeHtml(g.desc)}</p></div>
          </div>`
          )
          .join("")}
        <button class="gallery-arrow left" data-gallery-move="-1">&#8592;</button>
        <button class="gallery-arrow right" data-gallery-move="1">&#8594;</button>
        <div class="gallery-nav">
          ${gallery.map((g, idx) => `<button class="gallery-dot ${idx === 0 ? "active" : ""}" data-gallery-set="${idx}"></button>`).join("")}
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-head">
        <div>
          <div class="tag-label">Blog</div>
          <h2>Articles &amp; conseils</h2>
          <p>Des ressources pour vous aider à progresser dans votre apprentissage et votre carrière.</p>
        </div>
      </div>
      <div class="article-grid">
        ${articles
          .map(
            (a) => `
        <a href="/articles/${a.id}" class="article-card">
          <div class="article-thumb" style="${a.image ? `background-image:url('${a.image}');background-size:cover;background-position:center;` : `background:linear-gradient(135deg, ${palette[a.color % palette.length]} 0%, var(--navy-dark) 100%);`}"></div>
          <div class="article-body">
            <span class="article-tag">${a.tag}</span>
            <h4>${escapeHtml(a.title)}</h4>
            <p>${escapeHtml(a.excerpt)}</p>
            <div class="article-meta"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> ${escapeHtml(a.author)} · ${a.date}</div>
          </div>
        </a>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container">
      <div class="cta-banner">
        <h2>Prêt à faire progresser votre carrière ?</h2>
        <p>Rejoignez des milliers d'étudiants et commencez votre formation dès aujourd'hui.</p>
        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-gold" data-spa-link href="/inscription">S'inscrire maintenant</button>
          <button class="btn btn-outline-white" data-nav="/cours.html">Voir les cours</button>
        </div>
      </div>
    </div>
  </section>
  `;
}

// ===================== Interactions (carousel / galerie) =====================

function wireCarousel(root, trackId) {
  root.querySelectorAll(`[data-carousel="${trackId}"]`).forEach((button) => {
    button.addEventListener("click", () => {
      const track = root.querySelector(`#${trackId}`);
      const dir = Number(button.getAttribute("data-dir"));
      track?.scrollBy({ left: dir * 260, behavior: "smooth" });
    });
  });
}

function wireGallery(root) {
  const wrap = root.querySelector("#gallerySlideshow");
  if (!wrap) return;
  const slides = wrap.querySelectorAll(".gallery-slide");
  const dots = wrap.querySelectorAll(".gallery-dot");
  if (!slides.length) return;

  let index = 0;
  function setIndex(i) {
    index = i;
    slides.forEach((el, idx) => el.classList.toggle("active", idx === index));
    dots.forEach((el, idx) => el.classList.toggle("active", idx === index));
  }
  function move(dir) {
    setIndex((index + dir + slides.length) % slides.length);
  }

  wrap.querySelector('[data-gallery-move="-1"]')?.addEventListener("click", () => move(-1));
  wrap.querySelector('[data-gallery-move="1"]')?.addEventListener("click", () => move(1));
  dots.forEach((dot, idx) => dot.addEventListener("click", () => setIndex(idx)));

  const timer = setInterval(() => {
    if (!document.body.contains(wrap)) {
      clearInterval(timer);
      return;
    }
    move(1);
  }, 5000);
}
