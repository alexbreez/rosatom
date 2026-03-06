/**
 * Tests for the Markdown download feature.
 *
 * Run: node --test frontend/tests/download.test.js
 *
 * Uses Node.js built-in test runner (no extra dependencies).
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// ── Helpers extracted from app.js for testability ───────────────────────────

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

function buildMarkdown(articles, meta) {
  const date = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  let md = `# Результаты медиа-мониторинга\n`;
  md += `**Тема:** ${meta.topic || "—"}  \n`;
  md += `**Бренд:** ${meta.brand || "—"}  \n`;
  md += `**Страна:** ${meta.country || "—"}  \n`;
  md += `**Дата отчёта:** ${date}  \n`;
  md += `**Найдено публикаций:** ${articles.length}\n\n`;
  md += `---\n\n`;

  articles.forEach((a, i) => {
    md += `## ${i + 1}. ${a.title_ru || a.title}\n\n`;
    if (a.summary_ru) {
      md += `${a.summary_ru}\n\n`;
    }
    md += `- **Источник:** ${a.source}\n`;
    md += `- **Дата:** ${formatDate(a.date)}\n`;
    md += `- **Ссылка:** [${a.url}](${a.url})\n`;
    if (a.title !== (a.title_ru || a.title)) {
      md += `- **Оригинал заголовка:** ${a.title}\n`;
    }
    md += `\n`;
  });

  return md;
}

// ── Test data ───────────────────────────────────────────────────────────────

const sampleArticles = [
  {
    title: "Irankrieg: Libanon meldet mehr als 100 Tote",
    title_ru: "Иранская война: Ливан сообщает о более чем 100 погибших",
    summary_ru: "Статья освещает последствия военных действий.",
    url: "https://example.com/article1",
    date: "2026-03-05T15:52:00Z",
    source: "STERN.de",
  },
  {
    title: "Benzinpreise: Das passiert, wenn man die Energiewende bremst",
    title_ru: "Цены на бензин: что происходит, когда тормозят энергопереход",
    summary_ru: "",
    url: "https://example.com/article2",
    date: "2026-03-05T14:30:00Z",
    source: "Die Zeit",
  },
];

const sampleMeta = {
  topic: "Иран",
  brand: "Иран",
  country: "Германия",
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("buildMarkdown", () => {
  it("should produce a string starting with a Markdown heading", () => {
    const md = buildMarkdown(sampleArticles, sampleMeta);
    assert.ok(md.startsWith("# Результаты медиа-мониторинга\n"));
  });

  it("should include search metadata (topic, brand, country)", () => {
    const md = buildMarkdown(sampleArticles, sampleMeta);
    assert.ok(md.includes("**Тема:** Иран"));
    assert.ok(md.includes("**Бренд:** Иран"));
    assert.ok(md.includes("**Страна:** Германия"));
  });

  it("should include the article count", () => {
    const md = buildMarkdown(sampleArticles, sampleMeta);
    assert.ok(md.includes("**Найдено публикаций:** 2"));
  });

  it("should include Russian-translated titles as h2 headings", () => {
    const md = buildMarkdown(sampleArticles, sampleMeta);
    assert.ok(
      md.includes("## 1. Иранская война: Ливан сообщает о более чем 100 погибших")
    );
    assert.ok(
      md.includes("## 2. Цены на бензин: что происходит, когда тормозят энергопереход")
    );
  });

  it("should include summary_ru when present, omit when empty", () => {
    const md = buildMarkdown(sampleArticles, sampleMeta);
    // Article 1 has a summary
    assert.ok(md.includes("Статья освещает последствия военных действий."));
    // Article 2 has empty summary — should NOT have an extra blank paragraph
    const article2Section = md.split("## 2.")[1];
    assert.ok(!article2Section.includes("\n\n\n\n"));
  });

  it("should include source, date, and link for each article", () => {
    const md = buildMarkdown(sampleArticles, sampleMeta);
    assert.ok(md.includes("**Источник:** STERN.de"));
    assert.ok(md.includes("**Источник:** Die Zeit"));
    assert.ok(md.includes("[https://example.com/article1](https://example.com/article1)"));
    assert.ok(md.includes("[https://example.com/article2](https://example.com/article2)"));
  });

  it("should include original title when it differs from title_ru", () => {
    const md = buildMarkdown(sampleArticles, sampleMeta);
    assert.ok(
      md.includes("**Оригинал заголовка:** Irankrieg: Libanon meldet mehr als 100 Tote")
    );
  });

  it("should handle empty articles list", () => {
    const md = buildMarkdown([], sampleMeta);
    assert.ok(md.includes("**Найдено публикаций:** 0"));
    assert.ok(md.includes("---"));
    // No article headings
    assert.ok(!md.includes("## 1."));
  });

  it("should handle missing meta fields gracefully", () => {
    const md = buildMarkdown(sampleArticles, {});
    assert.ok(md.includes("**Тема:** —"));
    assert.ok(md.includes("**Бренд:** —"));
    assert.ok(md.includes("**Страна:** —"));
  });

  it("should fall back to original title when title_ru is missing", () => {
    const articles = [
      {
        title: "Original Title",
        url: "https://example.com",
        date: "2026-01-01T00:00:00Z",
        source: "Test",
      },
    ];
    const md = buildMarkdown(articles, sampleMeta);
    assert.ok(md.includes("## 1. Original Title"));
    // Should NOT include "Оригинал заголовка" since title_ru is undefined → falls back to title
    assert.ok(!md.includes("Оригинал заголовка"));
  });

  it("should produce valid Markdown with horizontal rule separator", () => {
    const md = buildMarkdown(sampleArticles, sampleMeta);
    assert.ok(md.includes("\n---\n"));
  });
});

describe("formatDate", () => {
  it("should return dash for empty input", () => {
    assert.equal(formatDate(null), "—");
    assert.equal(formatDate(undefined), "—");
    assert.equal(formatDate(""), "—");
  });

  it("should format a valid ISO date in Russian locale", () => {
    const result = formatDate("2026-03-05T15:52:00Z");
    // Should contain day, month abbreviation in Russian, year
    assert.ok(result.includes("2026"));
    assert.ok(result.includes("5"));
  });
});
