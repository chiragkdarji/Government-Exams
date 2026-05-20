"""
Rizz Jobs — Finance & Business News Scraper
Fetches RSS feeds from credible Indian financial sources, deduplicates,
rewrites each article with GPT-4o in a unique editorial voice, generates
SEO metadata + NewsArticle schema, generates AI news banners via Gemini
(using source image as visual reference), and upserts to news_articles.

Run: python news_scraper.py [--limit 15] [--no-banners]
"""
import io
import os
import re
import json
import hashlib
import argparse
import requests
import feedparser
from PIL import Image
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher
from google import genai
from google.genai import types
from openai import OpenAI
from supabase import create_client, Client

try:
    import trafilatura
    HAS_TRAFILATURA = True
except ImportError:
    HAS_TRAFILATURA = False

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")  # required for banner generation
NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY")        # optional

NEWS_CATEGORIES = ["finance", "business", "economy", "markets", "startups", "ipl"]
SIMILARITY_THRESHOLD = 0.85
BANNER_BUCKET = "job-banners"
NEWS_IMAGES_BUCKET = "news-images"
TARGET_BYTES = 40 * 1024  # 40 KB
IST = timezone(timedelta(hours=5, minutes=30))

# Category → color palette description for the banner prompt
CATEGORY_PALETTE = {
    "finance":  "deep navy blue (#0f172a) to royal blue (#1d4ed8), with gold accent highlights",
    "business": "charcoal (#1c1917) to deep purple (#4c1d95), with silver accent highlights",
    "markets":  "dark forest green (#052e16) to emerald (#065f46), with bright green accent highlights",
    "economy":  "deep slate (#0f172a) to dark teal (#134e4a), with amber accent highlights",
    "startups": "near-black (#0c0a09) to deep rose (#881337), with coral accent highlights",
    "ipl":      "deep night blue (#0a0f1e) to vivid cyan-teal (#0e7490), with golden accent highlights",
}

# ── IPL Team Colours ──────────────────────────────────────────────────────────
IPL_TEAM_COLOURS: dict[str, dict] = {
    "Mumbai Indians":              {"primary": "#004BA0", "accent": "#D1AB3E", "short": "MI"},
    "Chennai Super Kings":         {"primary": "#F9CD05", "accent": "#0081E9", "short": "CSK"},
    "Royal Challengers Bengaluru": {"primary": "#EC1C24", "accent": "#000000", "short": "RCB"},
    "Royal Challengers Bangalore": {"primary": "#EC1C24", "accent": "#000000", "short": "RCB"},
    "Kolkata Knight Riders":       {"primary": "#3A225D", "accent": "#F9CD05", "short": "KKR"},
    "Sunrisers Hyderabad":         {"primary": "#F26522", "accent": "#1A1A1A", "short": "SRH"},
    "Delhi Capitals":              {"primary": "#0078BC", "accent": "#EF1C25", "short": "DC"},
    "Punjab Kings":                {"primary": "#ED1B24", "accent": "#A7A9AC", "short": "PBKS"},
    "Rajasthan Royals":            {"primary": "#E4045B", "accent": "#2D3E8F", "short": "RR"},
    "Lucknow Super Giants":        {"primary": "#A72056", "accent": "#F5A623", "short": "LSG"},
    "Gujarat Titans":              {"primary": "#1B2133", "accent": "#B8860B", "short": "GT"},
}


def extract_ipl_teams(headline: str, summary: str) -> list[dict]:
    """Return up to 2 IPL team dicts mentioned in the headline or summary."""
    text = f"{headline} {summary}".lower()
    found = []
    seen_shorts: set[str] = set()
    for team_name, meta in IPL_TEAM_COLOURS.items():
        short = meta["short"].lower()
        # Match full name OR short code as a whole word
        if team_name.lower() in text or re.search(rf"\b{short}\b", text):
            if meta["short"] not in seen_shorts:
                found.append({"name": team_name, **meta})
                seen_shorts.add(meta["short"])
        if len(found) == 2:
            break
    return found


