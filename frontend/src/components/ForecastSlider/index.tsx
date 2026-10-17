import { useMemo } from "react";
import { useRouteStore } from "../../store/routeStore";
import { Clock, RotateCcw } from "lucide-react";
import { InfoTip } from "../InfoTip";

export function ForecastSlider() {
  const { forecastHourOffset, setForecastHour, analysisResult } = useRouteStore();

  const departureDate = useMemo(() => {
    if (!analysisResult?.request.departure_time) return new Date();
    return new Date(analysisResult.request.departure_time);
  }, [analysisResult?.request.departure_time]);

  const targetDateFormatted = useMemo(() => {
    const d = new Date(departureDate.getTime() + forecastHourOffset * 3600 * 1000);
    return d.toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [departureDate, forecastHourOffset]);

  const presets = [0, 6, 12, 24, 48];

  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-3.5 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            48h Forecast Window
            <InfoTip text="Simulate future conditions. Drag to see how weather risk shifts along your route over the next 48 hours." align="left" iconClass="text-slate-400" />
          </p>
        </div>
        {forecastHourOffset > 0 && (
          <button
            onClick={() => setForecastHour(0)}
            className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-semibold transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset (0h)
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-bold text-teal-300 font-mono">
          {forecastHourOffset === 0 ? "Departure Time" : `+${forecastHourOffset} hours out`}
        </span>
        <span className="text-xs font-semibold text-slate-300">
          {targetDateFormatted}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={48}
        step={1}
        value={forecastHourOffset}
        onChange={(e) => setForecastHour(Number(e.target.value))}
        className="w-full h-2 rounded-full accent-teal-400 cursor-pointer bg-slate-700"
      />

      {/* Quick Jump Buttons */}
      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-700/60">
        {presets.map((h) => {
          const isActive = forecastHourOffset === h || (h === 48 && forecastHourOffset >= 48);
          return (
            <button
              key={h}
              onClick={() => setForecastHour(h)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                isActive
                  ? "bg-teal-500 text-slate-950 font-black shadow-sm"
                  : "bg-slate-900/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              {h === 0 ? "Now" : `+${h}h`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
