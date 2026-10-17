import { useState } from "react";
import { useRouteStore } from "../../store/routeStore";
import { RouteCard } from "./RouteCard";
import { RouteForm } from "../RouteForm";
import { formatDateTime, formatWindSpeed, formatPrecipitation } from "../../utils/formatters";
import { evaluateCheckpointRisk } from "../../utils/risk";
import { MapPin, Navigation, ListFilter, ArrowLeftRight } from "lucide-react";
import { InfoTip } from "../InfoTip";

export function RoutePanel() {
  const { analysisResult, selectedRouteIndex, forecastHourOffset, setSelectedRoute } =
    useRouteStore();
  const [activeTab, setActiveTab] = useState<"routes" | "checkpoints" | "compare">("routes");

  if (!analysisResult) {
    return (
      <div className="h-full flex flex-col p-5">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-400 font-black text-sm tracking-wide">
              w.r.t.
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Weather Routed Trucking</h1>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Routing with respect to weather | load-calibrated risk & corridor intelligence
          </p>
        </div>
        <RouteForm />
      </div>
    );
  }

  const { routes, recommendation } = analysisResult;
  const selectedRoute = routes.find((r) => r.index === selectedRouteIndex) ?? routes[0];
  const loadWeightLbs = analysisResult.request.load_weight_lbs;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Top Header Card */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="px-1.5 py-0.5 rounded-md bg-teal-500/20 flex items-center justify-center text-teal-400 text-xs font-black tracking-wide">
              w.r.t.
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">Weather Routed Trucking</h1>
              <span className="text-[10px] text-slate-400 font-medium">Routing with respect to weather</span>
            </div>
          </div>
          <button
            onClick={() => useRouteStore.getState().reset()}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 border border-slate-700 transition"
          >
            New Search
          </button>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
            <span className="truncate">{analysisResult.request.origin}</span>
            <span className="text-slate-500">→</span>
            <span className="truncate">{analysisResult.request.destination}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>Load: <strong className="text-slate-300">{loadWeightLbs.toLocaleString()} lbs</strong></span>
            <span>Sample: <strong className="text-slate-300">{analysisResult.request.checkpoint_interval_miles} mi</strong></span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mt-3 bg-slate-950/50 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab("routes")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "routes"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Routes ({routes.length})
          </button>
          <button
            onClick={() => setActiveTab("checkpoints")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "checkpoints"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Checkpoints
            <InfoTip text="Weather conditions sampled at your truck's estimated arrival time at each point along the route." align="center" />
          </button>
          <button
            onClick={() => setActiveTab("compare")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${activeTab === "compare"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Compare
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* TAB 1: ROUTES */}
        {activeTab === "routes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ranked Options
              </span>
              <span className="text-[11px] text-teal-400 font-medium">
                {selectedRoute ? selectedRoute.name : "Select route"}
              </span>
            </div>

            {routes
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((route) => (
                <RouteCard
                  key={route.index}
                  route={route}
                  isSelected={selectedRouteIndex === route.index}
                  isRecommended={route.index === recommendation.route_index}
                  forecastHourOffset={forecastHourOffset}
                  loadWeightLbs={loadWeightLbs}
                  onSelect={() => setSelectedRoute(route.index)}
                />
              ))}

          </div>
        )}

        {/* TAB 2: CHECKPOINTS TIMELINE */}
        {activeTab === "checkpoints" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div>
                <p className="text-xs font-bold text-white">
                  {selectedRoute?.name} Corridor Checkpoints
                </p>
                <p className="text-[11px] text-slate-400">
                  {selectedRoute?.checkpoints.length} sampled points · Interval: {analysisResult.request.checkpoint_interval_miles} mi
                </p>
              </div>
            </div>

            <div className="relative pl-4 space-y-3 border-l-2 border-slate-800 my-2">
              {selectedRoute?.checkpoints.map((cp, idx) => {
                const isOrigin = idx === 0;
                const isDest = idx === selectedRoute.checkpoints.length - 1;
                const risk = evaluateCheckpointRisk(cp, forecastHourOffset, loadWeightLbs);

                return (
                  <div key={cp.index} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900"
                      style={{ backgroundColor: risk.color }}
                    />

                    <div className="bg-slate-850 bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 hover:border-slate-600 transition">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-100">
                          {isOrigin ? "Origin (Mile 0)" : isDest ? `Destination (${cp.distance_from_start_miles.toFixed(1)} mi)` : `Checkpoint #${cp.index + 1} (${cp.distance_from_start_miles.toFixed(1)} mi)`}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            backgroundColor: `${risk.color}20`,
                            color: risk.color,
                          }}
                        >
                          {risk.label}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mb-2">
                        ETA: {formatDateTime(cp.eta)}
                      </p>

                      <div className="grid grid-cols-3 gap-1 text-[10px] bg-slate-900/80 p-1.5 rounded-lg text-slate-300 font-mono">
                        <span>💨 {formatWindSpeed(risk.windSpeedMph)}</span>
                        <span>🌧️ {formatPrecipitation(risk.rainInHr)}</span>
                        <span>❄️ {formatPrecipitation(risk.snowInHr)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: COMPARE ALL ROUTES */}
        {activeTab === "compare" && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-white pb-1 border-b border-slate-800">
              Side-by-Side Route Comparison
            </p>

            <div className="space-y-2.5">
              {routes.map((r) => {
                const isRec = r.index === recommendation.route_index;
                const isSel = r.index === selectedRouteIndex;

                return (
                  <div
                    key={r.index}
                    onClick={() => setSelectedRoute(r.index)}
                    className={`cursor-pointer rounded-2xl p-3 border transition ${isSel
                        ? "border-teal-500 bg-slate-800/90"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        {r.name}
                        {isRec && <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1 rounded">Best</span>}
                      </span>
                      <span className="text-[11px] font-mono text-slate-300">{r.duration_label}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Distance:</span>
                        <strong className="text-slate-200">{r.distance_miles.toFixed(1)} miles</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Severe Weather:</span>
                        <span className={r.risk_summary.severe_miles > 0 ? "text-red-400 font-bold" : "text-slate-300"}>
                          {r.risk_summary.severe_miles.toFixed(1)} mi
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>High Weather:</span>
                        <span className={r.risk_summary.high_miles > 0 ? "text-orange-400 font-bold" : "text-slate-300"}>
                          {r.risk_summary.high_miles.toFixed(1)} mi
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overall Risk:</span>
                        <span className="text-slate-200 font-semibold">{r.risk_summary.overall_risk}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