def build_ipl_banner_prompt(headline: str, summary: str, has_source_image: bool) -> str:
    """Craft a highly specific sports-photography prompt for IPL banners."""
    teams = extract_ipl_teams(headline, summary)

    if len(teams) == 2:
        t1, t2 = teams[0], teams[1]
        colour_block = (
            f"TEAM COLOUR CLASH — this is {t1['name']} vs {t2['name']}.\n"
            f"  - {t1['name']}: primary {t1['primary']}, accent {t1['accent']}\n"
            f"  - {t2['name']}: primary {t2['primary']}, accent {t2['accent']}\n"
            f"Weave both teams' colours into the gradient, jersey accents, and badge."
        )
        match_line = f"Match: {t1['name']} ({t1['short']}) vs {t2['name']} ({t2['short']})"
    elif len(teams) == 1:
        t = teams[0]
        colour_block = (
            f"FEATURED TEAM — {t['name']}.\n"
            f"  Primary: {t['primary']}, Accent: {t['accent']}\n"
            f"Use these colours in the gradient, badge glow, and accent line."
        )
        match_line = f"Featured team: {t['name']} ({t['short']})"
    else:
        colour_block = "Use IPL brand palette: dark navy to deep teal gradient, gold/amber accents."
        match_line = "Indian Premier League 2026"

    if has_source_image:
        visual_block = (
            "SOURCE PHOTO TREATMENT (CRITICAL):\n"
            "A real cricket news photograph has been attached. "
            "DO NOT replace it with AI-generated imagery. "
            "Instead, apply professional sports photo editing:\n"
            "  - Boost contrast (+20), vibrance (+15), clarity (+10) — punchy sports aesthetic\n"
            "  - Cinematic colour grade: slightly cooler highlights, warm shadows\n"
            "  - Apply a smooth dark gradient overlay on the bottom 45% (black → transparent)\n"
            "  - Subtle vignette on all four edges to focus attention on the centre\n"
            "  - Sharpen the primary subject (cricketer/ball/crowd)\n"
            "The result must look like a professionally retouched sports news photo, "
            "not an AI illustration. Preserve the original action/composition."
        )
    else:
        visual_block = (
            "GENERATE a high-impact cricket sports photograph:\n"
            "  - Primary subject: a cricketer in full action — a powerful batting stroke (cover drive / "
            "    slog sweep), or a bowler mid-delivery, or a fielder diving for a catch\n"
            "  - Background: IPL stadium at night under floodlights — packed stands, god-rays through "
            "    crowd, vivid green pitch visible\n"
            "  - Depth of field: shallow — player sharp, background beautifully blurred (f/2.8 bokeh)\n"
            "  - Camera: simulate Canon EOS R5 + 400mm telephoto — freeze motion, punchy colours\n"
            "  - Atmosphere: electric, high-energy, cinematic — this moment matters"
        )

    return f"""You are the lead sports photo editor for "Rizz Jobs", India's top cricket and financial news platform.
Your job: produce a banner that belongs on ESPNcricinfo, The Athletic India, or Getty Images Sports.

ARTICLE:
{match_line}
Headline: {headline}
Summary: {summary}

━━━ VISUAL DIRECTION ━━━
{visual_block}

━━━ COLOUR SCHEME ━━━
{colour_block}

━━━ BANNER LAYOUT (follow exactly) ━━━
1. Format: 16:9 landscape, 1280×720px. Never portrait. Never square.
2. GRADIENT OVERLAY: smooth black gradient covering the bottom 40% of the image.
   Bottom edge = fully opaque black. At 60% height = fully transparent.
   This is for text legibility — do NOT make it a thick black box.
3. HEADLINE TEXT — render directly inside the image:
   - Font: condensed bold athletic sans-serif (Gotham Bold / Industry / Helvetica Neue Condensed)
   - Size: large (≈52px) — the most dominant text element on the image
   - Colour: pure white (#FFFFFF) with a 2px black drop shadow for legibility
   - Position: 5% from left, 8% from bottom edge
   - Max width: 78% of image — wrap to 2-3 lines naturally, NEVER truncate
4. IPL BADGE — top-left corner:
   - Background: semi-transparent deep teal (#0e7490cc), slight border-radius
   - Text: "IPL 2026" — white, bold, uppercase, ~11px
   - Position: 3% from top and left edges
5. ACCENT RULE: a 3px × 40px horizontal amber (#f0a500) line placed directly above the headline.
6. BRANDING: "Rizz Jobs" — bottom-right, white, 45% opacity, small (~10px). Subtle watermark only.

━━━ QUALITY ━━━
- Benchmark: Getty Images, ESPNcricinfo match gallery, ICC official photography
- NO watermarks from third parties. NO "AI generated" text. NO clipart or cartoons.
- Packed stadium atmosphere must be palpable — this image should make you feel the IPL energy.
- Final result indistinguishable from a professional sports publication's article thumbnail.
"""


# ── News Banner Generation ────────────────────────────────────────────────────
def _download_source_image(url: str) -> tuple[bytes, str] | None:
    """Download source image bytes + mime type. Returns None on failure."""
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        if not ct.startswith("image/"):
            return None
        return resp.content, ct
    except Exception:
        return None


