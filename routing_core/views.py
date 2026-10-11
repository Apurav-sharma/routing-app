import logging
from datetime import datetime, timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services.geocoding_service import GeocodingService, FREIGHT_HUBS
from .services.routing_service import RoutingService
from .services.sampling_service import SamplingService
from .services.weather_service import WeatherService
from .services.risk_engine import RiskEngine

logger = logging.getLogger(__name__)

@api_view(["GET"])
def health_check(request):
    return Response({
        "status": "healthy",
        "service": "Weather-Aware Truck Routing API",
        "version": "1.0.0",
    })

@api_view(["GET"])
def list_hubs(request):
    """Returns curated major freight hubs for quick preset selection."""
    hubs = [{"id": k, **v} for k, v in FREIGHT_HUBS.items()]
    return Response({"hubs": hubs})

@api_view(["GET"])
def geocode_location(request):
    """Geocodes a search string into latitude and longitude coordinates."""
    query = request.query_params.get("q", "").strip()
    if not query:
        return Response({"error": "Missing query parameter 'q'"}, status=status.HTTP_400_BAD_REQUEST)

    result = GeocodingService.geocode(query)
    if not result:
        return Response({"error": f"Unable to geocode '{query}'"}, status=status.HTTP_404_NOT_FOUND)

    return Response(result)

@api_view(["POST"])
def analyze_routes(request):
    """
    Main Route Analysis Endpoint:
    Input:
      - origin: str or {name, lat, lon}
      - destination: str or {name, lat, lon}
      - departure_time: ISO string (optional)
      - load_weight: float in lbs (default 35,000)
      - sample_interval: int (10, 25, or 50 miles, default 25)
    Output:
      - 3 route options with weather-sampled checkpoints
      - Risk evaluation per checkpoint and per route with load vulnerability rules applied
      - Best route recommendation
      - 0-48h weather heatmap corridor grid
    """
    data = request.data or {}

    origin_input = data.get("origin")
    dest_input = data.get("destination")
    if not origin_input or not dest_input:
        return Response(
            {"error": "Both 'origin' and 'destination' are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Resolve origin
    if isinstance(origin_input, dict) and "lat" in origin_input and "lon" in origin_input:
        origin = origin_input
    else:
        origin = GeocodingService.geocode(str(origin_input))
        if not origin:
            return Response({"error": f"Could not geocode origin: '{origin_input}'"}, status=status.HTTP_400_BAD_REQUEST)

    # Resolve destination
    if isinstance(dest_input, dict) and "lat" in dest_input and "lon" in dest_input:
        destination = dest_input
    else:
        destination = GeocodingService.geocode(str(dest_input))
        if not destination:
            return Response({"error": f"Could not geocode destination: '{dest_input}'"}, status=status.HTTP_400_BAD_REQUEST)

    # Parse load weight
    try:
        load_weight_lbs = float(data.get("load_weight", 35000.0))
        if load_weight_lbs < 0:
            load_weight_lbs = 35000.0
    except (ValueError, TypeError):
        load_weight_lbs = 35000.0

    # Parse sample interval
    try:
        interval_miles = int(data.get("sample_interval", 25))
        if interval_miles not in (10, 25, 50):
            interval_miles = 25
    except (ValueError, TypeError):
        interval_miles = 25

    # Parse departure time
    dep_str = data.get("departure_time")
    if dep_str:
        try:
            dep_dt = datetime.fromisoformat(dep_str.replace("Z", "+00:00"))
            if dep_dt.tzinfo is None:
                dep_dt = dep_dt.replace(tzinfo=timezone.utc)
        except Exception:
            dep_dt = datetime.now(timezone.utc)
    else:
        dep_dt = datetime.now(timezone.utc)

    # 1. Generate 3 routes
    origin_coords = (origin["lat"], origin["lon"])
    dest_coords = (destination["lat"], destination["lon"])
    raw_routes = RoutingService.get_three_routes(
        origin=origin_coords,
        destination=dest_coords,
        origin_name=origin.get("name", "Origin"),
        dest_name=destination.get("name", "Destination"),
    )

    evaluated_routes = []
    for route in raw_routes:
        # 2. Sample checkpoints along route polyline
        checkpoints = SamplingService.sample_route_checkpoints(
            coordinates=route["coordinates"],
            total_distance_miles=route["distance_miles"],
            duration_seconds=route["duration_seconds"],
            interval_miles=interval_miles,
            departure_dt=dep_dt,
        )

        # 3. Fetch weather for checkpoints matching ETA
        checkpoints_with_weather = WeatherService.fetch_checkpoints_weather(checkpoints)

        # 4. Evaluate weather risk and load weight overrides
        for cp in checkpoints_with_weather:
            RiskEngine.evaluate_checkpoint(cp, load_weight_lbs=load_weight_lbs)

        # 5. Aggregate route risk metrics
        eval_route = RiskEngine.evaluate_route(route, checkpoints_with_weather)
        evaluated_routes.append(eval_route)

    # 6. Rank and recommend
    ranked_routes = RiskEngine.rank_and_recommend(evaluated_routes)

    # 7. Generate corridor forecast heatmap for 0-48 hour slider
    corridor_heatmap = WeatherService.generate_corridor_heatmap(ranked_routes, hours_ahead=48)

    recommended_route = ranked_routes[0]

    return Response({
        "status": "success",
        "trip_params": {
            "origin": origin,
            "destination": destination,
            "departure_time": dep_dt.isoformat(),
            "load_weight_lbs": load_weight_lbs,
            "sample_interval_miles": interval_miles,
        },
        "recommended_route_id": recommended_route["id"],
        "recommendation_reason": recommended_route.get("recommendation_reason", ""),
        "routes": ranked_routes,
        "corridor_heatmap": corridor_heatmap,
    })
