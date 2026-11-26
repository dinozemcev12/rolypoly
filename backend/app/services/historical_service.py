import hashlib
import json
from pathlib import Path
from typing import Tuple
import httpx

HISTORICAL_YEARS = [
    -123000, -10000, -8000, -5000, -4000, -3000, -2000, -1500, -1000,
    -500, -400, -323, -300, -200, -100, -1,
    100, 200, 300, 400, 500, 600, 700, 800, 900,
    1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530,
    1600, 1650, 1700, 1715, 1783, 1800, 1815, 1880, 1900,
    1914, 1920, 1938, 1945, 1960, 1994,
]

PALETTE = [
    "#4B91D1", "#3EAC83", "#D6A34C", "#D65C65", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
    "#06B6D4", "#EAB308", "#EF4444", "#10B981", "#3B82F6",
]

CACHE_DIR = Path("data/historical")


def find_closest_historical_year(year: int) -> int:
    return min(HISTORICAL_YEARS, key=lambda y: abs(y - year))


def _year_slug(year: int) -> str:
    return f"bc{abs(year)}" if year < 0 else str(year)


def color_for_country_name(name: str) -> str:
    digest = hashlib.md5(name.encode("utf-8")).hexdigest()
    idx = int(digest[:8], 16) % len(PALETTE)
    return PALETTE[idx]


def get_historical_geojson(requested_year: int) -> Tuple[int, dict]:
    matched_year = find_closest_historical_year(requested_year)
    slug = _year_slug(matched_year)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"world_{slug}.geojson"

    if cache_file.exists():
        return matched_year, json.loads(cache_file.read_text(encoding="utf-8"))

    url = f"https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_{slug}.geojson"
    resp = httpx.get(url, timeout=30.0, follow_redirects=True)
    resp.raise_for_status()
    data = resp.json()
    cache_file.write_text(json.dumps(data), encoding="utf-8")
    return matched_year, data
