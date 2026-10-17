import { useRouteStore } from "../../store/routeStore";
import { Bot, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";

export function AIInsight() {
  const { analysisResult } = useRouteStore();
  const [expanded, setExpanded] = useState(true);

  if (!analysisResult?.recommendation.ai_summary) return null;

  const { ai_summary, route_index } = analysisResult.recommendation;
  const recommendedRoute = analysisResult.routes.find(
    (r) => r.index === route_index
  );

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-teal-500/30 rounded-2xl overflow-hidden shadow-2xl">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3 hover:bg-slate-700/20 transition text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Bot className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-teal-300">AI Safety Dispatcher</span>
            
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Recommends: <strong className="text-white">{recommendedRoute?.name ?? `Route ${route_index + 1}`}</strong>
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/60">
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {ai_summary}
          </p>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/50 text-[10px] text-slate-500">
            <span className="flex items-center gap-1 text-teal-500">
              <Sparkles className="w-3 h-3" /> Live Weather-Calibrated
            </span>
            <span>Powered by Groq</span>
          </div>
        </div>
      )}
    </div>
  );
}
