import asyncio
import os
from urllib.parse import urlparse
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import httpx
import requests as req_sync
from dotenv import load_dotenv

load_dotenv()


# ─── URL Validation ──────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}

GOV_TLDS = [".gov.in", ".nic.in", ".edu.in", ".ac.in"]


def validate_url(url: str, timeout: int = 8) -> bool:
    """
    Returns True if the URL responds with a non-error HTTP status (<400).
    Tries HEAD first; falls back to streaming GET for servers that reject HEAD.
    """
    if not url:
        return False
    if not url.startswith("http"):
        return False
    if "google.com" in url or "example.com" in url:
        return False

    try:
        r = req_sync.head(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        if r.status_code < 400:
            return True
        if r.status_code in (403, 405, 501):
            r = req_sync.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True, stream=True)
            r.close()
            return r.status_code < 400
        return False
    except Exception:
        try:
            r = req_sync.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True, stream=True)
            r.close()
            return r.status_code < 400
        except Exception:
            return False


async def validate_url_async(url: str, client: httpx.AsyncClient) -> bool:
    """Async variant for batch validation."""
    if not url or not url.startswith("http") or "google.com" in url:
        return False
    try:
        r = await client.head(url, follow_redirects=True, timeout=8)
        if r.status_code < 400:
            return True
        if r.status_code in (403, 405, 501):
            r = await client.get(url, follow_redirects=True, timeout=8)
            return r.status_code < 400
        return False
    except Exception:
        try:
            r = await client.get(url, follow_redirects=True, timeout=8)
            return r.status_code < 400
        except Exception:
            return False


def extract_domain(url: str) -> str:
    """Extract netloc from a URL, e.g. 'https://upsc.gov.in/path' → 'upsc.gov.in'."""
    try:
        return urlparse(url).netloc.lower().removeprefix("www.")
    except Exception:
        return ""


# ─── Serper.dev URL Search (replaces DuckDuckGo HTML scraping) ───────────────

SERPER_API_KEY = os.getenv("SERPER_API_KEY")


def search_official_url(title: str, hint_domain: str = None) -> str | None:
    """
    Uses Serper.dev (Google Search API) to find the official government
    notification page. Far more reliable than DuckDuckGo HTML scraping:
    no rate limits, no CAPTCHAs, real-time Google results.

    Falls back to basic DuckDuckGo if SERPER_API_KEY is not set.
    """
    if SERPER_API_KEY:
        return _search_via_serper(title, hint_domain)
    return _search_via_duckduckgo_fallback(title, hint_domain)


def _search_via_serper(title: str, hint_domain: str = None) -> str | None:
    """Primary URL discovery via Serper.dev Google Search API."""
    queries = []
    if hint_domain and any(d in hint_domain for d in [".gov.in", ".nic.in"]):
        queries.append(f'site:{hint_domain} "{title}" recruitment 2026')
    queries.append(f'"{title}" site:gov.in OR site:nic.in official notification 2026')
    queries.append(f'{title} official recruitment notification apply online 2026 gov.in')

    for query in queries:
        try:
            resp = req_sync.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                json={"q": query, "gl": "in", "hl": "en", "num": 5},
                timeout=12,
            )
            if resp.status_code != 200:
                print(f"    ⚠️  Serper API returned {resp.status_code}")
                continue

            data = resp.json()
            for result in data.get("organic", []):
                url = result.get("link", "")
                if not url or not url.startswith("http"):
                    continue
                if not any(d in url.lower() for d in GOV_TLDS):
                    continue
                if validate_url(url):
                    print(f"    🔍 Serper found valid URL: {url}")
                    return url

        except Exception as e:
            print(f"    ⚠️  Serper search error: {e}")
            continue

    return None


