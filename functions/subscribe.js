/**
 * Cloudflare Pages Function: /subscribe
 * Accepts POST { email, source } from site.js
 * Forwards to beehiiv API (free tier handles subscriber creation)
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   BEEHIIV_API_KEY  — beehiiv API key (Settings → API Keys)
 *   BEEHIIV_PUB_ID   — beehiiv Publication ID (from your publication URL)
 *
 * If env vars are not set, returns 200 anyway (fail-open) so UX is never broken.
 */
export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false, error: "invalid email" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const apiKey = env.BEEHIIV_API_KEY;
  const pubId  = env.BEEHIIV_PUB_ID;

  // Fail-open: if not configured, return 200 so UX works before beehiiv is set up
  if (!apiKey || !pubId) {
    return new Response(JSON.stringify({ ok: true, note: "not configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const tags = buildTags(body);

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: false,
          utm_source: "nis2-eszkozok.hu",
          utm_medium: "email-gate",
          utm_campaign: body.source || "inline",
          tags: [...tags, "seq_started"],
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    const ok = res.status === 200 || res.status === 201;

    // Send sequence email 0 immediately via Resend
    if (ok && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      const tier = tags.find(t => t === "score_low") ? "A"
                 : tags.find(t => t === "score_high") ? "C" : "B";
      await sendSequenceEmail0(email, tier, env).catch(() => {});
    }

    return new Response(JSON.stringify({ ok, status: res.status, data }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    // Network error — still return 200 so UX isn't broken
    return new Response(JSON.stringify({ ok: true, note: "upstream error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

// Build Beehiiv tags from quiz answers for segmented email sequences
function buildTags(body) {
  const tags = [];
  const qa   = body.quiz_answers || {};
  const score = Number(qa.score) || 0;

  // Score tier — drives which nurture sequence subscriber receives
  if (score <= 3)      tags.push("score_low");
  else if (score <= 6) tags.push("score_mid");
  else                 tags.push("score_high");

  // Sector
  if (qa.sector) tags.push("sector_" + qa.sector);

  // Role
  if (qa.role)   tags.push("role_" + qa.role);

  // Missing items — used for personalised email subject lines + content
  if (qa.registered === "no" || qa.registered === "unknown") tags.push("missing_registration");
  if (qa.has_isms === "no" || qa.has_isms === "partial")      tags.push("missing_isms");
  if (qa.has_training === "no")                               tags.push("missing_training");
  if (qa.has_insurance === "no" || qa.has_insurance === "unknown") tags.push("missing_insurance");

  // Source tag
  if (body.source) tags.push("source_" + body.source.replace(/[^a-z0-9_]/gi, "_"));

  return tags.filter(Boolean);
}

// Immediate sequence email — sent the moment someone subscribes
async function sendSequenceEmail0(email, tier, env) {
  const EMAILS = {"A": {"subject": "NIS2 cselekvési terved — 3 nap, 3 lépés", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Épp elvégezted a NIS2 kvízt — az eredményed azt mutatja, hogy még sok a teendő a határidő előtt.<br><br><strong>A jó hír:</strong> A hasonló helyzetben lévő cégek 60–90 nap alatt elérik a megfelelőséget, ha a megfelelő lépésekkel kezdik.</p><h3 style=\"font-family:sans-serif;color:#1e3a5f;\">A te 3 napos indulóterved:</h3><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>1. nap (30 perc) — Ellenőrizd a KSC-státuszt:</strong><br><a href=\"https://nis2-eszkozok.hu/kalkulator.html\" style=\"color:#1e3a5f;\">Nézd meg, hogy a céged érintett-e a KSC által →</a><br><br><strong>2. nap (20 perc) — Indítsd el az ingyenes ISMS-t:</strong><br><a href=\"https://nis2-eszkozok.hu/eszkozok/isms-online.html\" style=\"color:#1e3a5f;\">ISMS.online — ingyenes csomag 25 főig →</a><br><br><strong>3. nap (30 perc) — Képezd a vezetőséget:</strong><br><a href=\"https://nis2-eszkozok.hu/nis2-kepzes.html\" style=\"color:#1e3a5f;\">NIS2 képzési lehetőségek →</a><br><br><a href=\"https://nis2-eszkozok.hu/#tracker-section\" style=\"color:#1e3a5f;\">Kövesd nyomon a haladásodat a NIS2 trackerben →</a></p>"}, "B": {"subject": "NIS2 eredményed: jó alap — így érheted el a 100%-ot", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Megvan az NIS2 alapja — ez jó jel. Mindössze 2–3 elem hiányzik, amelyeket a felügyeleti hatóság a leggyakrabban ellenőriz.</p><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>Penetrációs tesztelés (21. cikk (2)(f)):</strong><br><a href=\"https://nis2-eszkozok.hu/behatolasi-tesztek.html\" style=\"color:#1e3a5f;\">Útmutató a behatolási tesztekhez →</a><br><br><strong>MFA kiemelt jogosultságú fiókokhoz (21. cikk (2)(i)):</strong><br><a href=\"https://nis2-eszkozok.hu/eszkozok/1password.html\" style=\"color:#1e3a5f;\">1Password Business — MFA + jelszókezelő →</a><br><br><strong>Ellátási lánc biztonsága (21. cikk (2)(d)):</strong><br><a href=\"https://nis2-eszkozok.hu/ellatasi-lanc-biztonsag.html\" style=\"color:#1e3a5f;\">Beszállítói biztonság útmutató →</a><br><br><a href=\"https://nis2-eszkozok.hu/#tracker-section\" style=\"color:#1e3a5f;\">Jelöld meg a haladást a NIS2 trackerben →</a></p>"}, "C": {"subject": "Kiváló NIS2 eredmény — itt az utolsó lépés", "html": "<p style=\"font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;\">Magas szintű NIS2 felkészültség — valóban jó eredmény. Egy nyitott pont maradt: a formális külső validáció.</p><p style=\"font-family:sans-serif;font-size:15px;line-height:1.7;color:#111;\"><strong>Penetrációs teszt</strong> — a védelmi intézkedések hatékonyságának igazolása (21. cikk (2)(f)):<br><a href=\"https://nis2-eszkozok.hu/behatolasi-tesztek.html\" style=\"color:#1e3a5f;\">Behatolási teszt útmutató →</a><br><br><strong>ISO 27001 tanúsítás</strong> — a teljes ISMS külső hitelesítése:<br><a href=\"https://nis2-eszkozok.hu/iso-27001-tanusitas.html\" style=\"color:#1e3a5f;\">ISO 27001 tanúsítási útmutató →</a><br><br><a href=\"https://nis2-eszkozok.hu/#tracker-section\" style=\"color:#1e3a5f;\">Ellenőrizd az utolsó checkboxokat →</a></p>"}};

  const msg = EMAILS[tier] || EMAILS["B"];
  const footer = `<hr style="margin:2rem 0;border:none;border-top:1px solid #e5e7eb;">
<p style="font-family:sans-serif;font-size:12px;color:#9ca3af;">
  NIS2-Eszkozok.hu &nbsp;|&nbsp;
  <a href="https://nis2-eszkozok.hu/unsubscribe?email=${encodeURIComponent(email)}" style="color:#9ca3af;">Wypisz się</a>
</p>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      subject: msg.subject,
      html: msg.html + footer,
    }),
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
