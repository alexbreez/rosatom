/**
 * AI Media Monitor — Frontend Logic
 *
 * Handles form validation, calls the backend API, manages loading states,
 * and renders results dynamically.
 */

// ── Config ──────────────────────────────────────────────────────────────────
// Point this to your deployed Vercel backend URL.
// During local development, use "http://localhost:8000".
const API_BASE = window.MEDIA_MONITOR_API_BASE || "http://localhost:8000";

// ── DOM refs ────────────────────────────────────────────────────────────────
const form = document.getElementById("search-form");
const topicInput = document.getElementById("topic");
const brandInput = document.getElementById("brand");
const countrySelect = document.getElementById("country");
const startBtn = document.getElementById("start-btn");
const spinner = document.getElementById("spinner");
const statusText = document.getElementById("status-text");
const synonymsSection = document.getElementById("synonyms-section");
const synonymsCloud = document.getElementById("synonyms-cloud");
const resultsSection = document.getElementById("results-section");
const resultsCount = document.getElementById("results-count");
const resultsList = document.getElementById("results-list");
const emptyState = document.getElementById("empty-state");

// ── Helpers ─────────────────────────────────────────────────────────────────

function hideAll() {
  spinner.classList.add("hidden");
  synonymsSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
  emptyState.classList.add("hidden");
}

function showSpinner(message) {
  hideAll();
  statusText.textContent = message;
  spinner.classList.remove("hidden");
}

function setButtonLoading(loading) {
  startBtn.disabled = loading;
  startBtn.textContent = loading ? "Running…" : "Start";
  startBtn.classList.toggle("opacity-60", loading);
  startBtn.classList.toggle("cursor-not-allowed", loading);
}

/**
 * Format an ISO date string to a readable locale format.
 */
function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Rendering ───────────────────────────────────────────────────────────────

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
    const card = document.createElement("a");
    card.href = article.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className =
      "block p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-600 transition";

    card.innerHTML = `
      <p class="text-sm font-medium text-gray-100 leading-snug">${escapeHtml(article.title)}</p>
      <div class="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>${escapeHtml(article.source)}</span>
        <span>·</span>
        <time>${formatDate(article.date)}</time>
      </div>
    `;

    resultsList.appendChild(card);
  });

  resultsSection.classList.remove("hidden");
}

/**
 * Basic HTML escaping to avoid XSS when injecting user-sourced data.
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Form submit ─────────────────────────────────────────────────────────────

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const topic = topicInput.value.trim();
  const brand = brandInput.value.trim();
  const country = countrySelect.value;

  // Validation
  if (!topic || !brand || !country) {
    alert("Заполните все поля");
    return;
  }

  setButtonLoading(true);
  showSpinner("Generating semantic cloud…");

  try {
    const res = await fetch(`${API_BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, brand, country }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error (${res.status})`);
    }

    const data = await res.json();

    // Show synonyms
    showSpinner("Fetching articles…");
    renderSynonyms(data.synonyms);

    // Show articles
    spinner.classList.add("hidden");
    renderResults(data.articles);
  } catch (err) {
    hideAll();
    alert(`Error: ${err.message}`);
  } finally {
    setButtonLoading(false);
  }
});
