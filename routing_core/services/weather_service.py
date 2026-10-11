import logging
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

WMO_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Freezing Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    62: "Moderate Rain",
    63: "Heavy Rain",
    65: "Violent Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail",
}

class WeatherService:
    @classmethod
    def fetch_checkpoints_weather(cls, checkpoints: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Fetches hourly weather forecast for a list of checkpoints from Open-Meteo
        and matches each checkpoint to its specific estimated arrival time (ETA).
        """
        if not checkpoints:
            return []

        # Batch queries in chunks of up to 40 points
        chunk_size = 40
        for i in range(0, len(checkpoints), chunk_size):
            chunk = checkpoints[i : i + chunk_size]
            lats = [f"{cp['lat']:.4f}" for cp in chunk]
            lons = [f"{cp['lon']:.4f}" for cp in chunk]

            try:
                url = "https://api.open-meteo.com/v1/forecast"
                params = {
                    "latitude": ",".join(lats),
                    "longitude": ",".join(lons),
                    "hourly": "temperature_2m,wind_speed_10m,precipitation,rain,snowfall,weather_code",
                    "wind_speed_unit": "mph",
                    "precipitation_unit": "inch",
                    "forecast_days": 3,
                    "timezone": "UTC",
                }
                resp = requests.get(url, params=params, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    # If multiple locations, Open-Meteo returns a list of dicts.
                    # If single location in chunk, it returns a single dict.
                    forecast_list = data if isinstance(data, list) else [data]

                    for cp, fc in zip(chunk, forecast_list):
                        hourly = fc.get("hourly", {})
                        cls._match_weather_to_eta(cp, hourly)
                else:
                    logger.warning(f"Open-Meteo error {resp.status_code}: {resp.text[:100]}")
                    for cp in chunk:
                        cls._fallback_weather(cp)
            except Exception as e:
                logger.warning(f"Failed to query Open-Meteo: {e}")
                for cp in chunk:
                    cls._fallback_weather(cp)

        return checkpoints

    @classmethod
    def _match_weather_to_eta(cls, checkpoint: Dict[str, Any], hourly: Dict[str, Any]):
        """Matches checkpoint's ETA timestamp to the closest hour in the hourly forecast."""
        time_strings = hourly.get("time", [])
        if not time_strings:
            cls._fallback_weather(checkpoint)
            return

        eta_iso = checkpoint.get("eta_iso", "")
        try:
            eta_dt = datetime.fromisoformat(eta_iso.replace("Z", "+00:00"))
            if eta_dt.tzinfo is None:
                eta_dt = eta_dt.replace(tzinfo=timezone.utc)
        except Exception:
            eta_dt = datetime.now(timezone.utc)

        # Find closest index
        closest_idx = 0
        min_diff = float("inf")
        for idx, t_str in enumerate(time_strings):
            try:
                # Open-Meteo time format is 'YYYY-MM-DDTHH:00'
                t_dt = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
                diff = abs((t_dt - eta_dt).total_seconds())
                if diff < min_diff:
                    min_diff = diff
                    closest_idx = idx
            except Exception:
                continue

        wind_speed = hourly.get("wind_speed_10m", [0.0])[closest_idx] or 0.0
        rain = hourly.get("rain", [0.0])[closest_idx] or 0.0
        precip = hourly.get("precipitation", [0.0])[closest_idx] or 0.0
        # If rain is 0 but precipitation > 0 and temp > 32, use precipitation
        effective_rain = rain if rain > 0 else (precip if hourly.get("temperature_2m", [50])[closest_idx] >= 32 else 0.0)
        snow = hourly.get("snowfall", [0.0])[closest_idx] or 0.0
        temp = hourly.get("temperature_2m", [55])[closest_idx] or 55.0
        wmo = hourly.get("weather_code", [0])[closest_idx] or 0

        checkpoint["weather"] = {
            "wind_mph": round(float(wind_speed), 1),
            "rain_rate_in_hr": round(float(effective_rain), 2),
            "snow_rate_in_hr": round(float(snow), 2),
            "temp_f": round(float(temp * 1.8 + 32.0 if temp < 45 and "fahrenheit" not in str(temp) else temp), 1),
            "weather_code": int(wmo),
            "condition": WMO_CODES.get(int(wmo), "Clear"),
        }

    @classmethod
    def _fallback_weather(cls, checkpoint: Dict[str, Any]):
        """Provides default clear conditions if weather service is offline."""
        checkpoint["weather"] = {
            "wind_mph": 12.0,
            "rain_rate_in_hr": 0.0,
            "snow_rate_in_hr": 0.0,
            "temp_f": 62.0,
            "weather_code": 0,
            "condition": "Clear",
        }

    @classmethod
    def generate_corridor_heatmap(
        cls, 
        routes: List[Dict[str, Any]], 
        hours_ahead: int = 48
    ) -> List[Dict[str, Any]]:
        """
        Generates a 0-48 hour corridor weather grid along all routes for the interactive map forecast slider.
        Returns hourly slices with geographic points and their weather intensities.
        """
        # Collect sample points along all route geometries
        corridor_coords = []
        for r in routes:
            coords = r.get("coordinates", [])
            step = max(1, len(coords) // 10)
            for c in coords[::step]:
                corridor_coords.append((round(c[0], 3), round(c[1], 3)))

        # Deduplicate points close to each other
        unique_coords = []
        seen = set()
        for lat, lon in corridor_coords:
            key = (round(lat, 2), round(lon, 2))
            if key not in seen:
                seen.add(key)
                unique_coords.append((lat, lon))

        # Limit to max 25 grid points for fast, lightweight performance
        grid_sample = unique_coords[:25]
        if not grid_sample:
            return []

        lats = [f"{pt[0]:.3f}" for pt in grid_sample]
        lons = [f"{pt[1]:.3f}" for pt in grid_sample]

        hourly_frames = []
        try:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": ",".join(lats),
                "longitude": ",".join(lons),
                "hourly": "wind_speed_10m,precipitation,rain,snowfall",
                "wind_speed_unit": "mph",
                "precipitation_unit": "inch",
                "forecast_days": 3,
                "timezone": "UTC",
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                forecast_list = data if isinstance(data, list) else [data]

                # Collect time frames up to hours_ahead
                num_hours = min(hours_ahead + 1, 49)
                for h in range(num_hours):
                    points = []
                    for pt_idx, (lat, lon) in enumerate(grid_sample):
                        fc = forecast_list[pt_idx] if pt_idx < len(forecast_list) else forecast_list[0]
                        hourly = fc.get("hourly", {})
                        winds = hourly.get("wind_speed_10m", [])
                        rains = hourly.get("rain", [])
                        snows = hourly.get("snowfall", [])

                        w = winds[h] if h < len(winds) and winds[h] is not None else 10.0
                        r = rains[h] if h < len(rains) and rains[h] is not None else 0.0
                        s = snows[h] if h < len(snows) and snows[h] is not None else 0.0

                        # Normalized risk intensity (0.0 to 1.0)
                        intensity = max(
                            min(w / 55.0, 1.0),
                            min(r / 1.0, 1.0),
                            min(s / 3.0, 1.0)
                        )

                        points.append({
                            "lat": lat,
                            "lon": lon,
                            "wind_mph": round(float(w), 1),
                            "rain_in": round(float(r), 2),
                            "snow_in": round(float(s), 2),
                            "intensity": round(float(intensity), 2),
                        })

                    hourly_frames.append({
                        "hour": h,
                        "points": points,
                    })
        except Exception as e:
            logger.warning(f"Corridor heatmap query failed: {e}")

        # Synthetic fallback if empty
        if not hourly_frames:
            for h in range(hours_ahead + 1):
                hourly_frames.append({
                    "hour": h,
                    "points": [
                        {
                            "lat": pt[0],
                            "lon": pt[1],
                            "wind_mph": 15.0,
                            "rain_in": 0.0,
                            "snow_in": 0.0,
                            "intensity": 0.25,
                        }
                        for pt in grid_sample
                    ],
                })

        return hourly_frames
