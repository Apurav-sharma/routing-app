import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple

EARTH_RADIUS_MILES = 3958.8

def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two points on Earth in miles."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_MILES * c

class SamplingService:
    @staticmethod
    def sample_route_checkpoints(
        coordinates: List[List[float]],
        total_distance_miles: float,
        duration_seconds: float,
        interval_miles: float,
        departure_dt: datetime
    ) -> List[Dict[str, Any]]:
        """
        Samples checkpoints along the route polyline every interval_miles (e.g. 10, 25, 50).
        Calculates exact ETA for each checkpoint.
        """
        if not coordinates or len(coordinates) < 2:
            return []

        # Validate interval
        if interval_miles not in (10, 25, 50):
            if interval_miles <= 15:
                interval_miles = 10
            elif interval_miles <= 35:
                interval_miles = 25
            else:
                interval_miles = 50

        # Compute cumulative distance along coordinate polyline
        segment_dists = [0.0]
        cumulative = 0.0
        for i in range(len(coordinates) - 1):
            p1 = coordinates[i]
            p2 = coordinates[i + 1]
            d = haversine_miles(p1[0], p1[1], p2[0], p2[1])
            cumulative += d
            segment_dists.append(cumulative)

        actual_total_miles = cumulative if cumulative > 0 else total_distance_miles

        # Target sample miles: 0, interval, 2*interval, ..., actual_total_miles
        target_miles = []
        curr = 0.0
        while curr < actual_total_miles:
            target_miles.append(round(curr, 1))
            curr += interval_miles

        # Always include the destination point
        if not target_miles or target_miles[-1] < actual_total_miles - 2.0:
            target_miles.append(round(actual_total_miles, 1))

        checkpoints = []
        for idx, target in enumerate(target_miles):
            # Locate polyline segment
            lat, lon = coordinates[0][0], coordinates[0][1]
            for i in range(len(segment_dists) - 1):
                d_start = segment_dists[i]
                d_end = segment_dists[i + 1]
                if d_start <= target <= d_end:
                    span = d_end - d_start
                    ratio = (target - d_start) / span if span > 0 else 0.0
                    lat = coordinates[i][0] + ratio * (coordinates[i + 1][0] - coordinates[i][0])
                    lon = coordinates[i][1] + ratio * (coordinates[i + 1][1] - coordinates[i][1])
                    break
                elif target > segment_dists[-1]:
                    lat, lon = coordinates[-1][0], coordinates[-1][1]

            # Calculate ETA
            progress_ratio = target / actual_total_miles if actual_total_miles > 0 else 0.0
            elapsed_sec = progress_ratio * duration_seconds
            checkpoint_eta = departure_dt + timedelta(seconds=elapsed_sec)

            checkpoints.append({
                "index": idx,
                "mile_marker": round(target, 1),
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "eta_iso": checkpoint_eta.isoformat(),
                "eta_display": checkpoint_eta.strftime("%b %d, %H:%M"),
                "elapsed_hours": round(elapsed_sec / 3600.0, 2),
            })

        return checkpoints