def _search_via_duckduckgo_fallback(title: str, hint_domain: str = None) -> str | None:
    """
    Fallback to DuckDuckGo HTML scraping only when SERPER_API_KEY is absent.
    Not recommended for production -- set SERPER_API_KEY instead.
    """
    from urllib.parse import parse_qs, unquote

    headers = {
        "User-Agent": HEADERS["User-Agent"],
        "Accept": HEADERS["Accept"],
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://duckduckgo.com/",
    }

    queries = []
    if hint_domain and any(d in hint_domain for d in [".gov.in", ".nic.in"]):
        queries.append(f"site:{hint_domain} recruitment notification 2025 OR 2026")
    queries.append(f'"{title}" official notification site:gov.in OR site:nic.in')
    queries.append(f"{title} recruitment 2026 official apply online notification")

    for query in queries:
        try:
            resp = req_sync.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
                headers=headers,
                timeout=12,
            )
            if resp.status_code != 200:
                continue

            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", class_="result__a"):
                href = a.get("href", "")
                actual_url = href
                if "uddg=" in href:
                    qs = parse_qs(href.split("?", 1)[1] if "?" in href else "")
                    actual_url = unquote(qs.get("uddg", [""])[0])
                if not actual_url or not actual_url.startswith("http"):
                    continue
                if not any(d in actual_url for d in GOV_TLDS):
                    continue
                if validate_url(actual_url):
                    print(f"    🔍 DuckDuckGo found valid URL: {actual_url}")
                    return actual_url
        except Exception as e:
            print(f"    ⚠️  DuckDuckGo search error: {e}")
            continue

    return None


# ─── Page Fetcher (single page) ───────────────────────────────────────────────

async def fetch_page_content(url: str, capture_img: bool = False, page=None) -> dict:
    """
    Fetches the HTML content of a URL using a headless Chromium browser.
    If `page` is provided (from a persistent context), reuses it instead of
    creating a new browser — much faster for batch fetching.
    """
    if page is not None:
        return await _fetch_with_page(url, page, capture_img)
    return await _fetch_standalone(url, capture_img)


async def _fetch_with_page(url: str, page, capture_img: bool) -> dict:
    """Fetch using an already-open Playwright page object."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        await asyncio.sleep(3)
        content = await page.content()
        title = await page.title()
        screenshot_b64 = None
        if capture_img:
            import base64
            screenshot_b64 = base64.b64encode(await page.screenshot(full_page=False)).decode()
        return {"url": url, "title": title, "html": content, "screenshot": screenshot_b64, "status": "success"}
    except Exception as e:
        return {"url": url, "status": "error", "error": str(e)}


async def _fetch_standalone(url: str, capture_img: bool) -> dict:
    """Fetch by launching a fresh browser (used when no shared context is available)."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=HEADERS["User-Agent"],
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            await asyncio.sleep(3)
            content = await page.content()
            title = await page.title()
            screenshot_b64 = None
            if capture_img:
                import base64
                screenshot_b64 = base64.b64encode(await page.screenshot(full_page=False)).decode()
            return {"url": url, "title": title, "html": content, "screenshot": screenshot_b64, "status": "success"}
        except Exception as e:
            return {"url": url, "status": "error", "error": str(e)}
        finally:
            await browser.close()


# ─── Batch Source Fetcher (parallel, single browser context) ─────────────────

async def fetch_all_sources(sources: list[dict]) -> list[dict]:
    """
    Fetch all source URLs in parallel using a single shared Playwright browser
    context. Dramatically faster than opening a new browser per source.

    Returns list of result dicts in the same order as `sources`.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=HEADERS["User-Agent"],
            viewport={"width": 1280, "height": 800},
        )
        try:
            tasks = []
            for source in sources:
                page = await context.new_page()
                tasks.append(_fetch_source_page(page, source))
            results = await asyncio.gather(*tasks, return_exceptions=True)
            # Attach source metadata to results
            enriched = []
            for source, result in zip(sources, results):
                if isinstance(result, Exception):
                    enriched.append({"url": source["url"], "status": "error", "error": str(result), "source_name": source["name"]})
                else:
                    result["source_name"] = source["name"]
                    enriched.append(result)
            return enriched
        finally:
            await browser.close()


async def _fetch_source_page(page, source: dict) -> dict:
    """Helper: fetch one source on an existing page, then close that page."""
    try:
        await page.goto(source["url"], wait_until="domcontentloaded", timeout=45000)
        await asyncio.sleep(3)
        content = await page.content()
        title = await page.title()
        return {"url": source["url"], "title": title, "html": content, "status": "success"}
    except Exception as e:
        return {"url": source["url"], "status": "error", "error": str(e)}
    finally:
        await page.close()


if __name__ == "__main__":
    test_url = "https://upsc.gov.in/whats-new"
    result = asyncio.run(fetch_page_content(test_url))
    print(f"Fetched '{result.get('title')}' ({len(result.get('html', ''))} bytes)")
