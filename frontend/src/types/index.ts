export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "NO_TRAVEL";

export interface WeatherForecast {
  times: string[];
  wind_speed: number[];
  rain: number[];
  snow: number[];
}

export interface Checkpoint {
  index: number;
  lat: number;
  lon: number;
  distance_from_start_miles: number;
  eta: string;
  risk_level: RiskLevel;
  risk_label: string;
  risk_color: string;
  risk_score: number;
  load_override: boolean;
  wind_speed_mph: number;
  rain_in_hr: number;
  snow_in_hr: number;
  wind_risk: RiskLevel;
  rain_risk: RiskLevel;
  snow_risk: RiskLevel;
  forecast: WeatherForecast;
}

export interface RiskSummary {
  no_travel_miles: number;
  severe_miles: number;
  high_miles: number;
  moderate_miles: number;
  low_miles: number;
  avg_risk_score: number;
  overall_risk: RiskLevel;
  overall_risk_label: string;
  overall_risk_color: string;
}

export interface GeoJsonLineString {
  type: "LineString";
  coordinates: [number, number][]; // [lon, lat]
}

export interface Route {
  index: number;
  name: string;
  summary: string;
  distance_miles: number;
  duration_seconds: number;
  duration_label: string;
  duration_hours: number;
  geometry: GeoJsonLineString;
  checkpoints: Checkpoint[];
  risk_summary: RiskSummary;
  rank: number;
  score: number;
}

export interface Recommendation {
  route_index: number;
  ai_summary: string;
}

export interface RouteAnalysisResponse {
  routes: Route[];
  recommendation: Recommendation;
  request: {
    origin: string;
    destination: string;
    departure_time: string;
    load_weight_lbs: number;
    checkpoint_interval_miles: number;
  };
}

export interface RouteFormValues {
  origin: string;
  destination: string;
  departure_time: string;
  load_weight_lbs: number;
  checkpoint_interval: 10 | 25 | 50;
}
