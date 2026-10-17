"""
Risk classification engine.

Applies weather thresholds and load-weight rules from the assessment specification
to produce a per-checkpoint risk level.
"""
from dataclasses import dataclass
from enum import IntEnum


class RiskLevel(IntEnum):
    LOW = 1
    MODERATE = 2
    HIGH = 3
    SEVERE = 4
    NO_TRAVEL = 5

    @property
    def label(self) -> str:
        return self.name.replace("_", " ").title()

    @property
    def color(self) -> str:
        return {
            RiskLevel.LOW: "#22c55e",
            RiskLevel.MODERATE: "#eab308",
            RiskLevel.HIGH: "#f97316",
            RiskLevel.SEVERE: "#ef4444",
            RiskLevel.NO_TRAVEL: "#7c3aed",
        }[self]


@dataclass(frozen=True)
class WeatherReading:
    wind_speed_mph: float
    rain_rate_in_hr: float
    snow_rate_in_hr: float


@dataclass(frozen=True)
class RiskResult:
    level: RiskLevel
    wind_risk: RiskLevel
    rain_risk: RiskLevel
    snow_risk: RiskLevel
    load_override: bool

    @property
    def label(self) -> str:
        return self.level.label

    @property
    def color(self) -> str:
        return self.level.color

    @property
    def score(self) -> int:
        return int(self.level)


def _classify_wind(speed: float) -> RiskLevel:
    if speed >= 55:
        return RiskLevel.NO_TRAVEL
    if speed >= 45:
        return RiskLevel.SEVERE
    if speed >= 35:
        return RiskLevel.HIGH
    if speed >= 25:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


def _classify_rain(rate: float) -> RiskLevel:
    if rate > 1.00:
        return RiskLevel.NO_TRAVEL
    if rate >= 0.50:
        return RiskLevel.SEVERE
    if rate >= 0.25:
        return RiskLevel.HIGH
    if rate >= 0.10:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


def _classify_snow(rate: float) -> RiskLevel:
    if rate > 3.0:
        return RiskLevel.NO_TRAVEL
    if rate >= 2.0:
        return RiskLevel.SEVERE
    if rate >= 1.0:
        return RiskLevel.HIGH
    if rate >= 0.5:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


def calculate_risk(weather: WeatherReading, load_weight_lbs: float) -> RiskResult:
    """
    Compute risk level at a single checkpoint.

    Load rules escalate wind-based risk:
      - wind >= 55 mph → NO_TRAVEL regardless of load (already caught by wind classifier)
      - wind 45-54 mph + load > 30,000 lb → NO_TRAVEL
      - wind 35-44 mph + load > 40,000 lb → at least SEVERE
    """
    wind_risk = _classify_wind(weather.wind_speed_mph)
    rain_risk = _classify_rain(weather.rain_rate_in_hr)
    snow_risk = _classify_snow(weather.snow_rate_in_hr)

    base = max(wind_risk, rain_risk, snow_risk)
    load_override = False

    if weather.wind_speed_mph >= 45 and load_weight_lbs > 30_000:
        base = RiskLevel.NO_TRAVEL
        load_override = True
    elif weather.wind_speed_mph >= 35 and load_weight_lbs > 40_000:
        if base < RiskLevel.SEVERE:
            base = RiskLevel.SEVERE
            load_override = True

    return RiskResult(
        level=base,
        wind_risk=wind_risk,
        rain_risk=rain_risk,
        snow_risk=snow_risk,
        load_override=load_override,
    )
