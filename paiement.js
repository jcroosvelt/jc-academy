// assets/js/paiement/paiement.js
//
// CORRECTION DE LA FAILLE CRITIQUE #1 DE L'AUDIT :
// L'ancien prototype faisait, DEPUIS CE FICHIER (le navigateur) :
//   sb.from('payments').insert({ ..., status: 'paye' })
//   sb.from('enrollments').upsert({ ... })
// —> n'importe qui pouvait donc s'auto-attribuer un cours/produit payé
// sans jamais avoir payé, en modifiant simplement le JS dans la console.
//
// Ici, ce fichier ne fait QUE demander au serveur (Edge Function
// "checkout") de préparer le paiement. Il n'insère RIEN directement dans
// "payments" ou "enrollments", et n'envoie jamais de statut "payé" :
// le serveur recalcule le prix, et seul le webhook (voir
// supabase/functions/payment-webhook/) peut confirmer un paiement.
//
// Design repris à l'identique de renderCheckout() / renderProductCheckout()
// du prototype (mêmes classes CSS : checkout-grid, pay-method, field,
// order-summary). Différence assumée : les champs "numéro de carte /
// CVV" du prototype ont été retirés — les saisir nous-mêmes recréerait
// exactement le problème de confiance que cette migration corrige (ces
// informations doivent être saisies chez le fournisseur de paiement,
// jamais transiter par notre propre serveur). À rebrancher une fois un
// vrai fournisseur choisi (§11 du cahier des charges, actuellement un stub).

import { supabase } from "./supabase-client.js";
import { getSiteContent } from "./site-content.js";
import { fmtHTG, fmtUSD, escapeHtml } from "./format.js";

const params = new URLSearchParams(window.location.search);
const itemType = params.get("type"); // "course" | "product"
const itemId = params.get("id");

const paymentState = { currency: "htg", method: "moncash" };

async function initCheckout() {
  const root = document.getElementById("page-root");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.replace("/connexion?redirect=" + encodeURIComponent(window.location.pathname + window.location.search));
    return;
  }

  if (!itemType || !itemId || !["course", "product"].includes(itemType)) {
    root.innerHTML = `<p>Paiement invalide.</p>`;
    return;
  }

  const [{ item, error: itemError }, { exchangeRate }] = await Promise.all([loadItem(), getSiteContent()]);

  if (itemError || !item) {
    root.innerHTML = `<p>Cet article est introuvable ou n'est plus disponible.</p>`;
    return;
  }

  const free = Number(item.price_usd) === 0;

  render(root, { session, item, exchangeRate, free });
}

async function loadItem() {
  if (itemType === "course") {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, price_usd, duration_text, instructor:profiles(full_name)")
      .eq("id", itemId)
      .eq("status", "publie")
      .single();
    return { item: data && { ...data, instructorName: data.instructor?.full_name }, error };
  }
  const { data, error } = await supabase
    .from("products")
    .select("id, title, price_usd, tagline")
    .eq("id", itemId)
    .eq("status", "publie")
    .single();
  return { item: data, error };
}

