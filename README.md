# AI Media Monitoring Agent

A web-based AI media monitoring tool that finds brand mentions across top news media in specific countries, powered by LLM-generated semantic search.

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────────┐
│  Frontend (static)  │  POST  │  Backend (Vercel serverless)  │
│  GitHub Pages       │───────▶│  FastAPI + Python             │
│  HTML/Tailwind/JS   │◀───────│                               │
└─────────────────────┘  JSON  │  ┌─────────┐  ┌───────────┐  │
                               │  │ OpenAI  │  │ NewsAPI   │  │
                               │  │ API     │  │           │  │
                               │  └─────────┘  └───────────┘  │
                               └──────────────────────────────┘
```

## Folder Structure

```
media-monitoring-agent/
├── api/
│   ├── __init__.py
│   ├── index.py          # FastAPI app & endpoints
│   ├── countries.py       # Country → language + media domains
│   ├── llm.py             # OpenAI semantic cloud generation
│   └── search.py          # NewsAPI search integration
├── frontend/
│   ├── index.html         # Main UI
│   ├── app.js             # Frontend logic
│   └── style.css          # Custom styles
├── .github/workflows/
│   └── deploy.yml         # GitHub Pages deployment
├── vercel.json            # Vercel routing config
├── requirements.txt       # Python dependencies
└── README.md
```

## Setup

### 1. API Keys

You need two API keys:

| Service | Get it at | Variable |
|---------|-----------|----------|
| OpenAI  | https://platform.openai.com/api-keys | `OPENAI_API_KEY` |
| NewsAPI | https://newsapi.org/register | `NEWSAPI_KEY` |

**Never put API keys in frontend code.** They are only used in the backend.

### 2. Backend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# From the project root:
vercel

# Set environment variables in Vercel dashboard or CLI:
vercel env add OPENAI_API_KEY
vercel env add NEWSAPI_KEY

# Add your GitHub Pages URL to CORS allowlist:
vercel env add ALLOWED_ORIGINS
# Value: https://<username>.github.io
```

### 3. Frontend Configuration

Edit `frontend/app.js` line 11 — set `API_BASE` to your deployed Vercel URL:

```js
const API_BASE = window.MEDIA_MONITOR_API_BASE || "https://your-project.vercel.app";
```

Or set `window.MEDIA_MONITOR_API_BASE` before the script loads.

### 4. Frontend Deployment (GitHub Pages)

Push to the `main` branch. The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically deploy the `frontend/` directory to GitHub Pages.

To enable GitHub Pages:
1. Go to repo **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.

### 5. Local Development

```bash
# Backend
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
export NEWSAPI_KEY="your-key"
uvicorn api.index:app --reload --port 8000

# Frontend — open frontend/index.html in a browser,
# or use a local server:
python -m http.server 5500 -d frontend
```

## How It Works

1. User enters a **search topic**, **brand name**, and selects a **country**.
2. Backend resolves the country's main language and top 20 news media domains.
3. The LLM generates 20 semantically related keywords in the target language.
4. NewsAPI is queried across all 20 media domains with: `"brand" AND (keyword1 OR keyword2 OR ...)`, filtered to the last 5 days.
5. Results (title, URL, date, source) are displayed on the frontend.

## Supported Countries

- 🇩🇪 Germany (German)
- 🇭🇺 Hungary (Hungarian)
- 🇩🇰 Denmark (Danish)

To add more countries, edit `api/countries.py` and add an `<option>` in `frontend/index.html`.
