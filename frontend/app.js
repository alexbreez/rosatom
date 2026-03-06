/**
 * AI Media Monitor — Frontend Logic
 *
 * Two-screen flow:
 *   Screen 1: Form (topic, brand, country)
 *   Screen 2: Results (translated titles, Russian summaries, links)
 *
 * A modal overlay with "Ведётся поиск" appears during the API call.
 */

// ── Config ──────────────────────────────────────────────────────────────────
const API_BASE =
  window.MEDIA_MONITOR_API_BASE ||
  "https://media-monitoring-agent.vercel.app";

// ── DOM refs ────────────────────────────────────────────────────────────────
const form = document.getElementById("search-form");
const formScreen = document.getElementById("form-screen");
const topicInput = document.getElementById("topic");
const brandInput = document.getElementById("brand");
const countrySelect = document.getElementById("country");
const startBtn = document.getElementById("start-btn");

const resultsScreen = document.getElementById("results-screen");
const backBtn = document.getElementById("back-btn");
const brandSection = document.getElementById("brand-section");
const brandCloud = document.getElementById("brand-cloud");
const synonymsSection = document.getElementById("synonyms-section");
const synonymsCloud = document.getElementById("synonyms-cloud");
const resultsSection = document.getElementById("results-section");
const resultsCount = document.getElementById("results-count");
const resultsList = document.getElementById("results-list");
const emptyState = document.getElementById("empty-state");

const modalOverlay = document.getElementById("modal-overlay");
const modalStatus = document.getElementById("modal-status");

// ── Screen switching ────────────────────────────────────────────────────────

function showFormScreen() {
  resultsScreen.classList.add("hidden");
  formScreen.classList.remove("hidden");
  // Reset results
  brandSection.classList.add("hidden");
  synonymsSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
  emptyState.classList.add("hidden");
}

function showResultsScreen() {
  formScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Modal ───────────────────────────────────────────────────────────────────

function openModal(status) {
  modalStatus.textContent = status || "Генерация ключевых слов…";
  modalOverlay.classList.remove("hidden");
}

function updateModal(status) {
  modalStatus.textContent = status;
}

function closeModal() {
  modalOverlay.classList.add("hidden");
}

// ── Button state ────────────────────────────────────────────────────────────

function setButtonLoading(loading) {
  startBtn.disabled = loading;
  startBtn.textContent = loading ? "Поиск…" : "Start";
  startBtn.classList.toggle("opacity-60", loading);
  startBtn.classList.toggle("cursor-not-allowed", loading);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str || ""));
  return div.innerHTML;
}

// ── Rendering ───────────────────────────────────────────────────────────────

function renderBrandVariants(variants) {
  brandCloud.innerHTML = "";
  variants.forEach((v) => {
    const tag = document.createElement("span");
    tag.className =
      "inline-block px-3 py-1 text-xs rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/40";
    tag.textContent = v;
    brandCloud.appendChild(tag);
  });
  brandSection.classList.remove("hidden");
}

function renderSynonyms(synonyms) {
  synonymsCloud.innerHTML = "";
  synonyms.forEach((word) => {
    const tag = document.createElement("span");
    tag.className =
      "inline-block px-3 py-1 text-xs rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-700/40";
    tag.textContent = word;
    synonymsCloud.appendChild(tag);
  });
  synonymsSection.classList.remove("hidden");
}

function renderResults(articles) {
  resultsList.innerHTML = "";

  if (articles.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  resultsCount.textContent = `(${articles.length})`;

  articles.forEach((article) => {
    const card = document.createElement("div");
    card.className =
      "p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-600/50 transition";

    card.innerHTML = `
      <h3 class="text-sm font-semibold text-gray-100 leading-snug">
        ${escapeHtml(article.title_ru || article.title)}
      </h3>
      ${
        article.summary_ru
          ? `<p class="mt-2 text-xs text-gray-400 leading-relaxed">${escapeHtml(article.summary_ru)}</p>`
          : ""
      }
      <div class="mt-3 flex items-center justify-between">
        <div class="flex items-center gap-3 text-xs text-gray-500">
          <span>${escapeHtml(article.source)}</span>
          <span>·</span>
          <time>${formatDate(article.date)}</time>
        </div>
        <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer"
           class="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1">
          Читать
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
        </a>
      </div>
      ${
        article.title !== (article.title_ru || article.title)
          ? `<p class="mt-2 text-[11px] text-gray-600 italic">Оригинал: ${escapeHtml(article.title)}</p>`
          : ""
      }
    `;

    resultsList.appendChild(card);
  });

  resultsSection.classList.remove("hidden");
}

// ── Form submit ─────────────────────────────────────────────────────────────

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const topic = topicInput.value.trim();
  const brand = brandInput.value.trim();
  const country = countrySelect.value;

  if (!topic || !brand || !country) {
    alert("Заполните все поля");
    return;
  }

  setButtonLoading(true);
  openModal("Генерация ключевых слов…");

  try {
    const res = await fetch(`${API_BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, brand, country }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Ошибка сервера (${res.status})`);
    }

    updateModal("Обработка результатов…");
    const data = await res.json();

    closeModal();

    // Switch to results screen
    if (data.brand_variants) renderBrandVariants(data.brand_variants);
    renderSynonyms(data.synonyms);
    renderResults(data.articles);
    showResultsScreen();
  } catch (err) {
    closeModal();
    alert(`Ошибка: ${err.message}`);
  } finally {
    setButtonLoading(false);
  }
});

// ── Back button ─────────────────────────────────────────────────────────────

backBtn.addEventListener("click", () => {
  showFormScreen();
});