def generate_news_banner(
    headline: str,
    summary: str,
    category: str,
    slug: str,
    source_image_url: str | None,
    supabase: Client,
) -> str | None:
    """
    Generate a professional news banner image using Gemini 2.5 Flash Image.

    If source_image_url is provided, it is passed as a visual reference so
    Gemini understands the article's subject matter and generates a contextually
    relevant banner. The prompt follows news-design best practices:
      - Editorial/photojournalistic quality
      - Category-specific color palette with gradient overlay
      - Cinematic lighting, strong depth of field
      - Prominent safe zone on the left/bottom for headline text overlay (CSS)
      - No stock-photo clichés; no watermarks; no generated-image disclaimers
    """
    if not GEMINI_API_KEY:
        print("  ⚠  GEMINI_API_KEY not set — skipping banner generation")
        return None

    # IPL gets its own high-fidelity sports-photography prompt
    is_ipl = category == "ipl"
    has_source = bool(source_image_url)

    if is_ipl:
        prompt = build_ipl_banner_prompt(headline, summary, has_source_image=has_source)
    else:
        palette = CATEGORY_PALETTE.get(category, CATEGORY_PALETTE["finance"])
        prompt = f"""You are a senior news banner designer for "Rizz Jobs", a premium Indian financial news publication.
Create a high-impact, editorial-quality news banner with the headline text PROMINENTLY rendered inside the image.

ARTICLE:
Category: {category.upper()}
Headline: {headline}
Summary: {summary}

DESIGN REQUIREMENTS — follow every rule strictly:

BACKGROUND & STYLE:
1. Aspect ratio: 16:9 landscape (1280×720px). Never square, never portrait.
2. Color palette: dark gradient from {palette}.
3. Style: photojournalistic + editorial. Think Bloomberg, Financial Times, The Economist visual language.
4. Lighting: cinematic — directional, moody, high-contrast.
5. Subject matter: use the REFERENCE IMAGE as context. Enhance it with editorial colour grading — do not replace it.
6. Visual language for {category}:
   - finance: bank facades, currency symbols, financial district skylines, RBI building silhouette
   - business: corporate boardrooms, handshakes, India Gate/Bombay Stock Exchange exteriors
   - markets: stock ticker screens, trading floors, candlestick chart overlays, NSE signage
   - economy: infrastructure, highways, factories, agricultural fields, budget documents
   - startups: modern co-working spaces, smartphones, tech devices, young entrepreneurs

TEXT LAYOUT (CRITICAL — render all text directly in the image):
7. DARK GRADIENT OVERLAY: Apply a smooth dark gradient over the bottom 50% of the image
   (fully opaque black at the bottom edge, fading to transparent at mid-image).
8. HEADLINE: Render the FULL headline text in the lower-left area of the image.
   - Font: bold, modern sans-serif (Inter, Helvetica Neue, or similar clean editorial font)
   - Size: large and impactful — must be the dominant text element
   - Color: crisp white (#FFFFFF) with a subtle drop shadow
   - Padding: ~5% from left edge, ~8% from bottom edge
   - Max width: 85% of image width — wrap to 2-3 lines if needed, never truncate
9. CATEGORY BADGE: Top-left corner — small rounded pill badge with "{category.upper()}" in bold uppercase.
   Use a semi-transparent colored background matching the category palette accent color.
   White text inside the badge. 8% from top and left edges.
10. BRANDING: Bottom-right corner — "Rizz Jobs" in small white text, 60% opacity. Subtle, not distracting.

QUALITY:
11. Ultra-sharp, professional. No blur, no noise, no watermarks.
    No "AI-generated", "created by", or any meta-commentary text anywhere.
12. Avoid: cheesy stock photo clichés, generic office workers, clipart, cartoons.
"""

    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)

        # Build content parts — text prompt always included
        content_parts: list = [prompt]

        # Attach source image as visual reference if available
        if source_image_url:
            img_data = _download_source_image(source_image_url)
            if img_data:
                img_bytes, mime_type = img_data
                content_parts.insert(
                    0,
                    types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                )
                print(f"  🖼  Source image attached as reference ({len(img_bytes)//1024}KB)")

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=content_parts,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9"),
            ),
        )

        for part in response.parts:
            if part.inline_data is not None:
                raw = part.inline_data.data
                if isinstance(raw, str):
                    import base64
                    raw = base64.b64decode(raw)

                # IPL sports photos → quality 90 (preserve action detail)
                # Other categories → quality 82 (good balance of size/sharpness)
                webp_quality = 90 if is_ipl else 82
                img = Image.open(io.BytesIO(raw))
                buf = io.BytesIO()
                img.save(buf, format="WEBP", quality=webp_quality)
                webp_bytes = buf.getvalue()

                # SEO-friendly path: news-banners/{slug}-finance-news-banner.webp
                safe_slug = re.sub(r"[^a-z0-9-]", "-", slug.lower())[:80]
                file_path = f"news-banners/{safe_slug}-{category}-news-banner.webp"

                supabase.storage.from_(BANNER_BUCKET).upload(
                    path=file_path,
                    file=webp_bytes,
                    file_options={"content-type": "image/webp", "upsert": "true"},
                )

                public_url = supabase.storage.from_(BANNER_BUCKET).get_public_url(file_path)
                print(f"  ✅ Banner uploaded: {public_url}")
                return public_url

        print(f"  ⚠  Gemini returned no image for: {headline[:60]}")
        return None

    except Exception as e:
        print(f"  ❌ Banner generation failed for '{headline[:60]}': {e}")
        return None


