import { CircleMarker, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { Checkpoint } from "../../types";
import { formatDateTime, formatWindSpeed, formatPrecipitation } from "../../utils/formatters";
import { evaluateCheckpointRisk } from "../../utils/risk";
import { Wind, CloudRain, Snowflake } from "lucide-react";

interface Props {
  checkpoints: Checkpoint[];
  forecastHourOffset: number;
  loadWeightLbs: number;
}

function makeEndpointIcon(label: string, riskColor: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${riskColor};border:2.5px solid #ffffff;box-shadow:0 10px 20px rgba(0,0,0,0.4);color:#ffffff;font-weight:900;font-size:14px;font-family:system-ui, sans-serif;cursor:pointer;">
        ${label}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export function CheckpointMarkers({
  checkpoints,
  forecastHourOffset,
  loadWeightLbs,
}: Props) {
  if (!checkpoints.length) return null;

  return (
    <>
      {checkpoints.map((cp, idx) => {
        const isOrigin = idx === 0;
        const isDest = idx === checkpoints.length - 1;
        const risk = evaluateCheckpointRisk(cp, forecastHourOffset, loadWeightLbs);

        const popupContent = (
          <Popup minWidth={220} className="custom-dark-popup">
            <div className="p-1 font-sans text-xs text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
                <div>
                  <p className="font-bold text-sm text-white">
                    {isOrigin ? "Start (A)" : isDest ? "Finish (B)" : `Checkpoint #${cp.index + 1}`}
                  </p>
                  <p className="text-[11px] text-slate-400">Mile {cp.distance_from_start_miles.toFixed(1)}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                  style={{ backgroundColor: `${risk.color}20`, borderColor: `${risk.color}60`, color: risk.color }}>
                  {risk.label}
                </span>
              </div>
              <p className="text-[11px] mb-1">
                <span className="text-slate-500 font-semibold">ETA: </span>
                <span className="font-semibold text-white">{formatDateTime(cp.eta)}</span>
              </p>
              <div className="grid grid-cols-3 gap-1 text-center bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/50">
                <div className="flex flex-col items-center">
                  <Wind className="w-3 h-3 text-cyan-400 mb-0.5" />
                  <span className="font-semibold text-[11px]">{formatWindSpeed(risk.windSpeedMph)}</span>
                </div>
                <div className="flex flex-col items-center border-x border-slate-700/50">
                  <CloudRain className="w-3 h-3 text-blue-400 mb-0.5" />
                  <span className="font-semibold text-[11px]">{formatPrecipitation(risk.rainInHr)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <Snowflake className="w-3 h-3 text-indigo-300 mb-0.5" />
                  <span className="font-semibold text-[11px]">{formatPrecipitation(risk.snowInHr)}</span>
                </div>
              </div>
            </div>
          </Popup>
        );

        // If Origin or Destination: Render A / B badges colored by risk
        if (isOrigin || isDest) {
          return (
            <Marker
              key={cp.index}
              position={[cp.lat, cp.lon]}
              icon={makeEndpointIcon(isOrigin ? "A" : "B", risk.color)}
            >
              {popupContent}
            </Marker>
          );
        }

        // Intermediate checkpoints: Clean circle markers
        return (
          <CircleMarker
            key={cp.index}
            center={[cp.lat, cp.lon]}
            radius={6.5}
            pathOptions={{
              fillColor: risk.color,
              color: "#0f172a",
              weight: 1.5,
              fillOpacity: 0.95,
            }}
          >
            {popupContent}
          </CircleMarker>
        );
      })}
    </>
  );
}
