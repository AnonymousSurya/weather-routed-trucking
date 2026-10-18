"""
OpenRouteService integration (synchronous).

Strategy:
  1. Try ORS alternative_routes (works for routes ≤ 100 km).
  2. Fallback: 3 sequential preference requests (fastest / shortest / recommended).
     Sequential avoids ORS rate-limit rejections on burst concurrent calls.

Coordinates returned are (lat, lon) pairs; ORS uses (lon, lat) internally.
"""
import logging
from dataclasses import dataclass
from typing import List, Tuple

import httpx
import polyline as polyline_codec
from django.conf import settings

from ..exceptions import GeocodingError, RoutingError

logger = logging.getLogger(__name__)

ORS_BASE = "https://api.heigit.org"
METERS_TO_MILES = 0.000621371


@dataclass
class RouteOption:
    index: int
    name: str
    distance_miles: float
    duration_seconds: float
    coordinates: List[Tuple[float, float]]  # (lat, lon)
    summary: str


def geocode(address: str) -> Tuple[float, float]:
    """Return (lat, lon) for a free-text address via Nominatim (OSM)."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": address, "format": "json", "limit": 1}
    headers = {"User-Agent": "WeatherRoutedTrucking/1.0"}
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        raise GeocodingError(
            f"Geocoding service returned {exc.response.status_code} for {address!r}"
        ) from exc
    if not data:
        raise GeocodingError(f"Could not geocode address: {address!r}")
    return float(data[0]["lat"]), float(data[0]["lon"])


def _parse_ors_route(route: dict, index: int, name: str) -> RouteOption:
    summary = route["summary"]
    distance_miles = summary["distance"] * METERS_TO_MILES
    duration_s = summary["duration"]
    coords = polyline_codec.decode(route["geometry"])  # [(lat, lon)]
    hours = int(duration_s // 3600)
    mins = int((duration_s % 3600) // 60)
    return RouteOption(
        index=index,
        name=name,
        distance_miles=round(distance_miles, 1),
        duration_seconds=duration_s,
        coordinates=list(coords),
        summary=f"{name} · {distance_miles:.0f} mi · {hours}h {mins}m",
    )


def _fetch_single_preference(
    origin_lon: float,
    origin_lat: float,
    dest_lon: float,
    dest_lat: float,
    preference: str,
    index: int,
    name: str,
) -> RouteOption:
    url = f"{ORS_BASE}/v2/directions/driving-hgv/json"
    headers = {
        "Authorization": settings.ORS_API_KEY,
        "Content-Type": "application/json",
    }
    body = {
        "coordinates": [[origin_lon, origin_lat], [dest_lon, dest_lat]],
        "preference": preference,
        "geometry": True,
        "instructions": False,
        "geometry_simplify": False,
        "radiuses": [-1, -1],  # unlimited snapping to routable points
    }
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        raise RoutingError(
            f"ORS returned {exc.response.status_code} for preference={preference}"
        ) from exc
    routes = data.get("routes", [])
    if not routes:
        raise RoutingError(f"No route data for preference={preference}")
    return _parse_ors_route(routes[0], index, name)


def fetch_routes(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
) -> List[RouteOption]:
    """
    Fetch 3 HGV route options using distinct ORS preference requests.

    Always uses 3 separate preference-based requests (fastest / shortest / balanced)
    so routes are optimized for genuinely different goals and are more likely to
    follow different roads.
    """
    preferences = [
        ("fastest", "Fastest"),
        ("shortest", "Shortest"),
        ("recommended", "Balanced"),
    ]
    routes: List[RouteOption] = []
    for idx, (pref, name) in enumerate(preferences):
        try:
            r = _fetch_single_preference(
                origin_lon, origin_lat, dest_lon, dest_lat, pref, idx, name
            )
            routes.append(r)
        except Exception as exc:
            logger.error("Preference route %r failed: %s", name, exc)

    if not routes:
        raise RoutingError("No routes returned from OpenRouteService")

    routes.sort(key=lambda r: r.index)
    return routes
