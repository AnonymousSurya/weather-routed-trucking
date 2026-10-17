import { useMemo, useState } from "react";
import { Polyline, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Route } from "../../types";
import { ROUTE_LINE_COLORS, RISK_LABELS } from "../../constants/risk";
import { evaluateCheckpointRisk } from "../../utils/risk";
import { formatDateTime, formatWindSpeed, formatPrecipitation } from "../../utils/formatters";
import { Wind, CloudRain, Snowflake, AlertTriangle } from "lucide-react";

interface Props {
  route: Route;
  isSelected: boolean;
  forecastHourOffset: number;
  loadWeightLbs: number;
  onClick: () => void;
}

function squaredDist(p1: [number, number], p2: [number, number]): number {
  const dLat = p1[0] - p2[0];
  const dLon = p1[1] - p2[1];
  return dLat * dLat + dLon * dLon;
}

export function RouteLayer({
  route,
  isSelected,
  forecastHourOffset,
  loadWeightLbs,
  onClick,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const routeColor = ROUTE_LINE_COLORS[route.index] ?? "#94a3b8";

  // Full road polyline coordinates from OpenRouteService [lat, lon]
  const fullCoords = useMemo<[number, number][]>(() => {
    return (route.geometry?.coordinates ?? []).map(([lon, lat]) => [lat, lon]);
  }, [route.geometry?.coordinates]);

  // Accurately slice fullCoords into real road segments between checkpoints
  const segments = useMemo(() => {
    const checkpoints = route.checkpoints;
    if (!fullCoords.length) return [];

    if (checkpoints.length < 2) {
      const cp0 = checkpoints[0];
      const riskInfo = cp0 ? evaluateCheckpointRisk(cp0, forecastHourOffset, loadWeightLbs) : null;
      return [
        {
          positions: fullCoords as LatLngExpression[],
          color: riskInfo?.color ?? routeColor,
          label: riskInfo?.label ?? "Low",
          segmentIndex: 0,
          eta: cp0?.eta ?? "",
          distanceMiles: cp0?.distance_from_start_miles ?? 0,
          windSpeedMph: riskInfo?.windSpeedMph ?? 0,
          rainInHr: riskInfo?.rainInHr ?? 0,
          snowInHr: riskInfo?.snowInHr ?? 0,
          windRisk: riskInfo?.windRisk ?? "LOW",
          rainRisk: riskInfo?.rainRisk ?? "LOW",
          snowRisk: riskInfo?.snowRisk ?? "LOW",
          loadOverride: riskInfo?.loadOverride ?? false,
        },
      ];
    }

    // Step 1: Project each checkpoint to nearest vertex index in fullCoords
    const n = fullCoords.length;
    const m = checkpoints.length;
    const indices: number[] = new Array(m);
    indices[0] = 0;
    indices[m - 1] = n - 1;

    let searchStart = 0;
    for (let i = 1; i < m - 1; i++) {
      const cp = checkpoints[i];
      let bestIdx = searchStart;
      let bestDist = Infinity;
      const target: [number, number] = [cp.lat, cp.lon];

      // Constrain search between previous checkpoint vertex and end of route
      for (let k = searchStart; k < n; k++) {
        const d = squaredDist(fullCoords[k], target);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = k;
        }
      }
      indices[i] = bestIdx;
      searchStart = bestIdx;
    }

    // Step 2: Build segments along true road curvature
    const result: Array<{
      positions: LatLngExpression[];
      color: string;
      label: string;
      segmentIndex: number;
      eta: string;
      distanceMiles: number;
      windSpeedMph: number;
      rainInHr: number;
      snowInHr: number;
      windRisk: string;
      rainRisk: string;
      snowRisk: string;
      loadOverride: boolean;
    }> = [];

    for (let i = 0; i < m - 1; i++) {
      const startIdx = indices[i];
      const endIdx = Math.max(indices[i + 1], startIdx + 1);
      let slice = fullCoords.slice(startIdx, endIdx + 1);

      if (slice.length < 2) {
        slice = [
          [checkpoints[i].lat, checkpoints[i].lon],
          [checkpoints[i + 1].lat, checkpoints[i + 1].lon],
        ];
      }

      const downstreamCp = checkpoints[i + 1];
      const riskInfo = evaluateCheckpointRisk(downstreamCp, forecastHourOffset, loadWeightLbs);

      result.push({
        positions: slice as LatLngExpression[],
        color: riskInfo.color,
        label: riskInfo.label,
        segmentIndex: i,
        eta: downstreamCp.eta,
        distanceMiles: downstreamCp.distance_from_start_miles,
        windSpeedMph: riskInfo.windSpeedMph,
        rainInHr: riskInfo.rainInHr,
        snowInHr: riskInfo.snowInHr,
        windRisk: riskInfo.windRisk,
        rainRisk: riskInfo.rainRisk,
        snowRisk: riskInfo.snowRisk,
        loadOverride: riskInfo.loadOverride ?? false,
      });
    }

    return result;
  }, [fullCoords, route.checkpoints, forecastHourOffset, loadWeightLbs, routeColor]);

  return (
    <>
      {/* Casing / Halo for active or hovered route */}
      {(isSelected || isHovered) && fullCoords.length > 0 && (
        <Polyline
          positions={fullCoords}
          pathOptions={{
            color: isSelected ? "#06b6d4" : routeColor,
            weight: isSelected ? 9 : 6,
            opacity: isSelected ? 0.25 : 0.4,
            lineCap: "round",
            lineJoin: "round",
          }}
          eventHandlers={{
            click: onClick,
            mouseover: () => setIsHovered(true),
            mouseout: () => setIsHovered(false),
          }}
        />
      )}

      {/* When NOT selected: render bold, distinct route line with generous hit area and hover pop */}
      {!isSelected && fullCoords.length > 0 && (
        <>
          {/* Invisible wide hit area for effortless clicking/hovering */}
          <Polyline
            positions={fullCoords}
            pathOptions={{
              color: "#000000",
              weight: 22,
              opacity: 0,
            }}
            eventHandlers={{
              click: onClick,
              mouseover: () => setIsHovered(true),
              mouseout: () => setIsHovered(false),
            }}
          />

          {/* Visible alternative route polyline */}
          <Polyline
            positions={fullCoords}
            pathOptions={{
              color: routeColor,
              weight: isHovered ? 6 : 4.5,
              opacity: isHovered ? 1.0 : 0.8,
              dashArray: isHovered ? undefined : "8, 6",
              lineCap: "round",
              lineJoin: "round",
            }}
            eventHandlers={{
              click: onClick,
              mouseover: () => setIsHovered(true),
              mouseout: () => setIsHovered(false),
            }}
          >
            <Tooltip sticky>
              <div className="font-sans text-xs p-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: routeColor }}
                  />
                  <strong className="text-white text-sm">{route.name}</strong>
                  <span className="text-slate-300 font-medium">· {route.duration_label}</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Total Distance: <strong>{route.distance_miles.toFixed(1)} mi</strong>
                </p>
                <div className="text-[11px] text-teal-400 font-bold mt-1.5 pt-1 border-t border-slate-700">
                  👉 Click to switch to this route
                </div>
              </div>
            </Tooltip>
          </Polyline>
        </>
      )}

      {/* When SELECTED: dark road casing keeps risk colors readable against light map tiles */}
      {isSelected && fullCoords.length > 0 && (
        <Polyline
          positions={fullCoords}
          pathOptions={{
            color: "#0f172a",
            weight: 8,
            opacity: 0.65,
            lineCap: "round",
            lineJoin: "round",
          }}
          eventHandlers={{
            click: onClick,
            mouseover: () => setIsHovered(true),
            mouseout: () => setIsHovered(false),
          }}
        />
      )}

      {/* When SELECTED: render accurate risk-colored segments on top of casing */}
      {isSelected &&
        segments.map((seg, i) => (
          <Polyline
            key={`${route.index}-seg-${i}`}
            positions={seg.positions}
            pathOptions={{
              color: seg.color,
              weight: 5.5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
            eventHandlers={{
              click: onClick,
              mouseover: () => setIsHovered(true),
              mouseout: () => setIsHovered(false),
            }}
          >
            <Tooltip sticky direction="top" offset={[0, -6]}>
              <div className="font-sans text-xs text-slate-200" style={{ minWidth: 210 }}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
                  <div>
                    <p className="font-bold text-sm text-white">{route.name} · Seg {seg.segmentIndex + 1}</p>
                    <p className="text-[11px] text-slate-400">At mile {seg.distanceMiles.toFixed(1)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                    style={{ backgroundColor: `${seg.color}20`, borderColor: `${seg.color}60`, color: seg.color }}>
                    {seg.label}
                  </span>
                </div>
                {/* ETA */}
                <p className="text-[11px] mb-1.5">
                  <span className="text-slate-500 font-semibold">ETA: </span>
                  <span className="font-semibold text-white">{formatDateTime(seg.eta)}</span>
                </p>
                {/* Load warning */}
                {seg.loadOverride && (
                  <div className="flex items-center gap-1 mb-1.5 px-1.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px]">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    Load escalation active
                  </div>
                )}
                {/* Weather grid */}
                <div className="grid grid-cols-3 gap-1 text-center bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/50">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mb-0.5"><Wind className="w-2.5 h-2.5 text-cyan-400" /> Wind</span>
                    <span className="font-semibold text-[11px] text-slate-100">{formatWindSpeed(seg.windSpeedMph)}</span>
                    <span className="text-[9px] text-slate-400">{RISK_LABELS[seg.windRisk as keyof typeof RISK_LABELS]}</span>
                  </div>
                  <div className="flex flex-col items-center border-x border-slate-700/50 px-1">
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mb-0.5"><CloudRain className="w-2.5 h-2.5 text-blue-400" /> Rain</span>
                    <span className="font-semibold text-[11px] text-slate-100">{formatPrecipitation(seg.rainInHr)}</span>
                    <span className="text-[9px] text-slate-400">{RISK_LABELS[seg.rainRisk as keyof typeof RISK_LABELS]}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mb-0.5"><Snowflake className="w-2.5 h-2.5 text-indigo-300" /> Snow</span>
                    <span className="font-semibold text-[11px] text-slate-100">{formatPrecipitation(seg.snowInHr)}</span>
                    <span className="text-[9px] text-slate-400">{RISK_LABELS[seg.snowRisk as keyof typeof RISK_LABELS]}</span>
                  </div>
                </div>
                {forecastHourOffset > 0 && (
                  <p className="mt-1.5 text-[9px] text-teal-400 italic text-right">+{forecastHourOffset}h forecast offset</p>
                )}
              </div>
            </Tooltip>
          </Polyline>
        ))}
    </>
  );
}
