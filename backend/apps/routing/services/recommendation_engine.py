"""
Route ranking engine.

Scores routes according to the assessment specification:
  1. Fewest Severe miles
  2. Fewest High miles
  3. Lowest average risk score
  4. Shortest travel time
"""
from dataclasses import dataclass, field
from typing import List

from .risk_calculator import RiskLevel, RiskResult


@dataclass
class CheckpointAnalysis:
    index: int
    lat: float
    lon: float
    distance_from_start_miles: float
    eta: str  # ISO-8601
    risk: RiskResult
    wind_speed_mph: float
    rain_in_hr: float
    snow_in_hr: float
    # 48-h forecast arrays for slider
    forecast_times: List[str] = field(default_factory=list)
    forecast_wind: List[float] = field(default_factory=list)
    forecast_rain: List[float] = field(default_factory=list)
    forecast_snow: List[float] = field(default_factory=list)


@dataclass
class RouteSummary:
    no_travel_miles: float
    severe_miles: float
    high_miles: float
    moderate_miles: float
    low_miles: float
    avg_risk_score: float
    overall_risk: RiskLevel

    def to_dict(self) -> dict:
        return {
            "no_travel_miles": round(self.no_travel_miles, 1),
            "severe_miles": round(self.severe_miles, 1),
            "high_miles": round(self.high_miles, 1),
            "moderate_miles": round(self.moderate_miles, 1),
            "low_miles": round(self.low_miles, 1),
            "avg_risk_score": round(self.avg_risk_score, 2),
            "overall_risk": self.overall_risk.name,
            "overall_risk_label": self.overall_risk.label,
            "overall_risk_color": self.overall_risk.color,
        }


@dataclass
class ScoredRoute:
    route_index: int
    rank: int
    score: float
    risk_summary: RouteSummary
    checkpoints: List[CheckpointAnalysis]


def compute_route_summary(
    checkpoints: List[CheckpointAnalysis],
    total_distance_miles: float,
) -> RouteSummary:
    """
    Bucket miles between checkpoints by the downstream checkpoint's risk level.
    """
    buckets = {level: 0.0 for level in RiskLevel}

    distances = [cp.distance_from_start_miles for cp in checkpoints]
    for i in range(1, len(checkpoints)):
        seg = distances[i] - distances[i - 1]
        buckets[checkpoints[i].risk.level] += seg

    total_risk_score = sum(int(cp.risk.level) for cp in checkpoints)
    avg = total_risk_score / len(checkpoints) if checkpoints else 0

    max_risk = max((cp.risk.level for cp in checkpoints), default=RiskLevel.LOW)

    return RouteSummary(
        no_travel_miles=buckets[RiskLevel.NO_TRAVEL],
        severe_miles=buckets[RiskLevel.SEVERE],
        high_miles=buckets[RiskLevel.HIGH],
        moderate_miles=buckets[RiskLevel.MODERATE],
        low_miles=buckets[RiskLevel.LOW],
        avg_risk_score=avg,
        overall_risk=max_risk,
    )


def rank_routes(scored: List[ScoredRoute]) -> List[ScoredRoute]:
    """
    Sort routes by assessment criteria (lower = better).
    Tie-break order: no-travel → severe → high → avg_risk → travel time.
    """
    def sort_key(r: ScoredRoute):
        s = r.risk_summary
        return (
            s.no_travel_miles,   # safety override — any no-travel beats all-severe
            s.severe_miles,
            s.high_miles,
            s.avg_risk_score,
            r.score,             # composite score includes duration (spec: shortest time as tiebreaker)
        )

    ranked = sorted(scored, key=sort_key)
    for i, r in enumerate(ranked):
        r.rank = i + 1
    return ranked


def build_route_score(summary: RouteSummary, duration_seconds: float) -> float:
    """
    Composite score — lower is safer/better.
    Weights reflect strict priority: no_travel >> severe >> high >> moderate >> time.
    """
    return (
        summary.no_travel_miles * 10_000
        + summary.severe_miles * 100
        + summary.high_miles * 10
        + summary.moderate_miles * 1
        + summary.avg_risk_score
        + duration_seconds / 3600.0
    )
