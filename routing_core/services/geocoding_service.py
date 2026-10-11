import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Predefined dictionary of major freight hubs and cities for instant resolution and offline reliability
FREIGHT_HUBS = {
    "chicago": {"name": "Chicago, IL", "lat": 41.8781, "lon": -87.6298},
    "denver": {"name": "Denver, CO", "lat": 39.7392, "lon": -104.9903},
    "cheyenne": {"name": "Cheyenne, WY", "lat": 41.1399, "lon": -104.8202},
    "salt lake city": {"name": "Salt Lake City, UT", "lat": 40.7608, "lon": -111.8910},
    "dallas": {"name": "Dallas, TX", "lat": 32.7767, "lon": -96.7970},
    "kansas city": {"name": "Kansas City, MO", "lat": 39.0997, "lon": -94.5786},
    "atlanta": {"name": "Atlanta, GA", "lat": 33.7490, "lon": -84.3880},
    "los angeles": {"name": "Los Angeles, CA", "lat": 34.0522, "lon": -118.2437},
    "seattle": {"name": "Seattle, WA", "lat": 47.6062, "lon": -122.3321},
    "minneapolis": {"name": "Minneapolis, MN", "lat": 44.9778, "lon": -93.2650},
    "st louis": {"name": "St. Louis, MO", "lat": 38.6270, "lon": -90.1994},
    "indianapolis": {"name": "Indianapolis, IN", "lat": 39.7684, "lon": -86.1580},
    "phoenix": {"name": "Phoenix, AZ", "lat": 33.4484, "lon": -112.0740},
    "new york": {"name": "New York, NY", "lat": 40.7128, "lon": -74.0060},
    "omaha": {"name": "Omaha, NE", "lat": 41.2565, "lon": -95.9345},
}

class GeocodingService:
    @staticmethod
    def geocode(query: str) -> Optional[Dict[str, Any]]:
        """
        Geocodes a location string using OpenStreetMap Nominatim with fallback to cached hubs.
        Returns a dict: {"name": str, "lat": float, "lon": float}
        """
        if not query or not query.strip():
            return None

        cleaned = query.strip().lower()

        # Check local hub dictionary first
        for key, hub in FREIGHT_HUBS.items():
            if key in cleaned or cleaned in key:
                return {"name": hub["name"], "lat": hub["lat"], "lon": hub["lon"]}

        # Attempt Nominatim OSM search
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": query,
                "format": "json",
                "limit": 1,
                "addressdetails": 1,
            }
            headers = {
                "User-Agent": "SpotterAI-TruckRouter/1.0 (academic-evaluation)"
            }
            resp = requests.get(url, params=params, headers=headers, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    first = data[0]
                    return {
                        "name": first.get("display_name", query),
                        "lat": float(first["lat"]),
                        "lon": float(first["lon"]),
                    }
        except Exception as e:
            logger.warning(f"Nominatim geocoding failed for '{query}': {e}")

        # Fallback coordinate if nothing matched
        return None
