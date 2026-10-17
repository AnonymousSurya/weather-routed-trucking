import type { RiskLevel, Checkpoint } from "../types";
import { RISK_COLORS, RISK_LABELS } from "../constants/risk";

export function classifyWind(speedMph: number): RiskLevel {
  if (speedMph >= 55) return "NO_TRAVEL";
  if (speedMph >= 45) return "SEVERE";
  if (speedMph >= 35) return "HIGH";
  if (speedMph >= 25) return "MODERATE";
  return "LOW";
}

export function classifyRain(rainInHr: number): RiskLevel {
  if (rainInHr > 1.0) return "NO_TRAVEL";
  if (rainInHr >= 0.5) return "SEVERE";
  if (rainInHr >= 0.25) return "HIGH";
  if (rainInHr >= 0.1) return "MODERATE";
  return "LOW";
}

export function classifySnow(snowInHr: number): RiskLevel {
  if (snowInHr > 3.0) return "NO_TRAVEL";
  if (snowInHr >= 2.0) return "SEVERE";
  if (snowInHr >= 1.0) return "HIGH";
  if (snowInHr >= 0.5) return "MODERATE";
  return "LOW";
}

const RISK_SCORE_MAP: Record<RiskLevel, number> = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  SEVERE: 4,
  NO_TRAVEL: 5,
};

export function getMaxRisk(...levels: RiskLevel[]): RiskLevel {
  let highest: RiskLevel = "LOW";
  let maxScore = 0;
  for (const lvl of levels) {
    const score = RISK_SCORE_MAP[lvl] ?? 1;
    if (score > maxScore) {
      maxScore = score;
      highest = lvl;
    }
  }
  return highest;
}

export interface CheckpointWeatherAtOffset {
  level: RiskLevel;
  label: string;
  color: string;
  windSpeedMph: number;
  rainInHr: number;
  snowInHr: number;
  windRisk: RiskLevel;
  rainRisk: RiskLevel;
  snowRisk: RiskLevel;
  loadOverride: boolean;
}

export function evaluateCheckpointRisk(
  cp: Checkpoint,
  hourOffset: number,
  loadWeightLbs: number
): CheckpointWeatherAtOffset {
  let wind = cp.wind_speed_mph;
  let rain = cp.rain_in_hr;
  let snow = cp.snow_in_hr;

  if (hourOffset > 0 && cp.forecast?.times?.length) {
    const idx = Math.min(hourOffset, cp.forecast.wind_speed.length - 1);
    wind = cp.forecast.wind_speed[idx] ?? wind;
    rain = cp.forecast.rain?.[idx] ?? rain;
    snow = cp.forecast.snow?.[idx] ?? snow;
  }

  const windRisk = classifyWind(wind);
  const rainRisk = classifyRain(rain);
  const snowRisk = classifySnow(snow);

  let baseRisk = getMaxRisk(windRisk, rainRisk, snowRisk);
  let loadOverride = false;

  if (wind >= 45 && loadWeightLbs > 30000) {
    baseRisk = "NO_TRAVEL";
    loadOverride = true;
  } else if (wind >= 35 && loadWeightLbs > 40000) {
    if (RISK_SCORE_MAP[baseRisk] < RISK_SCORE_MAP["SEVERE"]) {
      baseRisk = "SEVERE";
      loadOverride = true;
    }
  }

  return {
    level: baseRisk,
    label: RISK_LABELS[baseRisk],
    color: RISK_COLORS[baseRisk],
    windSpeedMph: wind,
    rainInHr: rain,
    snowInHr: snow,
    windRisk,
    rainRisk,
    snowRisk,
    loadOverride,
  };
}
