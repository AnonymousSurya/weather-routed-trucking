import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { Route, RiskLevel } from "../../types";
import { evaluateCheckpointRisk } from "../../utils/risk";

declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: Record<string, unknown>
  ): L.Layer;
}

interface Props {
  routes: Route[];
  selectedRouteIndex: number | null;
  forecastHourOffset: number;
  loadWeightLbs: number;
  visible: boolean;
}

// Calibrated heat intensities per risk level to avoid artificial accumulation
const RISK_HEAT_WEIGHTS: Record<RiskLevel, number> = {
  LOW: 0.08,        // Overlapping points stay strictly in emerald/green band (< 0.35)
  MODERATE: 0.50,   // Triggers yellow band (>= 0.45)
  HIGH: 0.72,       // Triggers orange band (>= 0.65)
  SEVERE: 0.88,     // Triggers red band (>= 0.82)
  NO_TRAVEL: 1.00,  // Triggers deep purple band (>= 0.96)
};

export function WeatherHeatmapLayer({
  routes,
  selectedRouteIndex,
  forecastHourOffset,
  loadWeightLbs,
  visible,
}: Props) {
  const map = useMap();
  const heatRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    if (!visible || !routes.length) return;

    // Focus heatmap corridor on the selected route to avoid multi-route stacking
    const targetRoute =
      routes.find((r) => r.index === selectedRouteIndex) ?? routes[0];
    if (!targetRoute) return;

    const cps = targetRoute.checkpoints;
    const coords = targetRoute.geometry?.coordinates ?? [];
    if (!coords.length || !cps.length) return;

    const heatPoints: Array<[number, number, number]> = [];

    // Precalculate risk weight for each checkpoint at this forecast offset
    const cpRiskWeights = cps.map((cp) => {
      const risk = evaluateCheckpointRisk(cp, forecastHourOffset, loadWeightLbs);
      return RISK_HEAT_WEIGHTS[risk.level] ?? 0.08;
    });

    if (cps.length <= 1) {
      const w = cpRiskWeights[0] ?? 0.08;
      for (let i = 0; i < coords.length; i += 10) {
        heatPoints.push([coords[i][1], coords[i][0], w]);
      }
    } else {
      // Space points along the corridor at ~18-24 points total to form a smooth ribbon
      // without compounding point densities into false severe/moderate colors
      const totalPointsDesired = Math.min(24, Math.max(8, cps.length * 3));
      const step = Math.max(1, Math.floor(coords.length / totalPointsDesired));

      for (let i = 0; i < coords.length; i += step) {
        const [lon, lat] = coords[i];

        // Find nearest checkpoint risk
        let nearestCpIdx = 0;
        let minDist = Infinity;
        for (let c = 0; c < cps.length; c++) {
          const d = Math.hypot(cps[c].lat - lat, cps[c].lon - lon);
          if (d < minDist) {
            minDist = d;
            nearestCpIdx = c;
          }
        }

        const weight = cpRiskWeights[nearestCpIdx] ?? 0.08;
        heatPoints.push([lat, lon, weight]);
      }
    }

    if (heatPoints.length === 0) return;

    const heat = L.heatLayer(heatPoints, {
      radius: 26,
      blur: 20,
      max: 1.0,
      minOpacity: 0.20,
      gradient: {
        0.10: "#059669", // Emerald green (Low)
        0.25: "#10b981", // Light teal/green (Low)
        0.45: "#eab308", // Yellow (Moderate)
        0.65: "#f97316", // Orange (High)
        0.82: "#ef4444", // Red (Severe)
        0.96: "#7c3aed", // Purple (No Travel)
      },
    });

    heat.addTo(map);
    heatRef.current = heat;

    return () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map, routes, selectedRouteIndex, forecastHourOffset, loadWeightLbs, visible]);

  return null;
}
