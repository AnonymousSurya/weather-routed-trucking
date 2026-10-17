import { useMemo } from "react";
import type { Route } from "../../types";
import { RiskBadge } from "./RiskBadge";
import { ROUTE_LINE_COLORS } from "../../constants/risk";
import { formatMiles } from "../../utils/formatters";
import { Star, AlertTriangle } from "lucide-react";
import { InfoTip } from "../InfoTip";
import { evaluateCheckpointRisk, getMaxRisk } from "../../utils/risk";

interface Props {
  route: Route;
  isSelected: boolean;
  isRecommended: boolean;
  forecastHourOffset: number;
  loadWeightLbs: number;
  onSelect: () => void;
}

export function RouteCard({
  route,
  isSelected,
  isRecommended,
  forecastHourOffset,
  loadWeightLbs,
  onSelect,
}: Props) {
  const lineColor = ROUTE_LINE_COLORS[route.index] ?? "#94a3b8";

  // Dynamically compute risk summary at current forecast offset
  const dynamicSummary = useMemo(() => {
    if (forecastHourOffset === 0) {
      return route.risk_summary;
    }

    const cps = route.checkpoints;
    if (!cps.length) return route.risk_summary;

    let severeMiles = 0;
    let highMiles = 0;
    let moderateMiles = 0;
    let lowMiles = 0;
    let noTravelMiles = 0;
    let totalScore = 0;
    const evaluatedLevels: Array<"LOW" | "MODERATE" | "HIGH" | "SEVERE" | "NO_TRAVEL"> = [];

    const dists = cps.map((c) => c.distance_from_start_miles);
    for (let i = 0; i < cps.length; i++) {
      const evalRisk = evaluateCheckpointRisk(cps[i], forecastHourOffset, loadWeightLbs);
      evaluatedLevels.push(evalRisk.level);
      const score = evalRisk.level === "NO_TRAVEL" ? 5 : evalRisk.level === "SEVERE" ? 4 : evalRisk.level === "HIGH" ? 3 : evalRisk.level === "MODERATE" ? 2 : 1;
      totalScore += score;

      const seg = i === 0 ? 0 : dists[i] - dists[i - 1];
      if (evalRisk.level === "NO_TRAVEL") noTravelMiles += seg;
      else if (evalRisk.level === "SEVERE") severeMiles += seg;
      else if (evalRisk.level === "HIGH") highMiles += seg;
      else if (evalRisk.level === "MODERATE") moderateMiles += seg;
      else lowMiles += seg;
    }

    const overall = getMaxRisk(...evaluatedLevels);
    const avg = totalScore / cps.length;

    return {
      no_travel_miles: Math.round(noTravelMiles * 10) / 10,
      severe_miles: Math.round(severeMiles * 10) / 10,
      high_miles: Math.round(highMiles * 10) / 10,
      moderate_miles: Math.round(moderateMiles * 10) / 10,
      low_miles: Math.round(lowMiles * 10) / 10,
      avg_risk_score: Math.round(avg * 100) / 100,
      overall_risk: overall,
      overall_risk_label: overall.replace("_", " ").toLowerCase(),
      overall_risk_color: lineColor,
    };
  }, [route, forecastHourOffset, loadWeightLbs, lineColor]);

  const s = dynamicSummary;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-3.5 transition-all duration-200 relative overflow-hidden ${
        isSelected
          ? "border-teal-400 bg-slate-800/95 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/50"
          : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/50"
      }`}
    >
      {/* Route Color Accent Strip on Left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: lineColor }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 pl-1.5">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
            style={{ backgroundColor: lineColor }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                {route.name}
              </span>
              {isRecommended && (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  <Star className="w-3 h-3 fill-amber-400" />
                  Recommended
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {formatMiles(route.distance_miles)} · {route.duration_label}
            </p>
          </div>
        </div>
        <RiskBadge level={s.overall_risk} size="sm" />
      </div>

      {/* Risk proportion bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px mb-2.5 bg-slate-800 pl-1.5">
        {[
          { miles: s.low_miles, color: "#22c55e" },
          { miles: s.moderate_miles, color: "#eab308" },
          { miles: s.high_miles, color: "#f97316" },
          { miles: s.severe_miles, color: "#ef4444" },
          { miles: s.no_travel_miles, color: "#7c3aed" },
        ]
          .filter((b) => b.miles > 0)
          .map((b, i) => (
            <div
              key={i}
              style={{
                flex: Math.max(0.1, b.miles),
                backgroundColor: b.color,
              }}
              title={`${b.miles.toFixed(1)} mi`}
            />
          ))}
      </div>

      {/* Stats summary row */}
      <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-400 pl-1.5 border-t border-slate-800/80 pt-2">
        <span className="flex items-center gap-1">
          <AlertTriangle className={`w-3 h-3 ${s.severe_miles > 0 ? "text-red-400" : "text-slate-500"}`} />
          <span>{s.severe_miles.toFixed(0)} mi severe</span>
          <InfoTip text="Miles of route with severe weather: high winds, heavy rain/snow. Avoid if possible." align="left" />
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className={`w-3 h-3 ${s.high_miles > 0 ? "text-orange-400" : "text-slate-500"}`} />
          <span>{s.high_miles.toFixed(0)} mi high</span>
          <InfoTip text="Miles of route with high weather risk: elevated winds or moderate precipitation." align="center" />
        </span>
        <span className="flex items-center justify-end gap-1 text-slate-400 font-mono">
          avg {s.avg_risk_score.toFixed(1)}/5
          <InfoTip text="Average risk score across all checkpoints. 1=Low · 2=Moderate · 3=High · 4=Severe · 5=No Travel" align="right" />
        </span>
      </div>
    </button>
  );
}
