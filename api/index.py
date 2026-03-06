"""Main FastAPI application.
Deployed as a Vercel serverless function.

Vercel's @vercel/python runtime natively supports FastAPI —
just export `app`. No Mangum wrapper needed.
"""

import os
import traceback

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Vercel adds the project root to sys.path, so absolute imports work.
from lib.countries import get_country_config, get_supported_countries
from lib.llm import generate_semantic_cloud, localize_brand
from lib.search import search_media

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Media Monitoring Agent API")

# Allow the GitHub Pages frontend (and localhost for dev) to call the API.
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class SearchRequest(BaseModel):
    topic: str
    brand: str
    country: str


class ArticleResult(BaseModel):
    title: str
    url: str
    date: str
    source: str


class SearchResponse(BaseModel):
    synonyms: list[str]
    brand_variants: list[str]
    language: str
    articles: list[ArticleResult]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/countries")
async def list_countries() -> dict:
    """Return the list of supported countries for the frontend dropdown."""
    return {"countries": get_supported_countries()}


@app.post("/api/search", response_model=SearchResponse)
async def run_search(req: SearchRequest) -> SearchResponse:
    """
    Full agent workflow:
      1. Resolve country → language + media domains
      2. Generate semantic cloud via LLM
      3. Query NewsAPI with brand + synonyms across media domains
      4. Return results
    """
    # Step 1 — country resolution
    config = get_country_config(req.country)
    if config is None:
        raise HTTPException(
            status_code=400,
            detail=f"Country '{req.country}' is not supported. "
            f"Available: {get_supported_countries()}",
        )

    language_name = config["language_name"]
    language_code = config["language_code"]
    domains = config["media_domains"]

    try:
        # Step 2 — semantic cloud + brand localization (parallel)
        synonyms = await generate_semantic_cloud(
            topic=req.topic,
            language_name=language_name,
            language_code=language_code,
        )
        brand_variants = await localize_brand(
            brand=req.brand,
            language_name=language_name,
            language_code=language_code,
        )

        # Step 3 — search (using all brand name variants)
        articles = await search_media(
            brand_variants=brand_variants,
            synonyms=synonyms,
            domains=domains,
        )
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail=f"Upstream service error: {exc}",
        ) from exc

    # Step 4 — return
    return SearchResponse(
        synonyms=synonyms,
        brand_variants=brand_variants,
        language=language_name,
        articles=[ArticleResult(**a) for a in articles],
    )
