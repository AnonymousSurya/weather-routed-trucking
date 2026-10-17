import { Info } from "lucide-react";

interface Props {
  text: string;
  align?: "left" | "right" | "center";
  iconClass?: string;
  tipClass?: string;
}

export function InfoTip({ text, align = "center", iconClass = "text-slate-600", tipClass }: Props) {
  const alignClass =
    align === "left"
      ? "left-0"
      : align === "right"
      ? "right-0"
      : "left-1/2 -translate-x-1/2";

  return (
    <span className="relative group inline-flex items-center">
      <Info className={`w-3 h-3 cursor-help flex-shrink-0 ${iconClass}`} />
      <span
        className={`absolute bottom-full ${alignClass} mb-1.5 text-[10px] leading-relaxed text-slate-200 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999] font-normal normal-case tracking-normal ${tipClass ?? "w-48"}`}
      >
        {text}
      </span>
    </span>
  );
}
