import { describe, it, expect } from "vitest";
import {
  classifyWind,
  classifyRain,
  classifySnow,
  getMaxRisk,
  evaluateCheckpointRisk,
} from "./risk";
import type { Checkpoint } from "../types";

describe("Risk Classification Utility", () => {
  describe("Wind Classification", () => {
    it("classifies wind speeds accurately per spec", () => {
      expect(classifyWind(15)).toBe("LOW");
      expect(classifyWind(24.9)).toBe("LOW");
      expect(classifyWind(25)).toBe("MODERATE");
      expect(classifyWind(34)).toBe("MODERATE");
      expect(classifyWind(35)).toBe("HIGH");
      expect(classifyWind(44)).toBe("HIGH");
      expect(classifyWind(45)).toBe("SEVERE");
      expect(classifyWind(54.9)).toBe("SEVERE");
      expect(classifyWind(55)).toBe("NO_TRAVEL");
      expect(classifyWind(70)).toBe("NO_TRAVEL");
    });
  });

  describe("Rain Classification", () => {
    it("classifies rain rate per spec", () => {
      expect(classifyRain(0.05)).toBe("LOW");
      expect(classifyRain(0.10)).toBe("MODERATE");
      expect(classifyRain(0.24)).toBe("MODERATE");
      expect(classifyRain(0.25)).toBe("HIGH");
      expect(classifyRain(0.49)).toBe("HIGH");
      expect(classifyRain(0.50)).toBe("SEVERE");
      expect(classifyRain(1.00)).toBe("SEVERE");
      expect(classifyRain(1.01)).toBe("NO_TRAVEL");
    });
  });

  describe("Snow Classification", () => {
    it("classifies snowfall rate per spec", () => {
      expect(classifySnow(0.2)).toBe("LOW");
      expect(classifySnow(0.5)).toBe("MODERATE");
      expect(classifySnow(0.99)).toBe("MODERATE");
      expect(classifySnow(1.0)).toBe("HIGH");
      expect(classifySnow(1.99)).toBe("HIGH");
      expect(classifySnow(2.0)).toBe("SEVERE");
      expect(classifySnow(3.0)).toBe("SEVERE");
      expect(classifySnow(3.1)).toBe("NO_TRAVEL");
    });
  });

  describe("Load Escalation Rules", () => {
    const mockCheckpoint: Checkpoint = {
      index: 0,
      lat: 20.4625,
      lon: 85.883,
      distance_from_start_miles: 0,
      eta: "2026-10-17T08:00:00Z",
      risk_level: "LOW",
      risk_label: "Low",
      risk_color: "#22c55e",
      risk_score: 1,
      load_override: false,
      wind_speed_mph: 48, // Severe wind
      rain_in_hr: 0,
      snow_in_hr: 0,
      wind_risk: "SEVERE",
      rain_risk: "LOW",
      snow_risk: "LOW",
      forecast: {
        times: ["2026-10-17T08:00:00Z", "2026-10-17T09:00:00Z"],
        wind_speed: [48, 56],
        rain: [0, 0],
        snow: [0, 0],
      },
    };

    it("escalates 45-54 mph wind to NO_TRAVEL if load > 30,000 lbs", () => {
      const res = evaluateCheckpointRisk(mockCheckpoint, 0, 35000);
      expect(res.level).toBe("NO_TRAVEL");
      expect(res.loadOverride).toBe(true);
    });

    it("keeps 45-54 mph wind as SEVERE if load <= 30,000 lbs", () => {
      const res = evaluateCheckpointRisk(mockCheckpoint, 0, 25000);
      expect(res.level).toBe("SEVERE");
      expect(res.loadOverride).toBe(false);
    });

    it("escalates 35-44 mph wind to SEVERE if load > 40,000 lbs", () => {
      const cp: Checkpoint = { ...mockCheckpoint, wind_speed_mph: 38 };
      const res = evaluateCheckpointRisk(cp, 0, 45000);
      expect(res.level).toBe("SEVERE");
      expect(res.loadOverride).toBe(true);
    });

    it("updates risk when forecastHourOffset is applied", () => {
      // At hour offset 1, forecast wind is 56 mph (NO_TRAVEL for any load)
      const res = evaluateCheckpointRisk(mockCheckpoint, 1, 10000);
      expect(res.level).toBe("NO_TRAVEL");
      expect(res.windSpeedMph).toBe(56);
    });
  });

  describe("getMaxRisk", () => {
    it("returns the highest severity risk level", () => {
      expect(getMaxRisk("LOW", "MODERATE")).toBe("MODERATE");
      expect(getMaxRisk("LOW", "HIGH", "MODERATE")).toBe("HIGH");
      expect(getMaxRisk("LOW", "NO_TRAVEL", "SEVERE")).toBe("NO_TRAVEL");
      expect(getMaxRisk()).toBe("LOW");
    });
  });
});