function render(root, { session, item, exchangeRate, free }) {
  const currency = paymentState.currency;
  const price = Number(item.price_usd);

  root.innerHTML = `
  <div class="container" style="padding:44px 24px 70px;">
    <h1 style="font-size:26px;margin:14px 0 28px;">${free ? "Obtenir cet article" : "Paiement sécurisé"}</h1>
    <div class="checkout-grid">
      <div>
        ${
          !free
            ? `
        <h3 style="font-size:16px;margin-bottom:10px;">Choisissez une devise</h3>
        <div class="pay-method" style="margin-bottom:6px;">
          <button data-currency="htg" class="${currency === "htg" ? "active" : ""}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="7" fill="#00209F"/><rect x="2" y="11" width="20" height="7" fill="#D21034"/></svg> Payer en Gourdes (HTG)</button>
          <button data-currency="usd" class="${currency === "usd" ? "active" : ""}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M9.5 15c.5 1 1.5 1.5 2.7 1.5 1.6 0 2.8-.9 2.8-2.1 0-1.4-1.2-1.9-2.9-2.3-1.7-.4-2.9-.9-2.9-2.3 0-1.2 1.2-2.1 2.8-2.1 1.2 0 2.2.5 2.7 1.5"/><path d="M12 6.5v11"/></svg> Payer en Dollars (USD)</button>
        </div>
        <p class="small-muted" style="margin-bottom:22px;">Taux indicatif : 1 $ USD ≈ ${exchangeRate} HTG</p>

        <h3 style="font-size:16px;">Mode de paiement</h3>
        <div class="pay-method">
          ${
            currency === "htg"
              ? `
            <button data-method="moncash" class="${paymentState.method === "moncash" ? "active" : ""}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M5 4h4l1.5 5-2.5 1.5a12 12 0 0 0 6 6l1.5-2.5 5 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg> MonCash</button>
            <button data-method="natcash" class="${paymentState.method === "natcash" ? "active" : ""}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M5 4h4l1.5 5-2.5 1.5a12 12 0 0 0 6 6l1.5-2.5 5 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg> NatCash</button>
          `
              : `
            <button data-method="card" class="${paymentState.method === "card" ? "active" : ""}"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> Carte bancaire</button>
            <button data-method="paypal" class="${paymentState.method === "paypal" ? "active" : ""}">🅿 PayPal</button>
          `
          }
        </div>

        ${paymentState.method === "moncash" ? `<p class="small-muted" style="margin:14px 0;">Vous recevrez une invite MonCash sur votre téléphone pour confirmer le paiement.</p>` : ""}
        ${paymentState.method === "natcash" ? `<p class="small-muted" style="margin:14px 0;">Vous recevrez une invite NatCash sur votre téléphone pour confirmer le paiement.</p>` : ""}
        ${paymentState.method === "card" ? `<p class="small-muted" style="margin:14px 0;">Vous serez redirigé vers notre prestataire de paiement pour saisir vos informations bancaires en toute sécurité.</p>` : ""}
        ${paymentState.method === "paypal" ? `<p class="small-muted" style="margin:14px 0;">Vous serez redirigé vers PayPal pour finaliser votre paiement en toute sécurité.</p>` : ""}
        `
            : `<p class="small-muted" style="margin-bottom:22px;">Cet article est gratuit — aucun paiement n'est nécessaire.</p>`
        }
        <div class="field"><label>E-mail de facturation</label><input type="email" value="${session.user.email}" disabled></div>
        <button class="btn btn-primary btn-block" id="checkoutSubmit">${free ? "Obtenir gratuitement" : "Payer " + (currency === "htg" ? fmtHTG(price, exchangeRate) : fmtUSD(price))}</button>
        <p id="checkoutError" class="hidden" style="color:var(--danger, #B23B3B);margin-top:10px;"></p>
        ${
          !free
            ? `<p class="small-muted" style="text-align:center;margin-top:10px;"><svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Paiement chiffré et sécurisé.</p>`
            : ""
        }
      </div>
      <div class="order-summary">
        <h4 style="margin-top:0;">Récapitulatif</h4>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <div><b style="font-size:13.5px;">${escapeHtml(item.title)}</b>${item.instructorName || item.tagline ? `<div class="small-muted">${item.instructorName ? escapeHtml(item.instructorName) + (item.duration_text ? " · " + escapeHtml(item.duration_text) : "") : escapeHtml(item.tagline)}</div>` : ""}</div>
        </div>
        <div class="order-row"><span>Prix</span><span>${fmtUSD(price)} · ${fmtHTG(price, exchangeRate)}</span></div>
        <div class="order-row total"><span>Total${!free ? ` (${currency.toUpperCase()})` : ""}</span><span>${free ? "Gratuit" : currency === "htg" ? fmtHTG(price, exchangeRate) : fmtUSD(price)}</span></div>
      </div>
    </div>
  </div>
  `;

  root.querySelectorAll("[data-currency]").forEach((btn) =>
    btn.addEventListener("click", () => {
      paymentState.currency = btn.getAttribute("data-currency");
      paymentState.method = paymentState.currency === "htg" ? "moncash" : "card";
      render(root, { session, item, exchangeRate, free });
    })
  );
  root.querySelectorAll("[data-method]").forEach((btn) =>
    btn.addEventListener("click", () => {
      paymentState.method = btn.getAttribute("data-method");
      render(root, { session, item, exchangeRate, free });
    })
  );

  root.querySelector("#checkoutSubmit").addEventListener("click", () => submitCheckout(root, session));
}

async function submitCheckout(root, session) {
  const button = root.querySelector("#checkoutSubmit");
  const errorBox = root.querySelector("#checkoutError");
  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = "Traitement…";

  try {
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ itemType, itemId, currency: paymentState.currency, method: paymentState.method }),
    });

    const result = await response.json();

    if (!response.ok) {
      errorBox.textContent = result.error || "Erreur lors du paiement.";
      errorBox.classList.remove("hidden");
      button.disabled = false;
      button.textContent = originalLabel;
      return;
    }

    if (result.free) {
      // Article gratuit : le serveur a déjà créé l'inscription. Rien à
      // attendre d'un fournisseur externe.
      root.innerHTML = `
        <div class="container" style="padding:70px 24px;text-align:center;">
          <h1 style="font-size:24px;">C'est fait !</h1>
          <p class="small-muted">Vous avez maintenant accès à cet article.</p>
          <a href="/tableau-de-bord.html" class="btn btn-primary" style="margin-top:20px;display:inline-block;">Aller à mon tableau de bord</a>
        </div>`;
      return;
    }

    // Le serveur a créé une transaction "pending" et renvoie l'URL du
    // fournisseur de paiement — c'est LUI qui décidera, via son webhook,
    // si le paiement est vraiment passé (voir payment-webhook/index.ts).
    window.location.href = result.redirectUrl;
  } catch (err) {
    errorBox.textContent = "Une erreur réseau est survenue. Réessayez.";
    errorBox.classList.remove("hidden");
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

initCheckout();