# ── Slug helpers ──────────────────────────────────────────────────────────────
def generate_slug(headline: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", headline.lower())
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug[:80]


def ensure_unique_slug(base_slug: str, existing_slugs: set) -> str:
    if base_slug not in existing_slugs:
        return base_slug
    suffix = hashlib.md5(base_slug.encode()).hexdigest()[:6]
    return f"{base_slug[:73]}-{suffix}"


# ── Additional authoritative Indian financial RSS sources ─────────────────────
# These supplement whatever is stored in the news_sources DB table.
EXTRA_RSS_SOURCES = [
    {"name": "Economic Times Markets",   "rss_url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",            "category": "markets"},
    {"name": "Moneycontrol Top News",    "rss_url": "https://www.moneycontrol.com/rss/MCtopnews.xml",                                 "category": "finance"},
    {"name": "LiveMint Markets",         "rss_url": "https://www.livemint.com/rss/markets",                                            "category": "markets"},
    {"name": "Business Standard Markets","rss_url": "https://www.business-standard.com/rss/markets-106.rss",                          "category": "markets"},
    {"name": "NDTV Profit",              "rss_url": "https://feeds.feedburner.com/ndtvprofit-latest",                                   "category": "business"},
    {"name": "Financial Express Economy","rss_url": "https://www.financialexpress.com/economy/feed/",                                  "category": "economy"},
    {"name": "VCCircle Startups",        "rss_url": "https://www.vccircle.com/feed",                                                   "category": "startups"},
    {"name": "Economic Times Startups",  "rss_url": "https://economictimes.indiatimes.com/tech/startups/rssfeeds/78570497.cms",        "category": "startups"},
    {"name": "Cricbuzz IPL News",        "rss_url": "https://www.cricbuzz.com/cricket-news/index.xml",                                 "category": "ipl"},
]


# ── Full Article Text Extraction ──────────────────────────────────────────────

def fetch_article_full_text(url: str) -> str:
    """
    Fetch and extract the main article text from a URL using trafilatura.
    Returns clean, readable text stripped of navigation, ads, and boilerplate.
    Falls back to a basic requests+BeautifulSoup extraction if trafilatura is unavailable.
    """
    if not url or not url.startswith("http"):
        return ""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; RizzJobsBot/1.0; +https://rizzjobs.in)"}
        resp = requests.get(url, headers=headers, timeout=12, allow_redirects=True)
        resp.raise_for_status()
        html = resp.text
        if HAS_TRAFILATURA:
            text = trafilatura.extract(html, url=url, include_tables=True, include_links=False, no_fallback=False)
            return (text or "")[:15000]
        # Basic fallback
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)[:15000]
    except Exception:
        return ""


def fact_check_numbers(original_text: str, rewritten_text: str) -> list[str]:
    """
    Check that key numeric values (financial figures, percentages, counts) from
    the original article appear in the rewritten version. Returns list of numbers
    that went missing -- these may indicate AI hallucination.
    """
    # Extract numbers with financial context (e.g. "₹1,200 crore", "12.5%", "2,456 points")
    pattern = r'\b\d[\d,]*\.?\d*\s*(?:%|crore|lakh|billion|million|rs|₹|pts?|points?|bps|basis)?\b'
    orig_nums = set(re.findall(pattern, original_text.lower()))
    rewrit_nums = set(re.findall(pattern, rewritten_text.lower()))
    missing = orig_nums - rewrit_nums
    # Only flag numbers with financial significance (>= 3 chars, contains digit)
    significant_missing = [n for n in missing if len(n) >= 3 and any(c.isdigit() for c in n)]
    return significant_missing


# ── Deduplication ─────────────────────────────────────────────────────────────
def titles_are_similar(a: str, b: str) -> bool:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() >= SIMILARITY_THRESHOLD


