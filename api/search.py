"""
Search module.
Queries the NewsAPI /v2/everything endpoint to find articles from
specific media domains that mention the brand and at least one
synonym, published within the last 5 days.
"""

import os
from datetime import datetime, timedelta, timezone

import httpx

NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY", "")
NEWSAPI_URL = "https://newsapi.org/v2/everything"


async def search_media(
    brand: str,
    synonyms: list[str],
    domains: list[str],
) -> list[dict]:
    """
    Search NewsAPI for articles matching the brand + synonyms
    across the given media domains, limited to the last 5 days.

    Returns a deduplicated list of article dicts:
      [{ "title", "url", "date", "source" }, ...]
    """
    now = datetime.now(timezone.utc)
    from_date = (now - timedelta(days=5)).strftime("%Y-%m-%d")
    to_date = now.strftime("%Y-%m-%d")

    # Build the query: brand AND (synonym1 OR synonym2 OR ...)
    # NewsAPI supports boolean operators in the `q` parameter.
    synonym_clause = " OR ".join(f'"{s}"' for s in synonyms)
    query = f'"{brand}" AND ({synonym_clause})'

    # NewsAPI limits `domains` to a comma-separated string.
    # We batch domains into groups of 20 (the list is exactly 20).
    domains_str = ",".join(domains)

    params = {
        "q": query,
        "domains": domains_str,
        "from": from_date,
        "to": to_date,
        "language": "",  # will be overridden per-call if needed
        "sortBy": "publishedAt",
        "pageSize": 100,
        "apiKey": NEWSAPI_KEY,
    }
    # Remove empty language param – NewsAPI returns all languages if omitted
    params = {k: v for k, v in params.items() if v}

    results: list[dict] = []
    seen_urls: set[str] = set()

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(NEWSAPI_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

        for article in data.get("articles", []):
            url = article.get("url", "")
            if url in seen_urls:
                continue
            seen_urls.add(url)

            results.append(
                {
                    "title": article.get("title", ""),
                    "url": url,
                    "date": article.get("publishedAt", ""),
                    "source": article.get("source", {}).get("name", ""),
                }
            )

    # Sort by date descending
    results.sort(key=lambda a: a["date"], reverse=True)
    return results
