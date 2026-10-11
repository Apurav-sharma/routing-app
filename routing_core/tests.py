import math
from datetime import datetime, timezone
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from routing_core.services.risk_engine import RiskEngine
from routing_core.services.sampling_service import SamplingService
from routing_core.services.geocoding_service import GeocodingService
from routing_core.services.routing_service import RoutingService

class WeatherRiskEngineTestCase(TestCase):
    """Rigorous tests for weather thresholds and truck load weight vulnerability rules."""

    def test_wind_thresholds_standard_load(self):
        """Test base wind conditions with standard unburdened load (25,000 lbs)."""
        load = 25000.0

        # < 25 mph -> Low
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(20.0, load)
        self.assertEqual(lvl, 1)
        self.assertEqual(tier, "Low")

        # 25-34 mph -> Moderate
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(28.0, load)
        self.assertEqual(lvl, 2)
        self.assertEqual(tier, "Moderate")

        # 35-44 mph -> High
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(38.0, load)
        self.assertEqual(lvl, 3)
        self.assertEqual(tier, "High")

        # 45-54 mph -> Severe (since load <= 30,000)
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(48.0, load)
        self.assertEqual(lvl, 4)
        self.assertEqual(tier, "Severe")

        # >= 55 mph -> No Travel
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(56.0, load)
        self.assertEqual(lvl, 5)
        self.assertEqual(tier, "No Travel")

    def test_load_rule_extreme_wind_any_load(self):
        """Rule: >= 55 mph -> No Travel for any load."""
        for weight in [10000.0, 30000.0, 45000.0, 80000.0]:
            lvl, tier, warns = RiskEngine.evaluate_wind_risk(55.0, weight)
            self.assertEqual(lvl, 5, f"Failed at weight {weight}")
            self.assertEqual(tier, "No Travel")
            self.assertTrue(any("NO TRAVEL" in w for w in warns))

    def test_load_rule_45_to_54_mph_over_30k_lbs(self):
        """Rule: 45-54 mph + >30,000 lb -> No Travel."""
        # 48 mph with 35,000 lbs (> 30,000) -> Escalated to No Travel
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(48.0, 35000.0)
        self.assertEqual(lvl, 5)
        self.assertEqual(tier, "No Travel")
        self.assertTrue(any("NO TRAVEL" in w for w in warns))

        # 48 mph with 28,000 lbs (<= 30,000) -> Remains Severe
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(48.0, 28000.0)
        self.assertEqual(lvl, 4)
        self.assertEqual(tier, "Severe")

    def test_load_rule_35_to_44_mph_over_40k_lbs(self):
        """Rule: 35-44 mph + >40,000 lb -> Severe."""
        # 40 mph with 45,000 lbs (> 40,000) -> Escalated to Severe
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(40.0, 45000.0)
        self.assertEqual(lvl, 4)
        self.assertEqual(tier, "Severe")
        self.assertTrue(any("SEVERE" in w for w in warns))

        # 40 mph with 38,000 lbs (<= 40,000) -> Remains High
        lvl, tier, warns = RiskEngine.evaluate_wind_risk(40.0, 38000.0)
        self.assertEqual(lvl, 3)
        self.assertEqual(tier, "High")

    def test_rain_thresholds(self):
        """Test rain thresholds: <0.10, 0.10–0.25, 0.25–0.50, 0.50–1.00, >1.00."""
        self.assertEqual(RiskEngine.evaluate_rain_risk(0.05)[0], 1)
        self.assertEqual(RiskEngine.evaluate_rain_risk(0.15)[0], 2)
        self.assertEqual(RiskEngine.evaluate_rain_risk(0.35)[0], 3)
        self.assertEqual(RiskEngine.evaluate_rain_risk(0.75)[0], 4)
        self.assertEqual(RiskEngine.evaluate_rain_risk(1.20)[0], 5)

    def test_snow_thresholds(self):
        """Test snow thresholds: <0.5, 0.5–1.0, 1.0–2.0, 2.0–3.0, >3.0."""
        self.assertEqual(RiskEngine.evaluate_snow_risk(0.2)[0], 1)
        self.assertEqual(RiskEngine.evaluate_snow_risk(0.8)[0], 2)
        self.assertEqual(RiskEngine.evaluate_snow_risk(1.5)[0], 3)
        self.assertEqual(RiskEngine.evaluate_snow_risk(2.5)[0], 4)
        self.assertEqual(RiskEngine.evaluate_snow_risk(3.5)[0], 5)

    def test_recommendation_ranking_hierarchy(self):
        """
        Recommendation hierarchy:
        1. Fewest Severe miles
        2. Fewest High miles
        3. Lowest average risk
        4. Shortest travel times
        """
        route_a = {
            "id": "route_a",
            "duration_seconds": 18000,
            "risk_summary": {
                "critical_severe_miles": 10.0,
                "high_miles": 50.0,
                "average_risk_score": 2.5,
            }
        }
        route_b = {
            "id": "route_b",
            "duration_seconds": 19000,
            "risk_summary": {
                "critical_severe_miles": 0.0,  # Best on rule #1: fewest severe miles
                "high_miles": 100.0,
                "average_risk_score": 3.0,
            }
        }
        route_c = {
            "id": "route_c",
            "duration_seconds": 15000,  # Fast but high severe miles
            "risk_summary": {
                "critical_severe_miles": 25.0,
                "high_miles": 10.0,
                "average_risk_score": 3.8,
            }
        }

        ranked = RiskEngine.rank_and_recommend([route_a, route_b, route_c])
        # route_b should be ranked #1 because it has fewest severe miles
        self.assertEqual(ranked[0]["id"], "route_b")
        self.assertTrue(ranked[0]["is_recommended"])
        self.assertEqual(ranked[1]["id"], "route_a")
        self.assertEqual(ranked[2]["id"], "route_c")

