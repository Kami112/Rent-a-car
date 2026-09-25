#!/usr/bin/env python3
"""Find potential clients (car rental, travel agencies, ...) in Saudi Arabia and the UAE.

Uses the official Google Places API (Text Search, "Places API (New)") and writes a CSV
you can import into lead-tracker.html. Businesses without a website are marked as
"hot" leads because they need exactly what you sell.

Setup (one time):
  1. Create a Google Cloud project, enable "Places API (New)", create an API key.
     https://developers.google.com/maps/documentation/places/web-service/text-search
  2. export GOOGLE_PLACES_API_KEY="your-key"

Usage:
  python3 lead_finder.py                                  # default niches x default cities
  python3 lead_finder.py --niche "car rental" --city Riyadh --city Dubai
  python3 lead_finder.py --niche "travel agency" --niche "umrah company" --out umrah.csv

Only standard-library Python 3.8+ is needed. Google bills per request after the free
monthly credit, so check your quota before running very large searches.
"""
import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request

API_URL = "https://places.googleapis.com/v1/places:searchText"
FIELDS = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.googleMapsUri",
    "places.businessStatus",
    "nextPageToken",
])

DEFAULT_NICHES = ["car rental", "travel agency", "umrah company", "tourism company"]
DEFAULT_CITIES = ["Riyadh", "Jeddah", "Dammam", "Makkah", "Madinah", "Dubai", "Abu Dhabi", "Sharjah"]
COUNTRY = {
    "Riyadh": "SA", "Jeddah": "SA", "Dammam": "SA", "Khobar": "SA", "Makkah": "SA", "Madinah": "SA",
    "Taif": "SA", "Abha": "SA", "Tabuk": "SA", "AlUla": "SA",
    "Dubai": "AE", "Abu Dhabi": "AE", "Sharjah": "AE", "Ajman": "AE", "Ras Al Khaimah": "AE", "Al Ain": "AE",
}

CSV_COLUMNS = ["name", "niche", "city", "phone", "website", "rating", "reviews", "priority",
               "address", "maps_url", "place_id"]


def search(api_key, query, region, language, max_pages):
    """Yield place dicts for one text query, following up to max_pages result pages."""
    token = None
    for _ in range(max_pages):
        body = {"textQuery": query, "languageCode": language, "pageSize": 20}
        if region:
            body["regionCode"] = region
        if token:
            body["pageToken"] = token
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": FIELDS,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.load(resp)
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", "replace")
            sys.exit(f"Google Places API error {err.code} for '{query}':\n{detail}")
        for place in data.get("places", []):
            yield place
        token = data.get("nextPageToken")
        if not token:
            break
        time.sleep(2)  # the next-page token takes a moment to become valid


def priority(place):
    """hot = no website, warm = website but few reviews, normal = the rest."""
    if not place.get("websiteUri"):
        return "hot"
    if place.get("userRatingCount", 0) < 30:
        return "warm"
    return "normal"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--niche", action="append", help="business type to search (repeatable)")
    ap.add_argument("--city", action="append", help="city to search (repeatable)")
    ap.add_argument("--language", default="en", help="result language: en or ar (default en)")
    ap.add_argument("--pages", type=int, default=3, help="result pages per query, 20 results each (max 3)")
    ap.add_argument("--out", default="leads.csv", help="output CSV file (default leads.csv)")
    ap.add_argument("--only-hot", action="store_true", help="keep only businesses without a website")
    args = ap.parse_args()

    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        sys.exit("Set GOOGLE_PLACES_API_KEY first (see the top of this file).")

    niches = args.niche or DEFAULT_NICHES
    cities = args.city or DEFAULT_CITIES
    seen, rows = set(), []

    for city in cities:
        for niche in niches:
            query = f"{niche} in {city}"
            before = len(rows)
            for place in search(api_key, query, COUNTRY.get(city), args.language, min(args.pages, 3)):
                pid = place.get("id")
                if not pid or pid in seen or place.get("businessStatus") == "CLOSED_PERMANENTLY":
                    continue
                seen.add(pid)
                row = {
                    "name": place.get("displayName", {}).get("text", ""),
                    "niche": niche,
                    "city": city,
                    "phone": place.get("internationalPhoneNumber") or place.get("nationalPhoneNumber", ""),
                    "website": place.get("websiteUri", ""),
                    "rating": place.get("rating", ""),
                    "reviews": place.get("userRatingCount", 0),
                    "priority": priority(place),
                    "address": place.get("formattedAddress", ""),
                    "maps_url": place.get("googleMapsUri", ""),
                    "place_id": pid,
                }
                if args.only_hot and row["priority"] != "hot":
                    continue
                rows.append(row)
            print(f"{query}: {len(rows) - before} new leads")

    order = {"hot": 0, "warm": 1, "normal": 2}
    rows.sort(key=lambda r: (order[r["priority"]], r["city"], r["name"]))
    # utf-8-sig so Excel opens Arabic names correctly
    with open(args.out, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    hot = sum(r["priority"] == "hot" for r in rows)
    print(f"\nSaved {len(rows)} leads to {args.out} ({hot} without a website).")
    print("Next: open lead-tracker.html and click 'Import CSV'.")


if __name__ == "__main__":
    main()
