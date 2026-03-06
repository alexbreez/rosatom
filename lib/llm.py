"""LLM integration module.
Uses the OpenAI API to generate a semantic cloud of 20 related
keywords/synonyms for a given topic in a specified language,
and to localize brand names for the target media market.
"""

import json
import os

from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


async def generate_semantic_cloud(
    topic: str, language_name: str, language_code: str
) -> list[str]:
    """
    Ask the LLM to produce 20 strictly related synonyms/keywords
    for `topic` in the given language.

    Returns a list of keyword strings.
    """
    prompt = (
        f"You are a multilingual media analyst. "
        f"Generate exactly 20 keywords or short phrases that are strictly "
        f"semantically related to the topic \"{topic}\". "
        f"The keywords MUST be in {language_name} (language code: {language_code}). "
        f"Return ONLY a JSON array of 20 strings, no explanation or markdown. "
        f"Example format: [\"keyword1\", \"keyword2\", ...]"
    )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant that outputs only valid JSON arrays. "
                    "No markdown fences, no extra text."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_tokens=500,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if the model wraps them anyway
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    keywords: list[str] = json.loads(raw)

    # Safety: ensure we have at most 20 items and they're all strings
    return [str(k) for k in keywords[:20]]


async def localize_brand(
    brand: str, language_name: str, language_code: str
) -> list[str]:
    """
    Return a list of brand name variants as they would appear in
    the target language's media (transliterations, local spellings,
    official Latin name, etc.).

    For example: "Росатом" → ["Rosatom", "Росатом"]
    """
    prompt = (
        f"A user entered the brand name \"{brand}\". "
        f"Return a JSON array of all name variants that {language_name}-language "
        f"media would realistically use when mentioning this brand. "
        f"Include: the original input, Latin transliteration (if the input is "
        f"non-Latin), the official international name, and any common local "
        f"spelling in {language_name}. "
        f"Remove exact duplicates. Return 1-4 variants, no explanations. "
        f'Example: ["Rosatom", "Росатом"]'
    )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant that outputs only valid JSON arrays. "
                    "No markdown fences, no extra text."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=150,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    variants: list[str] = json.loads(raw)
    # Deduplicate while preserving order
    seen: set[str] = set()
    result: list[str] = []
    for v in variants:
        v_str = str(v).strip()
        if v_str and v_str.lower() not in seen:
            seen.add(v_str.lower())
            result.append(v_str)
    return result or [brand]


async def summarize_articles(
    articles: list[dict], source_language: str
) -> list[dict]:
    """
    For each article, produce a Russian translation of the title
    and a 1-2 sentence summary in Russian.

    Returns the same list with added `title_ru` and `summary_ru` keys.
    """
    if not articles:
        return articles

    # Build a batch prompt with all titles to minimize API calls
    titles_block = "\n".join(
        f"{i+1}. {a['title']}" for i, a in enumerate(articles)
    )

    prompt = (
        f"Below are {len(articles)} news article titles in {source_language}.\n"
        f"For each title, provide:\n"
        f"  1) A Russian translation of the title\n"
        f"  2) A brief 1-2 sentence summary in Russian of what the article is likely about\n\n"
        f"Titles:\n{titles_block}\n\n"
        f"Return ONLY a JSON array of objects, one per title, in order:\n"
        f'[{{"title_ru": "...", "summary_ru": "..."}}, ...]\n'
        f"No markdown, no explanations."
    )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant that outputs only valid JSON arrays. "
                    "No markdown fences, no extra text."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=3000,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        translations = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: return articles without translations
        for a in articles:
            a["title_ru"] = a["title"]
            a["summary_ru"] = ""
        return articles

    for i, a in enumerate(articles):
        if i < len(translations):
            a["title_ru"] = translations[i].get("title_ru", a["title"])
            a["summary_ru"] = translations[i].get("summary_ru", "")
        else:
            a["title_ru"] = a["title"]
            a["summary_ru"] = ""

    return articles
