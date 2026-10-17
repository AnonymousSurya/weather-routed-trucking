import { useState } from "react";
import { RoutePanel } from "../RoutePanel";
import { MapView } from "../MapView";
import { AIInsight } from "../AIInsight";
import { useRouteStore } from "../../store/routeStore";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export function Layout() {
  const { analysisResult } = useRouteStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans">
      {/* Sidebar Container */}
      <div
        className={`transition-all duration-300 ease-in-out border-r border-slate-800 flex flex-col bg-slate-900 z-20 ${
          sidebarOpen ? "w-[410px] flex-shrink-0" : "w-0 overflow-hidden border-none"
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          <RoutePanel />
        </div>
        {analysisResult && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/80">
            <AIInsight />
          </div>
        )}
      </div>

      {/* Map View Area */}
      <div className="flex-1 relative h-full">
        {/* Toggle Sidebar Button floating on map */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          className="absolute top-4 left-4 z-[1000] p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-2xl backdrop-blur-md transition"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-teal-400" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-teal-400" />
          )}
        </button>

        <MapView />
      </div>
    </div>
  );
}