class SamplingServiceTestCase(TestCase):
    def test_sampling_intervals_and_eta(self):
        """Verify polyline is sampled every 25 miles with correct ETA progression."""
        # Simple straight line ~100 miles: Chicago (41.8781, -87.6298) to South Bend (41.6764, -86.2519)
        coords = [
            [41.8781, -87.6298],
            [41.7770, -86.9400],
            [41.6764, -86.2519],
        ]
        dep_time = datetime(2026, 10, 11, 10, 0, 0, tzinfo=timezone.utc)
        duration_sec = 7200.0  # 2 hours

        checkpoints = SamplingService.sample_route_checkpoints(
            coordinates=coords,
            total_distance_miles=80.0,
            duration_seconds=duration_sec,
            interval_miles=25,
            departure_dt=dep_time,
        )

        self.assertGreaterEqual(len(checkpoints), 3)
        self.assertEqual(checkpoints[0]["mile_marker"], 0.0)
        self.assertEqual(checkpoints[0]["eta_iso"], dep_time.isoformat())

        # Verify monotonic increase of mile marker and ETA
        for i in range(len(checkpoints) - 1):
            self.assertLess(checkpoints[i]["mile_marker"], checkpoints[i + 1]["mile_marker"])
            self.assertLess(checkpoints[i]["elapsed_hours"], checkpoints[i + 1]["elapsed_hours"])

class APIRoutesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_hubs_endpoint(self):
        response = self.client.get("/api/hubs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("hubs", response.data)
        self.assertGreater(len(response.data["hubs"]), 5)

    def test_geocode_endpoint(self):
        response = self.client.get("/api/geocode/?q=Denver")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("name"), "Denver, CO")
        self.assertAlmostEqual(response.data.get("lat"), 39.7392, places=2)

    def test_analyze_routes_full_pipeline(self):
        """End-to-end integration test for analyzing routes between Chicago, IL and Denver, CO."""
        payload = {
            "origin": "Chicago, IL",
            "destination": "Denver, CO",
            "departure_time": "2026-10-11T12:00:00Z",
            "load_weight": 42000,
            "sample_interval": 50
        }
        response = self.client.post("/api/routes/analyze/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")

        routes = response.data["routes"]
        self.assertEqual(len(routes), 3, "Must generate exactly 3 route options")

        recommended_id = response.data["recommended_route_id"]
        self.assertTrue(any(r["id"] == recommended_id for r in routes))

        # Check first route has checkpoints with weather and risk
        first_route = routes[0]
        self.assertIn("checkpoints", first_route)
        self.assertGreater(len(first_route["checkpoints"]), 5)

        cp = first_route["checkpoints"][0]
        self.assertIn("weather", cp)
        self.assertIn("risk", cp)
        self.assertIn("wind_mph", cp["weather"])
        self.assertIn("rain_rate_in_hr", cp["weather"])
        self.assertIn("snow_rate_in_hr", cp["weather"])
        self.assertIn("level", cp["risk"])

        # Check corridor heatmap exists for 0-48h slider
        heatmap = response.data.get("corridor_heatmap", [])
        self.assertGreater(len(heatmap), 0)
        self.assertIn("hour", heatmap[0])
        self.assertIn("points", heatmap[0])
