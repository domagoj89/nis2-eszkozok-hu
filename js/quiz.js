/* KSC/NIS2 Compliance Quiz v2 — quiz.js */

(function () {
  "use strict";

  const REPORT_ENDPOINT    = "/generate-report";
  const SUBSCRIBE_ENDPOINT = "/subscribe";

  // ── Affiliate + tool links ──────────────────────────────────────────────────
  const LINKS = {
    reglyze:      { name: "Reglyze",      url: "https://reglyze.com",         review: "narzedzia/reglyze.html" },
    secfix:       { name: "Secfix",       url: "https://secfix.com",          review: "narzedzia/secfix.html" },
    isms_online:  { name: "ISMS.online",  url: "https://isms.online",         review: "narzedzia/isms-online.html" },
    knowbe4:      { name: "KnowBe4",      url: "https://knowbe4.com",         review: "nis2-kepzes.html" },
    hiscox:       { name: "Hiscox Cyber", url: "https://hiscox.com",          review: "cyber-biztositas.html" },
    onepassword:  { name: "1Password",    url: "https://1password.com",       review: "narzedzia/1password.html" },
    nordlayer:    { name: "NordLayer",    url: "https://nordlayer.com",       review: "narzedzia/nordlayer.html" },
    cobalt:       { name: "Cobalt.io",    url: "https://cobalt.io",           review: "behatolasi-tesztek.html" },
    bsi:          { name: "BSI ISO 27001",url: "https://bsigroup.com/hu-HU/", review: "iso-27001-tanusitas.html" },
  };

  // ── Tool recommendation by sector + budget ─────────────────────────────────
  const ISMS_RECS = {
    "annex1:free":  "reglyze",   "annex1:low":   "isms_online",
    "annex1:mid":   "secfix",    "annex1:high":  "secfix",
    "annex2:free":  "reglyze",   "annex2:low":   "reglyze",
    "annex2:mid":   "isms_online","annex2:high":  "secfix",
    "other:free":   "reglyze",   "other:low":    "reglyze",
    "other:mid":    "reglyze",   "other:high":   "isms_online",
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    step: 0,
    answers: {},
    score: 0,
    missing: [],
    email: null,
  };

  // ── Questions ──────────────────────────────────────────────────────────────
  const questions = [
    {
      id: "sector",
      title: "Melyik szektorban működik a vállalkozása?",
      hint: "Válassza ki azt a szektort, amely legjobban leírja a fő tevékenységet.",
      options: [
        { value: "annex1", icon: "⚡", label: "Kulcsfontosságú szektor (Annexe I)",
          sub: "Energia, közlekedés, bankszektor, pénzügy, egészségügy, víz, digitális infrastruktúra, közigazgatás" },
        { value: "annex2", icon: "📦", label: "Fontos szektor (Annexe II)",
          sub: "Posta, hulladékgazdálkodás, vegyipar, élelmiszer, ipari gyártás, digitálisszolgáltatók, kkv/IT" },
        { value: "other", icon: "🏗️", label: "Egyéb szektor",
          sub: "Építőipar, kiskereskedelem, vendéglátás, magánoktatás, egyéb" },
      ]
    },
    {
      id: "size",
      title: "Hány főt foglalkoztat a vállalkozása?",
      hint: "Az összes munkavállalót és közreműködőt beleszámítva.",
      options: [
        { value: "micro",  icon: "👤", label: "50 főnél kevesebb alkalmazott",  sub: "Mikro / kisvállalkozás" },
        { value: "medium", icon: "👥", label: "50–249 alkalmazott",              sub: "Középvállalkozás" },
        { value: "large",  icon: "🏢", label: "250 vagy több alkalmazott",       sub: "Nagyvállalkozás" },
      ]
    },
    {
      id: "revenue",
      title: "Mekkora a vállalkozása éves árbevétele?",
      hint: "Éves bevétel vagy mérlegfőösszeg.",
      options: [
        { value: "small",  icon: "💶", label: "10 millió EUR alatt évente",  sub: "Mikro / kisvállalkozás" },
        { value: "medium", icon: "💰", label: "10–50 millió EUR évente",     sub: "Középvállalkozás" },
        { value: "large",  icon: "💎", label: "50 millió EUR felett évente", sub: "Nagyvállalkozás" },
      ]
    },
    {
      id: "budget",
      title: "Mekkora éves kerettel rendelkezik a NIS2 megfelelésre?",
      hint: "Az eszközöket az Ön pénzügyi lehetőségeihez igazítjuk.",
      options: [
        { value: "free", icon: "🆓", label: "Ingyenes megoldást keresek",        sub: "Ingyenes csomag vagy egyszeri bevezetési költség" },
        { value: "low",  icon: "💵", label: "Évi 60 000 HUF-ig (~200 EUR)",      sub: "Alapszintű SaaS eszköz" },
        { value: "mid",  icon: "💳", label: "Évi 60 000–360 000 HUF",            sub: "Teljes körű megfelelési platform" },
        { value: "high", icon: "🏦", label: "Évi 360 000 HUF felett",            sub: "Vállalati szintű megoldás" },
      ]
    },
    {
      id: "registered",
      title: "Regisztrálva van-e már a vállalkozása a kiberbiztonsági törvény nyilvántartásában?",
      hint: "Regisztrációs határidő: a magyar NIS2 átültetés szerint. Ez az első kötelezettség.",
      options: [
        { value: "yes",  icon: "✅", label: "Igen, már regisztráltunk",            sub: "Az önbeazonosítás megtörtént" },
        { value: "no",   icon: "❌", label: "Nem, még nem tettük meg",             sub: "1. prioritás — határidő: a magyar NIS2 átültetés szerint" },
        { value: "unknown", icon: "❓", label: "Nem tudom / nem vagyok biztos",    sub: "Ezt együtt megvizsgáljuk" },
      ]
    },
    {
      id: "has_isms",
      title: "Rendelkezik-e bevezetett információbiztonsági irányítási rendszerrel (ISMS)?",
      hint: "Az ISMS kiberbiztonságipolitikák, eljárások és kontrollok összessége — az Art. 21 NIS2 szerint kötelező.",
      options: [
        { value: "yes",     icon: "✅", label: "Igen, működő ISMS-ünk van",             sub: "Dokumentált biztonsági politikák és eljárások" },
        { value: "partial", icon: "🔄", label: "Dolgozunk a bevezetésen",               sub: "Folyamatban van — de még nem fejeztük be" },
        { value: "no",      icon: "❌", label: "Nem, ezen a téren semmink sincs",       sub: "Nincs információbiztonsági irányítási rendszer" },
      ]
    },
    {
      id: "has_training",
      title: "Részt vett-e a személyzet és a vezetőség kiberbiztonsági képzésen?",
      hint: "A vezetőség képzése jogi kötelezettség az Art. 20 NIS2 alapján.",
      options: [
        { value: "yes", icon: "✅", label: "Igen, rendszeres képzéseink vannak",         sub: "A munkavállalók és a vezetőség képzett" },
        { value: "no",  icon: "❌", label: "Nem, nincs ilyen jellegű képzésünk",         sub: "A vezetőség képzése jogi kötelezettség a kiberbiztonsági törvény alapján" },
      ]
    },
    {
      id: "has_insurance",
      title: "Rendelkezik-e a vállalkozása kiberkockázati biztosítással?",
      hint: "A kiberbiztosítás átvállallja a maradványkockázatot, és a NIS2 kockázatkezelés részét képezi.",
      options: [
        { value: "yes",     icon: "✅", label: "Igen, van kiberbiztosításunk",              sub: "A kockázat fedezett" },
        { value: "no",      icon: "❌", label: "Nem, nincs biztosításunk",                  sub: "Az online árajánlat kérése 20 percet vesz igénybe" },
        { value: "unknown", icon: "❓", label: "Nem tudom / nem hallottam erről",           sub: "Megmagyarázzuk, mi ez és mennyibe kerül" },
      ]
    },
    {
      id: "role",
      title: "Milyen szerepet tölt be a vállalkozásnál?",
      hint: "A tervet az Ön feladataihoz és döntési jogköréhez igazítjuk.",
      options: [
        { value: "ceo",        icon: "👔", label: "Tulajdonos / CEO / Vezető testület", sub: "Ön felel a döntésekért és a költségvetésért" },
        { value: "it",         icon: "💻", label: "IT-vezető / CTO / CISO",             sub: "Ön felel a műszaki megvalósításért" },
        { value: "compliance", icon: "📋", label: "Megfelelési vezető / Jogász",        sub: "Ön felel a jogi megfelelésért" },
        { value: "cfo",        icon: "💰", label: "CFO / Pénzügyi igazgató",            sub: "Ön felel a költségvetésért és a pénzügyi kockázatért" },
      ]
    },
  ];

  const TOTAL = questions.length;

  // ── Score calculation ──────────────────────────────────────────────────────
  function computeScore() {
    const a = state.answers;
    let score = 2; // base: everyone has some basics
    const missing = [];

    if (a.registered === "yes")        { score += 2; }
    else                               { missing.push("registration"); }

    if (a.has_isms === "yes")          { score += 3; }
    else if (a.has_isms === "partial") { score += 1; missing.push("isms"); }
    else                               { missing.push("isms"); }

    if (a.has_training === "yes")      { score += 2; }
    else                               { missing.push("training"); }

    if (a.has_insurance === "yes")     { score += 1; }
    else                               { missing.push("insurance"); }

    score = Math.min(10, Math.max(1, score));
    state.score   = score;
    state.missing = missing;
    try { sessionStorage.setItem("nis2_quiz_gaps", JSON.stringify(missing)); } catch(e) {}
    return { score, missing };
  }

  function computeScope() {
    const { sector, size, revenue } = state.answers;
    if (sector === "other") return "out";
    const isLarge  = size === "large"  || revenue === "large";
    const isMedium = !isLarge && (size === "medium" || revenue === "medium");
    if (sector === "annex1" && isLarge)           return "essential";
    if (sector === "annex1" && isMedium)          return "important";
    if (sector === "annex2" && (isLarge||isMedium)) return "important";
    return "check"; // small companies in scope sectors
  }

  // ── Today actions (client-side, shown on result screen immediately) ────────
  function buildTodayActions() {
    const missing   = state.missing;
    const sector    = state.answers.sector  || "annex2";
    const budget    = state.answers.budget  || "low";
    const ismsTool  = LINKS[ISMS_RECS[sector+":"+budget] || "reglyze"];
    const actions   = [];

    if (missing.includes("registration")) {
      actions.push({
        step: actions.length + 1,
        time: "30 perc · ingyenes",
        title: "Regisztrálja vállalkozását a kiberbiztonsági törvény nyilvántartásába",
        desc:  "Határidő: a magyar NIS2 átültetés szerint. Online önbeazonosítási űrlap. Ez az 1. prioritása.",
        cta:   "Lépésről lépésre útmutató →",
        url:   "nis2-regisztracio.html",
        affiliate: false,
      });
    }

    if (missing.includes("isms")) {
      actions.push({
        step: actions.length + 1,
        time: "20 perc · ingyenes csomag",
        title: "Indítsa el az ISMS rendszert — " + ismsTool.name,
        desc:  "Az ingyenes csomag teljes NIS2 hiányelemzést fed le. Regisztráció után: töltse ki a beépített kiberbiztonsági kérdőívet — az AI automatikusan generálja a szabályzatokat.",
        cta:   "Kezdje el 0 EUR-ért → " + ismsTool.name,
        url:   ismsTool.url,
        affiliate: true,
        badge: "#1 Ajánlás",
      });
    }

    if (missing.includes("insurance")) {
      actions.push({
        step: actions.length + 1,
        time: "20 perc · online árajánlat",
        title: "Kérjen kiberbiztosítási ajánlatot",
        desc:  "A kockázatátruházás a NIS2 kockázatkezelés része. Hiscox ajánlat: 20 perc online, ügynökkel való egyeztetés nélkül.",
        cta:   "Tekintse meg a Hiscox ajánlatát →",
        url:   LINKS.hiscox.url,
        affiliate: true,
      });
    }

    if (missing.includes("training")) {
      actions.push({
        step: actions.length + 1,
        time: "30 perc · 14 napos ingyenes próbaidőszak",
        title: "Indítson kiberbiztonsági képzést — KnowBe4",
        desc:  "A vezetőség képzése jogi kötelezettség (Art. 20 NIS2). KnowBe4: online platform, az első modult 24 órán belül elküldi a csapatnak.",
        cta:   "Kezdje az ingyenes próbaidőszakot →",
        url:   LINKS.knowbe4.url,
        affiliate: true,
      });
    }

    // Always suggest 1Password if no training (implies basics missing)
    if (missing.includes("isms") && actions.length < 5) {
      actions.push({
        step: actions.length + 1,
        time: "30 perc · 14 napos ingyenes próbaidőszak",
        title: "Vezessen be jelszókezelőt + MFA-t — 1Password",
        desc:  "A többtényezős hitelesítés (MFA) az Art. 21(j) NIS2 alapján kötelező. 1Password Business: 30 perces beállítás, ugyanazon a napon bevezethető a csapatban.",
        cta:   "Kezdje az ingyenes próbaidőszakot →",
        url:   LINKS.onepassword.url,
        affiliate: true,
      });
    }

    return actions.slice(0, 4); // max 4 today actions
  }

  // ── GA4 helper ─────────────────────────────────────────────────────────────
  function track(event, params) {
    if (typeof gtag === "function") gtag("event", event, params || {});
  }

  // ── Render: question step ──────────────────────────────────────────────────
  function renderStep() {
    const q   = questions[state.step];
    const el  = document.getElementById("quiz-container");
    if (!el) return;

    const pct    = Math.round((state.step / TOTAL) * 100);
    const isLast = state.step === TOTAL - 1;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:${pct}%"></div>
        </div>
        <p class="text-sm text-gray" style="margin-bottom:.25rem;">${state.step + 1}. kérdés / ${TOTAL}</p>
        <h3>${q.title}</h3>
        <p style="color:var(--gray-500);font-size:.9rem;margin-bottom:1rem;">${q.hint}</p>
        <div class="quiz-options">
          ${q.options.map(opt => `
            <button class="quiz-option${state.answers[q.id] === opt.value ? " selected" : ""}"
                    data-value="${opt.value}" type="button">
              <span class="quiz-option__icon">${opt.icon}</span>
              <span>
                <span class="quiz-option__text">${opt.label}</span>
                <span class="quiz-option__sub">${opt.sub}</span>
              </span>
            </button>
          `).join("")}
        </div>
        <div class="quiz-nav">
          ${state.step > 0
            ? `<button class="btn btn--outline btn--sm" id="quiz-back">← Vissza</button>`
            : `<span></span>`}
          <button class="btn btn--primary btn--sm" id="quiz-next"
                  ${state.answers[q.id] ? "" : "disabled"}>
            ${isLast ? "Eredményem kiszámítása →" : "Tovább →"}
          </button>
        </div>
      </div>`;

    el.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", () => {
        state.answers[q.id] = btn.dataset.value;
        el.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        el.querySelector("#quiz-next").removeAttribute("disabled");
        track("quiz_answer", { question: q.id, answer: btn.dataset.value });
        // Auto-advance on click for faster UX
        setTimeout(() => {
          if (isLast) { computeScore(); renderScoreGate(); }
          else { state.step++; renderStep(); }
        }, 280);
      });
    });

    el.querySelector("#quiz-back")?.addEventListener("click", () => {
      state.step--;
      renderStep();
    });

    el.querySelector("#quiz-next")?.addEventListener("click", () => {
      if (!state.answers[q.id]) return;
      if (isLast) { computeScore(); renderScoreGate(); }
      else { state.step++; renderStep(); }
    });
  }

  // ── Render: score + email gate ─────────────────────────────────────────────
  function renderScoreGate() {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing } = state;
    const pct    = Math.round((score / 10) * 100);
    const scope  = computeScope();

    const scoreColor = score <= 3 ? "#dc2626"
                     : score <= 6 ? "#d97706"
                     : "#16a34a";

    const scopeMsg = {
      essential: "Vállalkozása <strong>kulcsfontosságú szervezet a kiberbiztonsági törvény szerint</strong> — a legmagasabb szintű követelmények vonatkoznak rá.",
      important:  "Vállalkozása <strong>fontos szervezet a kiberbiztonsági törvény szerint</strong> — teljesítenie kell a NIS2 követelményeket.",
      check:      "Vállalkozása esetleg a kiberbiztonsági törvény hatálya alá eshet — ellenőrizze a kisvállalkozásokra vonatkozó kivételeket.",
      out:        "Vállalkozása valószínűleg nem esik a kiberbiztonsági törvény hatálya alá — az alapok bevezetése azonban ajánlott.",
    }[scope] || "";

    const gapText = missing.length === 0
      ? "Gratulálunk — az összes kulcsfontosságú intézkedés be van vezetve!"
      : `<strong>${missing.length}</strong> kulcsfontosságú biztonsági intézkedés hiányzik. A legtöbbet 3 napon belül bevezetheti.`;

    el.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress">
          <div class="quiz-progress__bar" style="width:100%"></div>
        </div>

        <div style="text-align:center;padding:1rem 0 .5rem;">
          <div style="font-size:.8rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;">
            Az Ön NIS2 megfelelési pontszáma
          </div>
          <div style="font-size:3.5rem;font-weight:800;color:${scoreColor};line-height:1;">
            ${score}<span style="font-size:1.5rem;color:var(--gray-400);font-weight:500;">/10</span>
          </div>
          <div style="margin:.75rem auto;max-width:280px;height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;transition:width 1s;"></div>
          </div>
          <p style="font-size:.9rem;color:var(--gray-600);">${scopeMsg}</p>
          <p style="font-size:.92rem;">${gapText}</p>
        </div>

        <div style="background:#f0f7ff;border-radius:12px;padding:1.25rem;margin:1rem 0;">
          <p style="font-size:.95rem;font-weight:700;color:#1a1a2e;margin:0 0 .35rem;">
            📬 Kapja meg 3 napos cselekvési tervét
          </p>
          <p style="font-size:.82rem;color:#555;margin:0 0 .75rem;">
            Személyre szabott terve: mit tegyen ma, holnap és ezen a héten.
            Kész hivatkozások az eszközökhöz + AI-prompt Claude / ChatGPT / Gemini számára.
          </p>
          <form id="score-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <input type="email" name="email" placeholder="az-on@email.hu" required
                   style="flex:1;min-width:180px;padding:.6rem .9rem;border:1px solid #d1d5db;border-radius:8px;font-size:.95rem;">
            <button type="submit" class="btn btn--primary">Küldje el a tervemet →</button>
          </form>
          <p style="font-size:.75rem;color:#9ca3af;margin:.5rem 0 0;">Spam nélkül. Egy e-mail a tervvel + opcionális emlékeztetők.</p>
        </div>

        <button id="quiz-skip-email" type="button"
                style="background:none;border:none;color:var(--gray-400);font-size:.8rem;cursor:pointer;width:100%;text-align:center;padding:.25rem 0;">
          Csak az eredményt mutatja, terv nélkül →
        </button>
      </div>`;

    track("quiz_score_shown", { score, missing: missing.join(","), scope });

    document.getElementById("score-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      btn.textContent = "Küldés...";
      state.email = email;
      _submitEmailAndReport(email, () => renderResult(true));
    });

    document.getElementById("quiz-skip-email")?.addEventListener("click", () => {
      track("quiz_email_skipped");
      renderResult(false);
    });
  }

  // ── Submit email to Beehiiv + trigger report ───────────────────────────────
  function _submitEmailAndReport(email, onDone) {
    const { score, missing, answers } = state;

    // Score tier tag
    const scoreTier = score <= 3 ? "score_low" : score <= 6 ? "score_mid" : "score_high";
    const tags = [scoreTier,
      "sector_" + (answers.sector || "unknown"),
      "role_"   + (answers.role   || "unknown"),
      ...(missing.includes("registration") ? ["missing_registration"] : []),
      ...(missing.includes("isms")         ? ["missing_isms"]         : []),
      ...(missing.includes("training")     ? ["missing_training"]     : []),
      ...(missing.includes("insurance")    ? ["missing_insurance"]    : []),
    ];

    // Call both endpoints in parallel
    const subscribeCall = fetch(SUBSCRIBE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "quiz_score_gate",
        tags,
        quiz_answers: {
          sector: answers.sector, size: answers.size, revenue: answers.revenue,
          budget: answers.budget, registered: answers.registered,
          has_isms: answers.has_isms, has_training: answers.has_training,
          has_insurance: answers.has_insurance, role: answers.role,
          score,
        },
      }),
    }).catch(() => {});

    const reportCall = fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector:        answers.sector,
        size:          answers.size,
        revenue:       answers.revenue,
        budget:        answers.budget,
        registered:    answers.registered,
        has_isms:      answers.has_isms,
        has_training:  answers.has_training,
        has_insurance: answers.has_insurance,
        role:          answers.role,
        score,
        missing,
        email,
        lang:   document.documentElement.lang || "hu",
        domain: window.location.hostname,
      }),
    }).catch(() => {});

    Promise.allSettled([subscribeCall, reportCall]).then(() => {
      track("quiz_completed", { score, sector: answers.sector, email_captured: true });
      if (onDone) onDone();
    });
  }

  // ── Render: result with today-actions ──────────────────────────────────────
  function renderResult(emailCaptured) {
    const el = document.getElementById("quiz-container");
    if (!el) return;

    const { score, missing, answers } = state;
    const scope    = computeScope();
    const actions  = buildTodayActions();
    const pct      = Math.round((score / 10) * 100);
    const scoreColor = score <= 3 ? "#dc2626" : score <= 6 ? "#d97706" : "#16a34a";

    const scopeBadge = {
      essential: { text: "🚨 Kulcsfontosságú szervezet",  color: "#fee2e2", tc: "#991b1b" },
      important:  { text: "⚠️ Fontos szervezet",          color: "#fefce8", tc: "#854d0e" },
      check:      { text: "🔍 Ellenőrizze a kivételeket", color: "#fefce8", tc: "#854d0e" },
      out:        { text: "✅ Valószínűleg nem érintett",  color: "#dcfce7", tc: "#166534" },
    }[scope] || { text: "NIS2", color: "#e5e7eb", tc: "#374151" };

    function actionCard(a) {
      const isAffiliate = a.affiliate;
      return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:1rem 1.1rem;margin-bottom:.75rem;${isAffiliate ? "border-left:3px solid var(--navy);" : ""}">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;">
            <span style="background:var(--navy);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0;">${a.step}</span>
            <span style="font-size:.75rem;color:var(--gray-500);">${a.time}</span>
            ${isAffiliate && a.badge ? `<span style="background:#dcfce7;color:#166534;font-size:.68rem;font-weight:700;padding:.1rem .45rem;border-radius:4px;">${a.badge}</span>` : ""}
          </div>
          <div style="font-weight:700;font-size:.95rem;margin-bottom:.3rem;">${a.title}</div>
          <div style="font-size:.82rem;color:#555;margin-bottom:.6rem;">${a.desc}</div>
          <a href="${a.url}" ${isAffiliate ? 'target="_blank" rel="nofollow noopener"' : ''}
             style="display:inline-block;padding:.45rem .9rem;background:var(--navy);color:#fff;border-radius:6px;font-size:.82rem;font-weight:600;text-decoration:none;">
            ${a.cta}
          </a>
        </div>`;
    }

    const reskipBlock = missing.length === 0
      ? `<div style="background:#dcfce7;border-radius:10px;padding:1rem;text-align:center;margin-bottom:1rem;">
           <strong>🎉 Vállalkozása kiváló állapotban van!</strong><br>
           <span style="font-size:.85rem;">Az összes kulcsfontosságú NIS2 intézkedés be van vezetve. Fontolja meg az ISO 27001 tanúsítványt a megfelelés igazolásához.</span>
           <br><a href="iso-27001-tanusitas.html" style="font-size:.82rem;color:var(--navy);font-weight:700;">Tudjon meg többet az ISO 27001-ről →</a>
         </div>`
      : actions.map(actionCard).join("");

    el.innerHTML = `
      <div class="quiz-card">

        ${emailCaptured
          ? `<div style="background:#dcfce7;border-radius:8px;padding:.6rem 1rem;font-size:.82rem;color:#166534;font-weight:600;margin-bottom:1rem;text-align:center;">
               ✅ A terv elküldve: ${state.email || "az Ön e-mail-címére"} — ellenőrizze postafiókját
             </div>`
          : ""}

        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:2.5rem;font-weight:800;color:${scoreColor};line-height:1;">
              ${score}<span style="font-size:1rem;color:var(--gray-400);font-weight:500;">/10</span>
            </div>
            <div style="font-size:.7rem;color:var(--gray-500);">NIS2 pontszám</div>
          </div>
          <div style="flex:1;min-width:140px;">
            <div style="height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-bottom:.35rem;">
              <div style="height:100%;width:${pct}%;background:${scoreColor};border-radius:99px;"></div>
            </div>
            <span style="display:inline-block;padding:.2rem .6rem;border-radius:12px;font-size:.75rem;font-weight:700;background:${scopeBadge.color};color:${scopeBadge.tc};">
              ${scopeBadge.text}
            </span>
          </div>
        </div>

        <h3 style="font-size:1.05rem;margin-bottom:.35rem;">
          ${missing.length > 0
            ? `🏃 Tegye meg MA — összesen ~${Math.min(120, missing.length * 30)} perc`
            : "Az Ön NIS2 státusza"}
        </h3>
        <p style="font-size:.82rem;color:var(--gray-500);margin-bottom:1rem;">
          ${missing.length > 0
            ? `${missing.length} hiányzó lépés. Az alábbiakat még ma elvégezheti.`
            : "Minden kulcsfontosságú intézkedés a helyén van."}
        </p>

        ${reskipBlock}

        ${missing.length > 0 ? `
          <div style="border-top:1px solid #e5e7eb;padding-top:1rem;margin-top:.5rem;">
            <p style="font-size:.78rem;color:var(--gray-500);margin-bottom:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">
              Következő lépések (foglaljon időpontot)
            </p>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              <a href="behatolasi-tesztek.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔍 Behatolási teszt
              </a>
              <a href="iso-27001-tanusitas.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🏅 ISO 27001 tanúsítás
              </a>
              <a href="ellatasi-lanc-biztonsag.html" style="font-size:.78rem;padding:.3rem .7rem;border:1px solid #e5e7eb;border-radius:6px;color:var(--gray-600);text-decoration:none;">
                🔗 Ellátási lánc biztonsága
              </a>
            </div>
          </div>` : ""}

        <div style="margin-top:1.25rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn--outline btn--sm" id="quiz-restart">← Kezdje elölről</button>
          <a href="porownanie.html" class="btn btn--primary btn--sm">Hasonlítsa össze a NIS2 eszközöket →</a>
        </div>

        ${!emailCaptured ? `
          <div style="margin-top:1rem;background:#f0f7ff;border-radius:8px;padding:.85rem;text-align:center;">
            <p style="font-size:.82rem;margin:0 0 .5rem;"><strong>Kapja meg a teljes tervet e-mailben</strong> AI-prompttal és eszközhivatkozásokkal</p>
            <form id="late-email-form" style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
              <input type="email" placeholder="az-on@email.hu" required
                     style="flex:1;min-width:160px;padding:.45rem .75rem;border:1px solid #d1d5db;border-radius:6px;font-size:.85rem;">
              <button type="submit" class="btn btn--primary btn--sm">Küldés →</button>
            </form>
          </div>` : ""}
      </div>`;

    document.getElementById("quiz-restart")?.addEventListener("click", () => {
      state.step = 0; state.answers = {}; state.score = 0;
      state.missing = []; state.email = null;
      try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
      renderStep();
    });

    document.getElementById("late-email-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const email = e.target.querySelector("input[type=email]").value.trim();
      if (!email) return;
      const btn = e.target.querySelector("button");
      btn.disabled = true; btn.textContent = "Küldés...";
      state.email = email;
      _submitEmailAndReport(email, () => {
        e.target.parentElement.innerHTML =
          `<p style="font-size:.82rem;color:#166534;font-weight:700;">✅ Elküldve: ${email}</p>`;
      });
    });

    track("quiz_result_shown", { score, scope, email_captured: emailCaptured });
  }

  // ── FAQ accordion ──────────────────────────────────────────────────────────
  function initFaq() {
    document.querySelectorAll(".faq-question").forEach(btn => {
      btn.addEventListener("click", () => {
        const item   = btn.closest(".faq-item");
        const isOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach(i => i.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("quiz-container");
    if (container) renderStep();
    initFaq();
  });

})();