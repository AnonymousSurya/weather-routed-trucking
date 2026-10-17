import axios from "axios";
import type { RouteAnalysisResponse, RouteFormValues } from "../types";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 120_000,
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    let msg =
      err.response?.data?.error ?? err.response?.data?.detail ?? err.message ?? "Unexpected error";

    if (typeof msg === "object" && msg !== null) {
      msg = Object.entries(msg)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
        .join(" | ");
    }
    return Promise.reject(new Error(String(msg)));
  }
);

export async function analyzeRoutes(
  form: RouteFormValues
): Promise<RouteAnalysisResponse> {
  const payload = {
    origin: form.origin,
    destination: form.destination,
    departure_time: new Date(form.departure_time).toISOString(),
    load_weight_lbs: form.load_weight_lbs,
    checkpoint_interval: form.checkpoint_interval,
  };
  const { data } = await client.post<RouteAnalysisResponse>(
    "/routes/analyze/",
    payload
  );
  return data;
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lon: number }> {
  const { data } = await client.get("/routes/geocode/", {
    params: { address },
  });
  return data;
}
