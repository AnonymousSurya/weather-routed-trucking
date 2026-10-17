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
      // Map each checkpoint to its closest geometry coordinate index
      const cpGeoIdx = cps.map((cp) => {
        let minDist = Infinity;
        let idx = 0;
        for (let g = 0; g < coords.length; g++) {
          const d = Math.hypot(coords[g][1] - cp.lat, coords[g][0] - cp.lon);
          if (d < minDist) { minDist = d; idx = g; }
        }
        return idx;
      });

      // For each geometry point, find which segment [cp_i → cp_{i+1}] it belongs to
      // by checking its index against the checkpoint geometry indices.
      // Use dense sampling (every 3rd point) so transitions are sharp at boundaries.
      const step = Math.max(1, Math.floor(coords.length / 60));
      for (let g = 0; g < coords.length; g += step) {
        const [lon, lat] = coords[g];

        // Find which segment this geometry point belongs to
        let segIdx = 0;
        for (let c = 0; c < cpGeoIdx.length - 1; c++) {
          if (g >= cpGeoIdx[c]) segIdx = c;
        }

        const weight = cpRiskWeights[segIdx] ?? 0.08;
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
