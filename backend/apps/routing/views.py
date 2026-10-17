"""
API views for route analysis.

POST /api/routes/analyze  — full pipeline: route → checkpoints → weather → risk → recommendation
GET  /api/routes/geocode  — forward geocoding helper for the frontend
GET  /api/health          — liveness probe
"""
import hashlib
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import timezone as tz

from django.core.cache import cache
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

ROUTE_CACHE_TTL = 300  # 5 minutes


def _route_cache_key(origin: str, destination: str, departure_time, load_weight_lbs: float, interval: int) -> str:
    """Stable cache key — departure truncated to hour so 'depart now' still hits cache."""
    raw = json.dumps({
        "o": origin.lower().strip(),
        "d": destination.lower().strip(),
        "dep": departure_time.strftime("%Y%m%d%H"),
        "load": int(load_weight_lbs),
        "interval": interval,
    }, sort_keys=True)
    return "route:" + hashlib.md5(raw.encode()).hexdigest()

from .serializers import RouteRequestSerializer, GeocodeRequestSerializer
from .services.routing_service import fetch_routes, geocode
from .services.checkpoint_service import sample_checkpoints
from .services.weather_service import fetch_weather_for_checkpoints
from .services.risk_calculator import calculate_risk, WeatherReading
from .services.recommendation_engine import (
    CheckpointAnalysis,
    ScoredRoute,
    compute_route_summary,
    rank_routes,
    build_route_score,
)
from .services.llm_service import generate_recommendation_summary

logger = logging.getLogger(__name__)


def _checkpoint_to_dict(ca: CheckpointAnalysis) -> dict:
    return {
        "index": ca.index,
        "lat": ca.lat,
        "lon": ca.lon,
        "distance_from_start_miles": ca.distance_from_start_miles,
        "eta": ca.eta,
        "risk_level": ca.risk.level.name,
        "risk_label": ca.risk.label,
        "risk_color": ca.risk.color,
        "risk_score": ca.risk.score,
        "load_override": ca.risk.load_override,
        "wind_speed_mph": ca.wind_speed_mph,
        "rain_in_hr": ca.rain_in_hr,
        "snow_in_hr": ca.snow_in_hr,
        "wind_risk": ca.risk.wind_risk.name,
        "rain_risk": ca.risk.rain_risk.name,
        "snow_risk": ca.risk.snow_risk.name,
        "forecast": {
            "times": ca.forecast_times,
            "wind_speed": ca.forecast_wind,
            "rain": ca.forecast_rain,
            "snow": ca.forecast_snow,
        },
    }


