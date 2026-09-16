// assets/js/shared/site-content.js
//
// Reprend l'objet SITE_CONTENT du prototype tel quel comme valeurs par
// défaut (donc le site reste fonctionnel même si la table site_content
// est vide), puis les écrase avec ce qui est réellement en base — pour
// que l'admin (§17, à venir) puisse un jour éditer ces textes sans
// toucher au code.

import { supabase } from "./supabase-client.js";
import { DEFAULT_EXCHANGE_RATE } from "./format.js";

const DEFAULTS = {
  motto: "Learn. Lead. Inspire",
  heroEyebrow: "Plateforme de formation certifiante",
  heroTitle: "Apprenez de nouvelles compétences,",
  heroTitleAccent: "obtenez une certification reconnue.",
  heroLead:
    "JC Academy vous accompagne du premier module jusqu'à votre certificat, avec des formateurs experts, des projets concrets et un parcours pensé pour votre réussite.",
  footerAbout:
    "JC Academy est une plateforme de formation en ligne certifiante qui vous aide à apprendre de nouvelles compétences, obtenir des certifications reconnues et faire progresser votre carrière.",
  aboutMission:
    "JC Academy est née d'une conviction simple : une formation de qualité et une certification reconnue doivent être accessibles à tous, partout. Nous accompagnons nos apprenants vers de nouvelles compétences, de nouveaux diplômes et de nouvelles opportunités de carrière.",
  contactPhone: "+509 42 75 5464",
  contactPhone2: "+509 55 26 2356",
  contactAddress: "Port-au-Prince, Haïti",
  contactEmail: "contact@jcacademy.com",
  contactHours: "Lundi – Vendredi, 8h à 18h",
};

const KEY_MAP = {
  motto: "motto",
  hero_eyebrow: "heroEyebrow",
  hero_title: "heroTitle",
  hero_title_accent: "heroTitleAccent",
  hero_lead: "heroLead",
  footer_about: "footerAbout",
  about_mission: "aboutMission",
  contact_phone: "contactPhone",
  contact_phone2: "contactPhone2",
  contact_address: "contactAddress",
  contact_email: "contactEmail",
  contact_hours: "contactHours",
};

/** @returns {Promise<{content: typeof DEFAULTS, exchangeRate: number}>} */
export async function getSiteContent() {
  const content = { ...DEFAULTS };
  let exchangeRate = DEFAULT_EXCHANGE_RATE;

  const { data: rows } = await supabase.from("site_content").select("key, value");
  if (rows) {
    rows.forEach((row) => {
      if (KEY_MAP[row.key]) content[KEY_MAP[row.key]] = row.value;
    });
    const rateRow = rows.find((r) => r.key === "exchange_rate_htg_per_usd");
    if (rateRow && !isNaN(parseFloat(rateRow.value))) exchangeRate = parseFloat(rateRow.value);
  }

  return { content, exchangeRate };
}