# ── Data Fetching ─────────────────────────────────────────────────────────────
def fetch_news_sources(supabase: Client) -> list[dict]:
    result = supabase.table("news_sources").select("*").eq("is_active", True).execute()
    return result.data or []


def fetch_rss_feed(source: dict) -> list[dict]:
    """Parse a single RSS feed and return normalised raw article dicts."""
    try:
        feed = feedparser.parse(source["rss_url"])
        articles = []
        for entry in feed.entries[:20]:  # cap per source to avoid runaway cost
            # Resolve publish time
            published_at = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                published_at = datetime(
                    *entry.published_parsed[:6], tzinfo=timezone.utc
                ).isoformat()
            elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                published_at = datetime(
                    *entry.updated_parsed[:6], tzinfo=timezone.utc
                ).isoformat()
            else:
                published_at = datetime.now(timezone.utc).isoformat()

            # Try to extract image from media_content or enclosures
            image_url = None
            if hasattr(entry, "media_content") and entry.media_content:
                image_url = entry.media_content[0].get("url")
            elif hasattr(entry, "enclosures") and entry.enclosures:
                image_url = entry.enclosures[0].get("href")

            headline = entry.get("title", "").strip()
            if not headline:
                continue

            articles.append({
                "headline": headline,
                "original_url": entry.get("link", ""),
                "raw_summary": entry.get("summary", ""),
                "published_at": published_at,
                "source_name": source["name"],
                "source_url": source["rss_url"],
                "source_category": source["category"],
                "image_url": image_url,
            })
        return articles
    except Exception as e:
        print(f"  ⚠  RSS fetch failed for {source['name']}: {e}")
        return []


