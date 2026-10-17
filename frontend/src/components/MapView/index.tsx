import { useState, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouteStore } from "../../store/routeStore";
import { RouteLayer } from "./RouteLayer";
import { CheckpointMarkers } from "./CheckpointMarkers";
import { WeatherHeatmapLayer } from "./WeatherHeatmapLayer";
import { ForecastSlider } from "../ForecastSlider";
import { Layers, Eye, EyeOff, Compass } from "lucide-react";
import { InfoTip } from "../InfoTip";
import type { Route } from "../../types";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FitBounds({ routes, selectedRouteIndex }: { routes: Route[]; selectedRouteIndex: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (!routes.length) return;
    const targetRoute = routes.find((r) => r.index === selectedRouteIndex) ?? routes[0];
    const coords = targetRoute?.geometry?.coordinates ?? [];

    if (coords.length > 0) {
      const latLngs = coords.map(([lon, lat]) => [lat, lon] as [number, number]);
      map.fitBounds(L.latLngBounds(latLngs), {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [70, 180],
        maxZoom: 14,
      });
    }
  }, [routes, selectedRouteIndex, map]);

  return null;
}

export function MapView() {
  const {
    analysisResult,
    selectedRouteIndex,
    forecastHourOffset,
    setSelectedRoute,
    isLoading,
  } = useRouteStore();

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showCheckpoints, setShowCheckpoints] = useState(true);

  const routes = analysisResult?.routes ?? [];
  const selectedRoute = routes.find((r) => r.index === selectedRouteIndex);
  const loadWeightLbs = analysisResult?.request.load_weight_lbs ?? 30000;

  const riskLegend = [
    { label: "Low", color: "#22c55e" },
    { label: "Moderate", color: "#eab308" },
    { label: "High", color: "#f97316" },
    { label: "Severe", color: "#ef4444" },
    { label: "No Travel", color: "#7c3aed" },
  ];

  return (
    <div className="relative w-full h-full bg-slate-900">
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={5}
        className="w-full h-full"
        zoomControl={false}
      >
        <MapResizer />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {routes.length > 0 && (
          <FitBounds routes={routes} selectedRouteIndex={selectedRouteIndex} />
        )}

        {/* 1. Render all non-selected routes in background */}
        {routes
          .filter((r) => r.index !== selectedRouteIndex)
          .map((route) => (
            <RouteLayer
              key={`bg-${route.index}`}
              route={route}
              isSelected={false}
              forecastHourOffset={forecastHourOffset}
              loadWeightLbs={loadWeightLbs}
              onClick={() => setSelectedRoute(route.index)}
            />
          ))}

        {/* 2. Render selected route on top */}
        {selectedRoute && (
          <RouteLayer
            key={`fg-${selectedRoute.index}`}
            route={selectedRoute}
            isSelected={true}
            forecastHourOffset={forecastHourOffset}
            loadWeightLbs={loadWeightLbs}
            onClick={() => {}}
          />
        )}

        {/* 3. Checkpoint markers for selected route */}
        {showCheckpoints && selectedRoute && (
          <CheckpointMarkers
            checkpoints={selectedRoute.checkpoints}
            forecastHourOffset={forecastHourOffset}
            loadWeightLbs={loadWeightLbs}
          />
        )}

        {/* 4. Weather corridor heatmap focused on selected route with calibrated density */}
        <WeatherHeatmapLayer
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          forecastHourOffset={forecastHourOffset}
          loadWeightLbs={loadWeightLbs}
          visible={showHeatmap}
        />
      </MapContainer>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 shadow-2xl text-center max-w-sm">
            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-bold text-base">Analyzing Truck Routes</p>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Evaluating weather forecasts, road curves, and load risk across corridor checkpoints…
            </p>
          </div>
        </div>
      )}

      {/* Top right map control buttons */}
      {routes.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {/* Heatmap toggle */}
          <button
            onClick={() => setShowHeatmap((v) => !v)}
            title="Toggle Weather Heatmap"
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md transition-all ${
              showHeatmap
                ? "bg-teal-600 border-teal-400 text-white shadow-teal-900/30"
                : "bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Weather Heatmap</span>
          </button>

          {/* Checkpoints toggle */}
          <button
            onClick={() => setShowCheckpoints((v) => !v)}
            title="Toggle Checkpoint Markers"
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md transition-all ${
              showCheckpoints
                ? "bg-slate-800 border-slate-500 text-white"
                : "bg-slate-900/90 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800"
            }`}
          >
            {showCheckpoints ? (
              <Eye className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>Checkpoints</span>
          </button>
        </div>
      )}

      {/* Floating Forecast Slider — bottom center of map, always visible */}
      {routes.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-80">
          <ForecastSlider />
        </div>
      )}

      {/* Risk Legend */}
      <div className="absolute bottom-6 right-4 z-[1000] bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-3 shadow-2xl">
        <div className="flex items-center gap-1.5 mb-2">
          <Compass className="w-3.5 h-3.5 text-teal-400" />
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            Corridor Risk
            <InfoTip text="Risk level at each checkpoint based on wind speed, precipitation, and truck load weight." align="right" />
          </p>
        </div>
        <div className="space-y-1.5">
          {riskLegend.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span
                className="w-3.5 h-2 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!routes.length && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-8 rounded-3xl bg-slate-900/80 backdrop-blur-md border border-slate-800 max-w-md shadow-2xl">
            <div className="text-5xl mb-3">🚛</div>
            <h2 className="text-white font-bold text-lg">Ready for Route Analysis</h2>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Enter your origin, destination, departure time, and truck weight to analyze weather risk across all route options.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
