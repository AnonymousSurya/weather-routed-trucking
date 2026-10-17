"""Unit tests for route ranking logic."""
import pytest
from apps.routing.services.risk_calculator import RiskLevel, WeatherReading, calculate_risk, RiskResult
from apps.routing.services.recommendation_engine import (
    CheckpointAnalysis,
    ScoredRoute,
    RouteSummary,
    rank_routes,
    build_route_score,
)


def make_summary(severe=0, high=0, moderate=0, low=100, avg=1.5, no_travel=0) -> RouteSummary:
    risk = RiskLevel.SEVERE if severe > 0 else (RiskLevel.HIGH if high > 0 else RiskLevel.LOW)
    return RouteSummary(
        no_travel_miles=no_travel,
        severe_miles=severe,
        high_miles=high,
        moderate_miles=moderate,
        low_miles=low,
        avg_risk_score=avg,
        overall_risk=risk,
    )


def make_scored(idx, rank=0, **summary_kwargs) -> ScoredRoute:
    s = make_summary(**summary_kwargs)
    return ScoredRoute(
        route_index=idx,
        rank=rank,
        score=build_route_score(s, 3600),
        risk_summary=s,
        checkpoints=[],
    )


class TestRankRoutes:
    def test_fewest_severe_miles_wins(self):
        routes = [
            make_scored(0, severe=20, high=10),
            make_scored(1, severe=5, high=50),
            make_scored(2, severe=0, high=80),
        ]
        ranked = rank_routes(routes)
        assert ranked[0].route_index == 2  # 0 severe miles

    def test_no_travel_beats_all(self):
        routes = [
            make_scored(0, severe=0, high=100, no_travel=5),
            make_scored(1, severe=50, high=0, no_travel=0),
        ]
        ranked = rank_routes(routes)
        assert ranked[0].route_index == 1  # no no_travel miles

    def test_tie_on_severe_resolved_by_high(self):
        routes = [
            make_scored(0, severe=10, high=50),
            make_scored(1, severe=10, high=20),
        ]
        ranked = rank_routes(routes)
        assert ranked[0].route_index == 1  # fewer high miles

    def test_rank_assigned_correctly(self):
        routes = [
            make_scored(0, severe=30),
            make_scored(1, severe=10),
            make_scored(2, severe=20),
        ]
        ranked = rank_routes(routes)
        assert ranked[0].rank == 1
        assert ranked[1].rank == 2
        assert ranked[2].rank == 3


class TestBuildScore:
    def test_no_travel_miles_dominate(self):
        safe = make_summary(no_travel=0, severe=10)
        dangerous = make_summary(no_travel=1, severe=0)
        assert build_route_score(safe, 3600) < build_route_score(dangerous, 3600)

    def test_duration_acts_as_tiebreaker(self):
        s = make_summary(severe=0)
        fast_score = build_route_score(s, 3600)
        slow_score = build_route_score(s, 7200)
        assert fast_score < slow_score