def fetch_newsapi(api_key: str) -> list[dict]:
    """Optional: fetch top business headlines from NewsAPI.org."""
    try:
        import requests
        resp = requests.get(
            "https://newsapi.org/v2/top-headlines",
            params={"country": "in", "category": "business", "pageSize": 20, "apiKey": api_key},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        articles = []
        for a in data.get("articles", []):
            if not a.get("title") or a["title"] == "[Removed]":
                continue
            published_at = a.get("publishedAt") or datetime.now(timezone.utc).isoformat()
            articles.append({
                "headline": a["title"].strip(),
                "original_url": a.get("url", ""),
                "raw_summary": a.get("description", ""),
                "published_at": published_at,
                "source_name": a.get("source", {}).get("name", "NewsAPI"),
                "source_url": "https://newsapi.org",
                "source_category": "business",
                "image_url": a.get("urlToImage"),
            })
        return articles
    except Exception as e:
        print(f"  ⚠  NewsAPI fetch failed: {e}")
        return []


def fetch_existing_data(supabase: Client) -> tuple[set, set]:
    """Return (existing_slugs, existing_headlines) for deduplication."""
    result = supabase.table("news_articles").select("slug, headline").execute()
    slugs = {row["slug"] for row in (result.data or [])}
    headlines = {row["headline"] for row in (result.data or [])}
    return slugs, headlines


# ── AI Enrichment ─────────────────────────────────────────────────────────────
ENRICH_PROMPT = """You are a senior editor at a premium Indian financial publication. Write this story in professional journalism structure.

{full_text_block}
Headline: {headline}
Source: {source_name}
Original URL: {original_url}
Suggested category: {source_category}

CATEGORY DEFINITIONS (pick the single best fit):
- finance:  personal finance, banking, insurance, mutual funds, loans, RBI policy, credit, FD/savings
- business: corporate earnings, company results, M&A, industry news, CEO/leadership, supply chain
- economy:  GDP, inflation, government budget, fiscal policy, trade balance, manufacturing, employment
- markets:  ONLY for Nifty/Sensex levels, stock price movements, IPO listings, F&O, commodity/currency trading
- startups: funding rounds, unicorn valuations, new product launches, Indian tech startups, VC/PE deals
- ipl:      Indian Premier League cricket — match results, player performance, team standings, auction news

JOURNALISM STRUCTURE — write each section as specified:
1. dateline: The city this story originates from, in ALL CAPS (e.g. "MUMBAI", "NEW DELHI", "BENGALURU"). Single word or short phrase only.
2. lead: 1-2 sentences (40-80 words) answering WHO, WHAT, WHEN, WHERE, WHY, HOW. This is the most important paragraph — summarise the entire story in it.
3. body: Array of 4-6 paragraphs in inverted pyramid order (most important details first). Each paragraph develops exactly one idea. Preserve ALL numeric values (figures, percentages, dates) from the original exactly. No invented facts.
4. quotes: Array of 1-3 direct quotes from NAMED sources mentioned in the original article. Each quote must be properly attributed. If the original has no quotes, return an empty array — do NOT fabricate quotes.
5. context: One paragraph of background — prior developments, historical context, or market implications that help readers understand why this story matters.
6. conclusion: One forward-looking paragraph — implications, what to watch next, or a brief wrap-up. Does not repeat lead.

ALSO produce:
- content: the full article text assembled as: lead + "\n\n" + body paragraphs joined with "\n\n" + "\n\n" + conclusion (for backward compatibility)
- summary: 2-3 sentence preview for article cards
- headline: 60-80 characters, keyword-rich, no clickbait
- tags: 5-8 short tag phrases (e.g. "RBI rate cut", "Nifty 50", "SBI quarterly results")
- image_alt: descriptive alt text (no 'AI-generated' language)
- seo: {{ meta_title (≤60 chars), meta_description (≤160 chars), meta_keywords (6-10 comma-separated) }}

Respond with ONLY valid JSON (no markdown fences):
{{
  "headline": "60-80 chars",
  "content": "full article text (lead + body + conclusion)",
  "summary": "2-3 sentence preview",
  "category": "finance|business|economy|markets|startups|ipl",
  "tags": ["tag1", "tag2"],
  "image_alt": "descriptive alt text",
  "seo": {{
    "meta_title": "≤60 chars",
    "meta_description": "≤160 chars",
    "meta_keywords": "kw1, kw2, kw3"
  }},
  "article_structure": {{
    "dateline": "CITY NAME",
    "lead": "Lead paragraph...",
    "body": ["Paragraph 1", "Paragraph 2", "Paragraph 3", "Paragraph 4"],
    "quotes": [{{"text": "Quote text here", "source": "Full Name, Title/Organisation"}}],
    "context": "Background context paragraph...",
    "conclusion": "Forward-looking conclusion..."
  }}
}}"""


def enrich_article_with_gpt4o(raw: dict, client: OpenAI, full_text: str = "") -> dict | None:
    """
    Rewrite + categorize + generate SEO metadata via GPT-4o.
    When full_text is provided (from trafilatura extraction), GPT-4o is grounded
    in the actual article content instead of generating from memory.
    A fact-check pass verifies key numeric values are preserved.
    """
    # Build the full-text block for the prompt
    if full_text and len(full_text) > 100:
        full_text_block = (
            f"ORIGINAL ARTICLE TEXT (use as primary source — preserve all numbers exactly):\n"
            f"{full_text[:10000]}\n\n"
        )
    else:
        full_text_block = (
            f"Snippet/Summary: {(raw.get('raw_summary') or '')[:800]}\n"
        )

    prompt = ENRICH_PROMPT.format(
        full_text_block=full_text_block,
        headline=raw["headline"],
        source_name=raw["source_name"],
        original_url=raw.get("original_url", ""),
        source_category=raw.get("source_category", "finance"),
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        enriched = json.loads(response.choices[0].message.content)

        # Fact-check: warn if key numbers from original are missing in rewrite
        if full_text:
            missing_nums = fact_check_numbers(full_text, enriched.get("content", ""))
            if missing_nums:
                print(f"  ⚠  Fact-check warning — {len(missing_nums)} numeric values may be missing in rewrite: {missing_nums[:5]}")

        slug_base = generate_slug(enriched.get("headline") or raw["headline"])
        return {
            "headline": enriched.get("headline", raw["headline"]),
            "content": enriched.get("content", ""),
            "summary": enriched.get("summary", ""),
            "category": enriched.get("category", "finance"),
            "tags": enriched.get("tags", []),
            "image_alt": enriched.get("image_alt", ""),
            "seo": enriched.get("seo", {}),
            "article_structure": enriched.get("article_structure"),
            "slug_base": slug_base,
            "published_at": raw["published_at"],
            "source_name": raw["source_name"],
            "source_url": raw["source_url"],
            "original_url": raw.get("original_url", ""),
            "image_url": raw.get("image_url"),
        }
    except Exception as e:
        print(f"  ✗  GPT-4o enrichment failed for '{raw['headline'][:50]}': {e}")
        return None


# ── Image → WebP ─────────────────────────────────────────────────────────────
def _to_webp_bytes(raw: bytes) -> bytes | None:
    """Convert raw image bytes to WebP ≤40 KB. Returns None on failure."""
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        return None

    if img.width > 800:
        ratio = 800 / img.width
        img = img.resize((800, int(img.height * ratio)), Image.LANCZOS)

    for quality in (80, 60, 40, 20):
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality, method=6)
        if buf.tell() <= TARGET_BYTES:
            return buf.getvalue()

    for scale in (0.75, 0.6, 0.5):
        small = img.resize(
            (max(1, int(img.width * scale)), max(1, int(img.height * scale))),
            Image.LANCZOS,
        )
        for quality in (80, 60, 40, 20):
            buf = io.BytesIO()
            small.save(buf, format="WEBP", quality=quality, method=6)
            if buf.tell() <= TARGET_BYTES:
                return buf.getvalue()

    return None


def process_image_to_webp(image_url: str, slug: str, supabase: Client) -> str | None:
    """Download image_url, convert to WebP ≤40 KB, upload to news-images bucket."""
    try:
        r = requests.get(
            image_url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; RizzJobsBot/1.0)"},
            timeout=15,
            stream=True,
        )
        r.raise_for_status()
        if not r.headers.get("Content-Type", "").startswith("image/"):
            return None
        raw = r.content
    except Exception as e:
        print(f"  ⚠  Image download failed for {slug}: {e}")
        return None

    webp = _to_webp_bytes(raw)
    if not webp:
        print(f"  ⚠  Could not compress image to ≤40KB for {slug}")
        return None

    path = f"articles/{slug}.webp"
    try:
        supabase.storage.from_(NEWS_IMAGES_BUCKET).upload(
            path,
            webp,
            {"content-type": "image/webp", "cache-control": "public, max-age=2592000", "upsert": "true"},
        )
        result = supabase.storage.from_(NEWS_IMAGES_BUCKET).get_public_url(path)
        if isinstance(result, str):
            return result
        if isinstance(result, dict):
            return result.get("publicURL") or result.get("data", {}).get("publicUrl")
        return None
    except Exception as e:
        print(f"  ⚠  WebP upload failed for {slug}: {e}")
        return None


