import type { RiskLevel } from "../../types";
import { RISK_COLORS, RISK_LABELS } from "../../constants/risk";

interface Props {
  level: RiskLevel;
  size?: "sm" | "md";
}

export function RiskBadge({ level, size = "md" }: Props) {
  const color = RISK_COLORS[level];
  const label = RISK_LABELS[level];

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      <span
        className="inline-block rounded-full mr-1.5"
        style={{
          backgroundColor: color,
          width: size === "sm" ? 6 : 8,
          height: size === "sm" ? 6 : 8,
        }}
      />
      {label}
    </span>
  );
}
