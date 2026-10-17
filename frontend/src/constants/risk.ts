import type { RiskLevel } from "../types";

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "#22c55e",
  MODERATE: "#eab308",
  HIGH: "#f97316",
  SEVERE: "#ef4444",
  NO_TRAVEL: "#7c3aed",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  SEVERE: "Severe",
  NO_TRAVEL: "No Travel",
};

export const RISK_BG_CLASSES: Record<RiskLevel, string> = {
  LOW: "bg-green-500",
  MODERATE: "bg-yellow-500",
  HIGH: "bg-orange-500",
  SEVERE: "bg-red-500",
  NO_TRAVEL: "bg-purple-700",
};

export const RISK_ORDER: RiskLevel[] = [
  "LOW",
  "MODERATE",
  "HIGH",
  "SEVERE",
  "NO_TRAVEL",
];

export const ROUTE_LINE_COLORS = ["#3b82f6", "#14b8a6", "#ec4899"];
export const ROUTE_LINE_WEIGHTS = [5, 4, 4];
export const ROUTE_LINE_OPACITY = [1, 0.75, 0.6];

export const HEATMAP_INTENSITY: Record<RiskLevel, number> = {
  LOW: 0.2,
  MODERATE: 0.45,
  HIGH: 0.65,
  SEVERE: 0.85,
  NO_TRAVEL: 1.0,
};
