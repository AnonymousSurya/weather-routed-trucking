"""Unit tests for the risk classification engine."""
import pytest
from apps.routing.services.risk_calculator import (
    RiskLevel,
    WeatherReading,
    calculate_risk,
)


def weather(wind=0.0, rain=0.0, snow=0.0) -> WeatherReading:
    return WeatherReading(wind_speed_mph=wind, rain_rate_in_hr=rain, snow_rate_in_hr=snow)


class TestWindClassification:
    def test_low(self):
        assert calculate_risk(weather(wind=20), 0).wind_risk == RiskLevel.LOW

    def test_moderate(self):
        assert calculate_risk(weather(wind=30), 0).wind_risk == RiskLevel.MODERATE

    def test_high(self):
        assert calculate_risk(weather(wind=40), 0).wind_risk == RiskLevel.HIGH

    def test_severe(self):
        assert calculate_risk(weather(wind=50), 0).wind_risk == RiskLevel.SEVERE

    def test_no_travel(self):
        assert calculate_risk(weather(wind=60), 0).wind_risk == RiskLevel.NO_TRAVEL

    def test_boundary_25(self):
        assert calculate_risk(weather(wind=25), 0).wind_risk == RiskLevel.MODERATE

    def test_boundary_55(self):
        assert calculate_risk(weather(wind=55), 0).wind_risk == RiskLevel.NO_TRAVEL


class TestRainClassification:
    def test_low(self):
        assert calculate_risk(weather(rain=0.05), 0).rain_risk == RiskLevel.LOW

    def test_moderate(self):
        assert calculate_risk(weather(rain=0.15), 0).rain_risk == RiskLevel.MODERATE

    def test_high(self):
        assert calculate_risk(weather(rain=0.30), 0).rain_risk == RiskLevel.HIGH

    def test_severe(self):
        assert calculate_risk(weather(rain=0.75), 0).rain_risk == RiskLevel.SEVERE

    def test_no_travel(self):
        assert calculate_risk(weather(rain=1.5), 0).rain_risk == RiskLevel.NO_TRAVEL


class TestSnowClassification:
    def test_low(self):
        assert calculate_risk(weather(snow=0.3), 0).snow_risk == RiskLevel.LOW

    def test_moderate(self):
        assert calculate_risk(weather(snow=0.7), 0).snow_risk == RiskLevel.MODERATE

    def test_high(self):
        assert calculate_risk(weather(snow=1.5), 0).snow_risk == RiskLevel.HIGH

    def test_severe(self):
        assert calculate_risk(weather(snow=2.5), 0).snow_risk == RiskLevel.SEVERE

    def test_no_travel(self):
        assert calculate_risk(weather(snow=4.0), 0).snow_risk == RiskLevel.NO_TRAVEL


class TestLoadRules:
    def test_45mph_heavy_load_is_no_travel(self):
        """45-54 mph + >30,000 lb → NO_TRAVEL"""
        result = calculate_risk(weather(wind=48), load_weight_lbs=35_000)
        assert result.level == RiskLevel.NO_TRAVEL
        assert result.load_override is True

    def test_45mph_light_load_is_severe(self):
        """45-54 mph + ≤30,000 lb → just SEVERE (from wind)"""
        result = calculate_risk(weather(wind=48), load_weight_lbs=25_000)
        assert result.level == RiskLevel.SEVERE
        assert result.load_override is False

    def test_35mph_very_heavy_load_is_severe(self):
        """35-44 mph + >40,000 lb → SEVERE via load rule"""
        result = calculate_risk(weather(wind=38), load_weight_lbs=45_000)
        assert result.level == RiskLevel.SEVERE
        assert result.load_override is True

    def test_35mph_moderate_load_stays_high(self):
        """35-44 mph + ≤40,000 lb → HIGH from wind only"""
        result = calculate_risk(weather(wind=38), load_weight_lbs=30_000)
        assert result.level == RiskLevel.HIGH
        assert result.load_override is False

    def test_55mph_any_load_no_travel(self):
        result = calculate_risk(weather(wind=55), load_weight_lbs=1_000)
        assert result.level == RiskLevel.NO_TRAVEL

    def test_worst_condition_wins(self):
        """Snow NO_TRAVEL overrides low wind."""
        result = calculate_risk(weather(wind=10, snow=4.0), 0)
        assert result.level == RiskLevel.NO_TRAVEL
