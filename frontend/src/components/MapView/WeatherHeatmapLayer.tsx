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

// One color per risk level — exact match to route segment colors
const RISK_COLOR: Record<RiskLevel, string> = {
  LOW:       "#22c55e",
  MODERATE:  "#eab308",
  HIGH:      "#f97316",
  SEVERE:    "#ef4444",
  NO_TRAVEL: "#7c3aed",
};

export function WeatherHeatmapLayer({
  routes,
  selectedRouteIndex,
  forecastHourOffset,
  loadWeightLbs,
  visible,
}: Props) {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    // Remove all previous layers
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    if (!visible || !routes.length) return;

    const targetRoute =
      routes.find((r) => r.index === selectedRouteIndex) ?? routes[0];
    if (!targetRoute) return;

    const cps = targetRoute.checkpoints;
    const coords = targetRoute.geometry?.coordinates ?? [];
    if (!coords.length || !cps.length) return;

    // Compute risk level for each checkpoint
    const cpLevels: RiskLevel[] = cps.map((cp) =>
      evaluateCheckpointRisk(cp, forecastHourOffset, loadWeightLbs).level
    );

    // Group geometry points by the risk level of their nearest checkpoint
    const pointsByLevel: Partial<Record<RiskLevel, Array<[number, number, number]>>> = {};

    const step = Math.max(1, Math.floor(coords.length / 80));
    for (let g = 0; g < coords.length; g += step) {
      const [lon, lat] = coords[g];

      let nearestCpIdx = 0;
      let minDist = Infinity;
      for (let c = 0; c < cps.length; c++) {
        const d = Math.hypot(cps[c].lat - lat, cps[c].lon - lon);
        if (d < minDist) { minDist = d; nearestCpIdx = c; }
      }

      const level = cpLevels[nearestCpIdx];
      if (!pointsByLevel[level]) pointsByLevel[level] = [];
      pointsByLevel[level]!.push([lat, lon, 0.8]);
    }

    // One heatmap layer per risk level — no cross-color blending
    for (const [level, pts] of Object.entries(pointsByLevel)) {
      if (!pts?.length) continue;
      const color = RISK_COLOR[level as RiskLevel] ?? "#22c55e";
      const heat = L.heatLayer(pts, {
        radius: 25,
        blur: 15,
        max: 1.0,
        minOpacity: 0.35,
        gradient: { 0.1: color, 1.0: color },
      });
      heat.addTo(map);
      layersRef.current.push(heat);
    }

    return () => {
      layersRef.current.forEach((l) => map.removeLayer(l));
      layersRef.current = [];
    };
  }, [map, routes, selectedRouteIndex, forecastHourOffset, loadWeightLbs, visible]);

  return null;
}