def _route_to_dict(route, scored: ScoredRoute) -> dict:
    hours = int(route.duration_seconds // 3600)
    mins = int((route.duration_seconds % 3600) // 60)
    return {
        "index": route.index,
        "name": route.name,
        "summary": route.summary,
        "distance_miles": route.distance_miles,
        "duration_seconds": route.duration_seconds,
        "duration_label": f"{hours}h {mins}m",
        "duration_hours": round(route.duration_seconds / 3600, 2),
        "geometry": {
            "type": "LineString",
            "coordinates": [[lon, lat] for lat, lon in route.coordinates],
        },
        "checkpoints": [_checkpoint_to_dict(cp) for cp in scored.checkpoints],
        "risk_summary": scored.risk_summary.to_dict(),
        "rank": scored.rank,
        "score": scored.score,
    }


@extend_schema(
    request=RouteRequestSerializer,
    responses={200: dict},
    summary="Analyze routes with weather risk",
)
@api_view(["POST"])
def analyze_routes(request: Request) -> Response:
    serializer = RouteRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data
    origin_str: str = data["origin"]
    dest_str: str = data["destination"]
    departure_time = data["departure_time"]
    load_weight_lbs: float = data["load_weight_lbs"]
    interval_miles: int = data.get("checkpoint_interval", 25)

    if departure_time.tzinfo is None:
        departure_time = departure_time.replace(tzinfo=tz.utc)
    cache_key = _route_cache_key(origin_str, dest_str, departure_time, load_weight_lbs, interval_miles)
    cached = cache.get(cache_key)
    if cached is not None:
        logger.info("Cache hit for %s → %s", origin_str, dest_str)
        return Response(cached, status=status.HTTP_200_OK)

    logger.info(
        "Analyzing route: %s → %s, departure=%s, load=%.0f lb, interval=%d mi",
        origin_str, dest_str, departure_time.isoformat(), load_weight_lbs, interval_miles,
    )

    # 1. Geocode origin + destination concurrently (independent calls)
    with ThreadPoolExecutor(max_workers=2) as pool:
        origin_future = pool.submit(geocode, origin_str)
        dest_future = pool.submit(geocode, dest_str)
        origin_lat, origin_lon = origin_future.result()
        dest_lat, dest_lon = dest_future.result()

    # 2. Fetch 3 routes
    routes = fetch_routes(origin_lat, origin_lon, dest_lat, dest_lon)

    # 3. For each route: sample checkpoints → fetch weather → classify risk
    all_scored: list[ScoredRoute] = []

    for route in routes:
        checkpoints = sample_checkpoints(
            coordinates=route.coordinates,
            interval_miles=interval_miles,
            departure_time=departure_time,
            total_duration_seconds=route.duration_seconds,
            total_distance_miles=route.distance_miles,
        )

        weather_list = fetch_weather_for_checkpoints(checkpoints)

        analyzed: list[CheckpointAnalysis] = []
        for cp, weather in zip(checkpoints, weather_list):
            if weather is None:
                wind, rain, snow = 0.0, 0.0, 0.0
                f_times, f_wind, f_rain, f_snow = [], [], [], []
            else:
                wind = weather.wind_speed_mph
                rain = weather.rain_in_hr
                snow = weather.snow_in_hr
                f_times = weather.forecast.times
                f_wind = weather.forecast.wind_speed_mph
                f_rain = weather.forecast.rain_in_hr
                f_snow = weather.forecast.snow_in_hr

            risk = calculate_risk(
                WeatherReading(
                    wind_speed_mph=wind,
                    rain_rate_in_hr=rain,
                    snow_rate_in_hr=snow,
                ),
                load_weight_lbs,
            )

            analyzed.append(
                CheckpointAnalysis(
                    index=cp.index,
                    lat=cp.lat,
                    lon=cp.lon,
                    distance_from_start_miles=cp.distance_from_start_miles,
                    eta=cp.eta.isoformat(),
                    risk=risk,
                    wind_speed_mph=wind,
                    rain_in_hr=rain,
                    snow_in_hr=snow,
                    forecast_times=f_times,
                    forecast_wind=f_wind,
                    forecast_rain=f_rain,
                    forecast_snow=f_snow,
                )
            )

        summary = compute_route_summary(analyzed, route.distance_miles)
        score = build_route_score(summary, route.duration_seconds)
        all_scored.append(
            ScoredRoute(
                route_index=route.index,
                rank=0,
                score=score,
                risk_summary=summary,
                checkpoints=analyzed,
            )
        )

    ranked = rank_routes(all_scored)

    # Build response — match by route_index, not position (rank_routes reorders)
    scored_by_index = {s.route_index: s for s in ranked}
    routes_payload = [
        _route_to_dict(route, scored_by_index[route.index])
        for route in routes
    ]

    recommended_idx = next(
        (s.route_index for s in ranked if s.rank == 1), 0
    )

    routes_data_for_llm = [
        {
            "index": r["index"],
            "name": r["name"],
            "distance_miles": r["distance_miles"],
            "duration_hours": r["duration_hours"],
            "risk_summary": r["risk_summary"],
        }
        for r in routes_payload
    ]

    ai_summary = generate_recommendation_summary(
        routes_data_for_llm, recommended_idx, load_weight_lbs
    )

    response_data = {
        "routes": routes_payload,
        "recommendation": {
            "route_index": recommended_idx,
            "ai_summary": ai_summary,
        },
        "request": {
            "origin": origin_str,
            "destination": dest_str,
            "departure_time": departure_time.isoformat(),
            "load_weight_lbs": load_weight_lbs,
            "checkpoint_interval_miles": interval_miles,
        },
    }
    cache.set(cache_key, response_data, ROUTE_CACHE_TTL)
    return Response(response_data, status=status.HTTP_200_OK)


@extend_schema(
    parameters=[OpenApiParameter("address", str, description="Free-text address to geocode")],
    responses={200: dict},
    summary="Geocode an address",
)
@api_view(["GET"])
def geocode_address(request: Request) -> Response:
    serializer = GeocodeRequestSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    address = serializer.validated_data["address"]
    lat, lon = geocode(address)
    return Response({"lat": lat, "lon": lon, "address": address})


@api_view(["GET"])
def health(request: Request) -> Response:
    return Response({"status": "ok", "service": "weather-truck-routing"})