# ── Database Upsert ───────────────────────────────────────────────────────────
def upsert_articles(articles: list[dict], supabase: Client) -> int:
    """Upsert enriched articles to news_articles table. Returns count inserted."""
    inserted = 0
    for a in articles:
        row = {
            "slug": a["slug"],
            "headline": a["headline"],
            "content": a["content"],
            "summary": a["summary"],
            "category": a.get("category", "finance"),
            "source_name": a["source_name"],
            "source_url": a["source_url"],
            "original_url": a["original_url"],
            "published_at": a["published_at"],
            "image_url": a.get("image_url"),
            "image_webp": a.get("image_webp"),
            "image_alt": a.get("image_alt") or "",
            "tags": a.get("tags", []),
            "seo": a.get("seo", {}),
            "article_structure": a.get("article_structure"),
            "is_published": True,
        }
        try:
            supabase.table("news_articles").upsert(
                row, on_conflict="slug", returning="minimal"
            ).execute()
            inserted += 1
        except Exception as e:
            print(f"  ✗  Upsert failed for '{a['headline'][:50]}': {e}")
    return inserted


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Rizz Jobs News Scraper")
    parser.add_argument("--limit", type=int, default=15,
                        help="Max articles to enrich per run (default: 15)")
    parser.add_argument("--no-banners", action="store_true",
                        help="Skip banner generation (faster, lower cost)")
    args = parser.parse_args()

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

    print(f"🗞  Rizz Jobs News Scraper — limit={args.limit}")
    if HAS_TRAFILATURA:
        print("   📄 trafilatura: available (full article extraction enabled)")
    else:
        print("   ⚠  trafilatura not installed — using RSS summaries only (pip install trafilatura)")

    # 1. Load active RSS sources from DB + extra hardcoded sources
    db_sources = fetch_news_sources(supabase)
    db_source_urls = {s["rss_url"] for s in db_sources}
    # Add EXTRA_RSS_SOURCES only if not already in DB (avoid duplicates)
    extra_sources = [s for s in EXTRA_RSS_SOURCES if s["rss_url"] not in db_source_urls]
    sources = db_sources + extra_sources
    print(f"   {len(db_sources)} DB sources + {len(extra_sources)} extra sources = {len(sources)} total")

    # 2. Load existing data for deduplication
    existing_slugs, existing_headlines = fetch_existing_data(supabase)
    print(f"   {len(existing_slugs)} existing articles in DB")

    # 3. Gather raw articles from all RSS feeds
    all_raw: list[dict] = []
    for source in sources:
        items = fetch_rss_feed(source)
        print(f"   {source['name']}: {len(items)} items")
        all_raw.extend(items)

    # 4. Optionally fetch from NewsAPI
    if NEWSAPI_KEY:
        newsapi_items = fetch_newsapi(NEWSAPI_KEY)
        print(f"   NewsAPI: {len(newsapi_items)} items")
        all_raw.extend(newsapi_items)

    # 4b. Filter to today's articles only (IST = UTC+5:30)
    today_ist = datetime.now(IST).date()

    def is_today_ist(iso_string: str) -> bool:
        try:
            dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(IST).date() == today_ist
        except Exception:
            return True  # include if date cannot be parsed

    before = len(all_raw)
    all_raw = [a for a in all_raw if is_today_ist(a["published_at"])]
    print(f"   {len(all_raw)}/{before} articles are from today ({today_ist} IST)")

    # 5. Deduplicate candidates
    candidates: list[dict] = []
    seen_titles: list[str] = []

    for raw in all_raw:
        headline = raw["headline"]
        if not headline:
            continue
        # Skip if too similar to an existing DB headline
        if any(titles_are_similar(headline, h) for h in existing_headlines):
            continue
        # Skip if too similar to another candidate in this run
        if any(titles_are_similar(headline, h) for h in seen_titles):
            continue
        seen_titles.append(headline)
        candidates.append(raw)

    print(f"\n   {len(candidates)} unique new candidates after deduplication")

    # Balance candidates across categories so no single category dominates.
    # Use source_category as a proxy (GPT-4o may adjust later).
    # Each category gets at most ceil(limit / num_categories) slots.
    num_cats = len(NEWS_CATEGORIES)
    per_cat_limit = max(1, -(-args.limit // num_cats))  # ceiling division
    cat_counts: dict[str, int] = {c: 0 for c in NEWS_CATEGORIES}
    balanced: list[dict] = []
    overflow: list[dict] = []  # articles whose category is already full
    for c in candidates:
        cat = c.get("source_category", "finance")
        if cat not in cat_counts:
            cat = "finance"
        if cat_counts[cat] < per_cat_limit:
            balanced.append(c)
            cat_counts[cat] += 1
        else:
            overflow.append(c)
    # Fill remaining slots from overflow (maintains total = limit)
    remaining = args.limit - len(balanced)
    balanced.extend(overflow[:remaining])
    candidates = balanced[:args.limit]
    print(f"   Balanced selection: {cat_counts} (per-cat limit={per_cat_limit})")
    print(f"   Enriching {len(candidates)} articles with GPT-4o...\n")

    # 6. Fetch full article text for grounded enrichment (best-effort, non-blocking)
    print(f"\n   📄 Fetching full article text for {len(candidates)} candidates...")
    for raw in candidates:
        url = raw.get("original_url", "")
        if url:
            text = fetch_article_full_text(url)
            raw["full_text"] = text
            if text:
                print(f"   ✓ {len(text)} chars extracted: {url[:60]}...")
        else:
            raw["full_text"] = ""

    # 7. Enrich each candidate + generate banner
    generate_banners = not args.no_banners and bool(GEMINI_API_KEY)
    if generate_banners:
        print(f"\n   🎨 Banner generation: ON (Gemini 2.5 Flash Image)")
    else:
        print(f"\n   🎨 Banner generation: OFF")

    enriched_articles: list[dict] = []
    for i, raw in enumerate(candidates, 1):
        print(f"   [{i}/{len(candidates)}] {raw['headline'][:65]}")
        full_text = raw.get("full_text", "")
        enriched = enrich_article_with_gpt4o(raw, openai_client, full_text=full_text)
        if enriched:
            slug = ensure_unique_slug(enriched["slug_base"], existing_slugs)
            enriched["slug"] = slug
            existing_slugs.add(slug)
            existing_headlines.add(enriched["headline"])

            # Generate AI banner using source image as visual reference
            if generate_banners:
                banner_url = generate_news_banner(
                    headline=enriched["headline"],
                    summary=enriched["summary"],
                    category=enriched.get("category", "finance"),
                    slug=slug,
                    source_image_url=raw.get("image_url"),
                    supabase=supabase,
                )
                if banner_url:
                    enriched["image_url"] = banner_url
                    enriched["image_alt"] = f"{enriched['headline']} — Rizz Jobs"

            # Convert image to WebP ≤40KB and store in news-images bucket
            img_src = enriched.get("image_url") or raw.get("image_url")
            if img_src:
                webp_url = process_image_to_webp(img_src, slug, supabase)
                if webp_url:
                    enriched["image_webp"] = webp_url
                    print(f"   ✓ WebP cached: {webp_url[-50:]}")

            enriched_articles.append(enriched)

    # 7. Upsert to Supabase
    if enriched_articles:
        count = upsert_articles(enriched_articles, supabase)
        print(f"\n✅  Done: {count}/{len(enriched_articles)} articles upserted to news_articles")
    else:
        print("\n✅  Done: no new articles to insert")


if __name__ == "__main__":
    main()
