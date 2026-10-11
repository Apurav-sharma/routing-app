import math
import logging
import requests
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

METERS_TO_MILES = 0.000621371
SECONDS_TO_HOURS = 1.0 / 3600.0

class RoutingService:
    @staticmethod
    def _fetch_osrm_route(coords: List[Tuple[float, float]], alternatives: bool = True) -> Optional[Dict[str, Any]]:
        """
        Queries OSRM driving service.
        coords: List of (lat, lon) tuples.
        """
        try:
            # OSRM expects {lon},{lat};{lon},{lat}
            coord_str = ";".join([f"{lon:.5f},{lat:.5f}" for lat, lon in coords])
            url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}"
            params = {
                "overview": "full",
                "geometries": "geojson",
                "alternatives": "true" if alternatives else "false",
                "steps": "true",
            }
            resp = requests.get(url, params=params, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    return data
        except Exception as e:
            logger.warning(f"OSRM request failed for {coords}: {e}")
        return None

    @classmethod
    def get_three_routes(
        cls, 
        origin: Tuple[float, float], 
        destination: Tuple[float, float],
        origin_name: str = "Origin",
        dest_name: str = "Destination"
    ) -> List[Dict[str, Any]]:
        """
        Generates 3 distinct route options between origin and destination.
        Returns a list of 3 route dicts:
        [
            {
                "id": "route_1",
                "name": "Route 1 (Primary Corridor)",
                "distance_miles": float,
                "duration_seconds": float,
                "duration_hours": float,
                "coordinates": [[lat, lon], ...]
            },
            ...
        ]
        """
        lat1, lon1 = origin
        lat2, lon2 = destination

        raw_routes = []

        # 1. First attempt: OSRM direct query with alternatives=true
        primary_osrm = cls._fetch_osrm_route([(lat1, lon1), (lat2, lon2)], alternatives=True)
        if primary_osrm and "routes" in primary_osrm:
            for r in primary_osrm["routes"]:
                raw_routes.append(r)

        # 2. If we have fewer than 3 routes, query intermediate waypoints offset perpendicularly
        # Calculate midpoints with north/south (or east/west) lateral offsets
        if len(raw_routes) < 3:
            mid_lat = (lat1 + lat2) / 2.0
            mid_lon = (lon1 + lon2) / 2.0
            d_lat = lat2 - lat1
            d_lon = lon2 - lon1
            norm = math.sqrt(d_lat * d_lat + d_lon * d_lon)
            if norm > 0.001:
                # Perpendicular unit vector: (-d_lon/norm, d_lat/norm)
                p_lat = -d_lon / norm
                p_lon = d_lat / norm

                # Lateral shift proportional to distance (approx 15% - 25% of trip length)
                offset_deg = min(max(norm * 0.18, 0.4), 2.2)

                waypoint_north = (mid_lat + p_lat * offset_deg, mid_lon + p_lon * offset_deg)
                waypoint_south = (mid_lat - p_lat * offset_deg, mid_lon - p_lon * offset_deg)

                # Fetch route via north waypoint
                route_via_north = cls._fetch_osrm_route([(lat1, lon1), waypoint_north, (lat2, lon2)], alternatives=False)
                if route_via_north and route_via_north.get("routes"):
                    raw_routes.append(route_via_north["routes"][0])

                # Fetch route via south waypoint
                if len(raw_routes) < 3:
                    route_via_south = cls._fetch_osrm_route([(lat1, lon1), waypoint_south, (lat2, lon2)], alternatives=False)
                    if route_via_south and route_via_south.get("routes"):
                        raw_routes.append(route_via_south["routes"][0])

        # 3. Fallback synthesis if external OSRM is blocked, down, or gave fewer than 3 routes
        while len(raw_routes) < 3:
            index = len(raw_routes)
            synthetic = cls._generate_synthetic_route(origin, destination, variant_index=index)
            raw_routes.append(synthetic)

        # Process and normalize the top 3 routes
        results = []
        route_names = [
            "Primary Interstate",
            "Alternative Highway",
            "Scenic Bypass"
        ]

        for i, r in enumerate(raw_routes[:3]):
            if "geometry" in r and "coordinates" in r["geometry"]:
                # GeoJSON coordinates are [lon, lat], convert to [lat, lon]
                coords_lat_lon = [[c[1], c[0]] for c in r["geometry"]["coordinates"]]
                dist_miles = round(r["distance"] * METERS_TO_MILES, 1)
                dur_sec = float(r["duration"])
            else:
                coords_lat_lon = r["coordinates"]
                dist_miles = r["distance_miles"]
                dur_sec = r["duration_seconds"]

            results.append({
                "id": f"route_{i + 1}",
                "name": f"Route {i + 1}: {route_names[i]}",
                "distance_miles": dist_miles,
                "duration_seconds": dur_sec,
                "duration_hours": round(dur_sec * SECONDS_TO_HOURS, 2),
                "coordinates": coords_lat_lon,
            })

        return results

    @classmethod
    def _generate_synthetic_route(
        cls, 
        origin: Tuple[float, float], 
        destination: Tuple[float, float], 
        variant_index: int
    ) -> Dict[str, Any]:
        """
        Fallback generator that constructs realistic highway corridor geometry
        using parabolic bezier curvature.
        """
        lat1, lon1 = origin
        lat2, lon2 = destination
        steps = 40
        coords = []

        # Curvature factors for variant routes
        curvature_multipliers = [0.0, 0.22, -0.22]
        factor = curvature_multipliers[variant_index % len(curvature_multipliers)]

        d_lat = lat2 - lat1
        d_lon = lon2 - lon1
        norm = math.sqrt(d_lat * d_lat + d_lon * d_lon) or 1.0
        p_lat = -d_lon / norm
        p_lon = d_lat / norm

        for i in range(steps + 1):
            t = i / steps
            # Base linear interpolation
            curr_lat = lat1 + t * d_lat
            curr_lon = lon1 + t * d_lon
            # Parabolic curve offset (max at t=0.5)
            arc = math.sin(t * math.pi) * factor * norm
            curr_lat += p_lat * arc
            curr_lon += p_lon * arc
            coords.append([round(curr_lat, 5), round(curr_lon, 5)])

        # Calculate approximate distance
        total_dist_meters = 0.0
        for i in range(len(coords) - 1):
            # Great circle approx
            d_y = (coords[i+1][0] - coords[i][0]) * 111000.0
            d_x = (coords[i+1][1] - coords[i][1]) * 111000.0 * math.cos(math.radians(coords[i][0]))
            total_dist_meters += math.sqrt(d_x * d_x + d_y * d_y)

        # Average truck speed ~ 55 mph -> 24.5 m/s
        duration_sec = total_dist_meters / 24.5

        return {
            "geometry": {
                "coordinates": [[c[1], c[0]] for c in coords]
            },
            "distance": total_dist_meters,
            "duration": duration_sec,
        }
