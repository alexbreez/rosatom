"""
Search module.
Queries the NewsAPI /v2/everything endpoint to find articles from
specific media domains that mention the brand and at least one
synonym, published within the last 5 days.

NewsAPI limits the `q` parameter to ~500 characters, so we split
synonyms into batches and issue multiple requests if needed.
"""

import os
from datetime import datetime, timedelta, timezone

import httpx

NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY", "")
NEWSAPI_URL = "https://newsapi.org/v2/everything"

# NewsAPI enforces a ~500-char limit on the `q` param.
MAX_QUERY_LEN = 480


def _build_query_batches(brand_variants: list[str], synonyms: list[str]) -> list[str]:
    """
    Split synonyms into batches so each query stays under MAX_QUERY_LEN.
    Query: ("Brand1" OR "Brand2") AND ("syn1" OR "syn2" OR ...)
    """
    brand_clause = " OR ".join(f'"{b}"' for b in brand_variants)
    prefix = f'({brand_clause}) AND ('
    suffix = ")"
    overhead = len(prefix) + len(suffix)

    batches: list[str] = []
    current_parts: list[str] = []
    current_len = overhead

    for syn in synonyms:
        part = f'"{syn}"'
        # " OR " is 4 chars
        addition = len(part) + (4 if current_parts else 0)

        if current_len + addition > MAX_QUERY_LEN and current_parts:
            batches.append(prefix + " OR ".join(current_parts) + suffix)
            current_parts = [part]
            current_len = overhead + len(part)
        else:
            current_parts.append(part)
            current_len += addition

    if current_parts:
        batches.append(prefix + " OR ".join(current_parts) + suffix)

    return batches


async def search_media(
    brand_variants: list[str],
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

    domains_str = ",".join(domains)
    query_batches = _build_query_batches(brand_variants, synonyms)

    results: list[dict] = []
    seen_urls: set[str] = set()

    async with httpx.AsyncClient(timeout=30.0) as client:
        for query in query_batches:
            params = {
                "q": query,
                "domains": domains_str,
                "from": from_date,
                "to": to_date,
                "sortBy": "publishedAt",
                "pageSize": 100,
                "apiKey": NEWSAPI_KEY,
            }

            resp = await client.get(NEWSAPI_URL, params=params)

            # If a batch fails (e.g. query too complex), log and continue
            if resp.status_code != 200:
                print(f"NewsAPI error ({resp.status_code}): {resp.text[:200]}")
                continue

            data = resp.json()

            for article in data.get("articles", []):
                url = article.get("url", "")
                if not url or url in seen_urls:
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
