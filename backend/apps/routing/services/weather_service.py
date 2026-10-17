"""
Open-Meteo weather service (synchronous).

Fetches hourly wind / rain / snow forecasts for a given coordinate.
One API call per location returns 48 hours of data — used both for
ETA-based point queries and for the frontend forecast slider.
Concurrent requests use ThreadPoolExecutor for Django sync views.
"""
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
MAX_WORKERS = 4
_RETRY_STATUSES = {429, 503}


@dataclass
class HourlyForecast:
    """48 hours of weather data for a single location."""
    times: List[str]
    wind_speed_mph: List[float]
    rain_in_hr: List[float]
    snow_in_hr: List[float]


@dataclass
class PointWeather:
    wind_speed_mph: float
    rain_in_hr: float
    snow_in_hr: float
    forecast: HourlyForecast


def _fetch_location(lat: float, lon: float) -> Optional[HourlyForecast]:
    params = {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "hourly": "wind_speed_10m,precipitation,snowfall",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "forecast_days": 2,
        "timezone": "UTC",  # always UTC so ETA strings compare on the same timeline
    }
    for attempt in range(3):
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(OPEN_METEO_URL, params=params)
                if resp.status_code in _RETRY_STATUSES:
                    wait = 0.5 * (attempt + 1)
                    logger.warning(
                        "Open-Meteo %d for (%.4f, %.4f), retrying in %.1fs",
                        resp.status_code, lat, lon, wait,
                    )
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
            hourly = data["hourly"]
            return HourlyForecast(
                times=hourly["time"],
                wind_speed_mph=hourly["wind_speed_10m"],
                rain_in_hr=hourly["precipitation"],
                snow_in_hr=hourly["snowfall"],
            )
        except Exception as exc:
            logger.warning("Weather fetch failed for (%.4f, %.4f): %s", lat, lon, exc)
            return None
    return None


# Manual cache — never stores None (transient failures are retried) and bounded by size
_location_cache: dict[tuple, HourlyForecast] = {}
_CACHE_MAX = 256


def _fetch_location_cached(lat: float, lon: float) -> Optional[HourlyForecast]:
    """Fetch with dedup cache — only caches successful responses, max 256 entries."""
    key = (lat, lon)
    if key in _location_cache:
        return _location_cache[key]
    result = _fetch_location(lat, lon)
    if result is not None:
        if len(_location_cache) >= _CACHE_MAX:
            _location_cache.clear()
        _location_cache[key] = result
    return result


def _find_hour_index(forecast: HourlyForecast, target: datetime) -> int:
    # forecast.times are UTC strings ("2024-01-01T14:00")
    # strip tzinfo if present — target is already UTC, replace() keeps the value
    if target.tzinfo is not None:
        target = target.replace(tzinfo=None)
    target_str = target.strftime("%Y-%m-%dT%H:00")
    for i, t in enumerate(forecast.times):
        if t >= target_str:
            return i
    return len(forecast.times) - 1


def fetch_weather_for_checkpoints(checkpoints: list) -> List[Optional[PointWeather]]:
    """
    Fetch full 48-hour forecast for every checkpoint concurrently via threads.
    Deduplicates by coordinate (~1 km resolution) to avoid redundant API calls
    when multiple routes share nearby checkpoints.
    Returns one PointWeather per checkpoint (weather matched to ETA).
    """
    results: dict[int, Optional[PointWeather]] = {}

    def _fetch_and_parse(cp) -> tuple:
        # Round to 2 dp (~1 km) so nearby checkpoints share a cached fetch
        forecast = _fetch_location_cached(round(cp.lat, 2), round(cp.lon, 2))
        if forecast is None:
            return cp.index, None
        idx = _find_hour_index(forecast, cp.eta)
        idx = min(idx, len(forecast.wind_speed_mph) - 1)
        return cp.index, PointWeather(
            wind_speed_mph=forecast.wind_speed_mph[idx],
            rain_in_hr=forecast.rain_in_hr[idx],
            snow_in_hr=forecast.snow_in_hr[idx],
            forecast=forecast,
        )

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(_fetch_and_parse, cp): cp.index for cp in checkpoints}
        for future in as_completed(futures):
            try:
                idx, weather = future.result()
                results[idx] = weather
            except Exception as exc:
                cp_idx = futures[future]
                logger.warning("Weather parse failed for checkpoint %d: %s", cp_idx, exc)
                results[cp_idx] = None

    return [results.get(cp.index) for cp in checkpoints]
