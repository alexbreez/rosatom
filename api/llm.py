"""
LLM integration module.
Uses the OpenAI API to generate a semantic cloud of 20 related
keywords/synonyms for a given topic in a specified language.
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
