"""
Checkpoint sampling along a route polyline.

Walks the decoded coordinate list and emits a checkpoint every `interval_miles`.
ETAs are calculated by linear interpolation over the route's total duration.
"""
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Tuple


@dataclass
class Checkpoint:
    index: int
    lat: float
    lon: float
    distance_from_start_miles: float
    eta: datetime


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(min(a, 1.0)))


def _interpolate(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    fraction: float,
) -> Tuple[float, float]:
    return (
        p1[0] + (p2[0] - p1[0]) * fraction,
        p1[1] + (p2[1] - p1[1]) * fraction,
    )


def sample_checkpoints(
    coordinates: List[Tuple[float, float]],  # (lat, lon) pairs
    interval_miles: float,
    departure_time: datetime,
    total_duration_seconds: float,
    total_distance_miles: float,
) -> List[Checkpoint]:
    """
    Sample evenly spaced checkpoints along a polyline.

    Always includes the origin (mile 0) and destination.
    """
    if not coordinates:
        return []

    # Single-point route (origin == destination or zero-length): just emit the one point.
    if total_distance_miles <= 0:
        return [
            Checkpoint(
                index=0,
                lat=coordinates[0][0],
                lon=coordinates[0][1],
                distance_from_start_miles=0.0,
                eta=departure_time,
            )
        ]

    checkpoints: List[Checkpoint] = []
    cumulative_miles = 0.0
    next_target = 0.0
    checkpoint_idx = 0

    def _eta_at(dist: float) -> datetime:
        fraction = min(dist / total_distance_miles, 1.0)
        return departure_time + timedelta(seconds=fraction * total_duration_seconds)

    def _emit(lat: float, lon: float, dist: float) -> None:
        nonlocal checkpoint_idx
        checkpoints.append(
            Checkpoint(
                index=checkpoint_idx,
                lat=lat,
                lon=lon,
                distance_from_start_miles=round(dist, 2),
                eta=_eta_at(dist),
            )
        )
        checkpoint_idx += 1

    # Always emit origin
    _emit(coordinates[0][0], coordinates[0][1], 0.0)
    next_target = interval_miles

    for i in range(1, len(coordinates)):
        prev = coordinates[i - 1]
        curr = coordinates[i]
        seg_miles = _haversine_miles(prev[0], prev[1], curr[0], curr[1])

        while next_target <= cumulative_miles + seg_miles:
            overshoot = next_target - cumulative_miles
            fraction = overshoot / seg_miles if seg_miles > 0 else 0.0
            lat, lon = _interpolate(prev, curr, fraction)
            _emit(lat, lon, next_target)
            next_target += interval_miles

        cumulative_miles += seg_miles

    # Always emit destination
    last = coordinates[-1]
    if not checkpoints or (
        abs(checkpoints[-1].lat - last[0]) > 1e-6
        or abs(checkpoints[-1].lon - last[1]) > 1e-6
    ):
        _emit(last[0], last[1], total_distance_miles)

    return checkpoints
