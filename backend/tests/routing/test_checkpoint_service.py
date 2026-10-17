"""Unit tests for checkpoint polyline sampling."""
import pytest
from datetime import datetime, timezone, timedelta
from apps.routing.services.checkpoint_service import sample_checkpoints


@pytest.fixture
def straight_line_coords():
    """~100-mile straight line from Dallas to OKC (approximate)."""
    return [
        (32.7767, -96.7970),   # Dallas
        (33.4485, -97.0641),   # Midpoint 1
        (34.1001, -97.3200),   # Midpoint 2
        (35.4676, -97.5164),   # OKC
    ]


def test_always_includes_origin_and_destination(straight_line_coords, departure_time):
    checkpoints = sample_checkpoints(
        straight_line_coords,
        interval_miles=25,
        departure_time=departure_time,
        total_duration_seconds=7200,
        total_distance_miles=100,
    )
    assert checkpoints[0].lat == pytest.approx(32.7767)
    assert checkpoints[-1].lat == pytest.approx(35.4676, abs=0.01)


def test_interval_spacing(straight_line_coords, departure_time):
    checkpoints = sample_checkpoints(
        straight_line_coords,
        interval_miles=25,
        departure_time=departure_time,
        total_duration_seconds=7200,
        total_distance_miles=100,
    )
    # For 100 miles at 25-mile intervals we expect origin + 3 interior + destination
    assert len(checkpoints) >= 4


def test_eta_monotonically_increasing(straight_line_coords, departure_time):
    checkpoints = sample_checkpoints(
        straight_line_coords,
        interval_miles=25,
        departure_time=departure_time,
        total_duration_seconds=7200,
        total_distance_miles=100,
    )
    etas = [cp.eta for cp in checkpoints]
    assert all(etas[i] <= etas[i + 1] for i in range(len(etas) - 1))


def test_origin_eta_equals_departure(straight_line_coords, departure_time):
    checkpoints = sample_checkpoints(
        straight_line_coords,
        interval_miles=25,
        departure_time=departure_time,
        total_duration_seconds=7200,
        total_distance_miles=100,
    )
    assert checkpoints[0].eta == departure_time


def test_destination_eta_approx_total_duration(straight_line_coords, departure_time):
    total_seconds = 7200
    checkpoints = sample_checkpoints(
        straight_line_coords,
        interval_miles=25,
        departure_time=departure_time,
        total_duration_seconds=total_seconds,
        total_distance_miles=100,
    )
    expected = departure_time + timedelta(seconds=total_seconds)
    diff = abs((checkpoints[-1].eta - expected).total_seconds())
    assert diff < 60  # within 1 minute


def test_empty_coords_returns_empty():
    result = sample_checkpoints([], 25, datetime.now(timezone.utc), 3600, 100)
    assert result == []


def test_single_coord_returns_one_checkpoint(departure_time):
    coords = [(35.0, -97.0)]
    result = sample_checkpoints(coords, 25, departure_time, 3600, 0)
    assert len(result) == 1
