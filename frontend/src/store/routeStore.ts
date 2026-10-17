import { create } from "zustand";
import type { RouteAnalysisResponse } from "../types";

interface RouteStore {
  analysisResult: RouteAnalysisResponse | null;
  selectedRouteIndex: number | null;
  forecastHourOffset: number;
  isLoading: boolean;
  error: string | null;

  setAnalysisResult: (result: RouteAnalysisResponse) => void;
  setSelectedRoute: (index: number) => void;
  setForecastHour: (hour: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRouteStore = create<RouteStore>((set) => ({
  analysisResult: null,
  selectedRouteIndex: null,
  forecastHourOffset: 0,
  isLoading: false,
  error: null,

  setAnalysisResult: (result) =>
    set({
      analysisResult: result,
      selectedRouteIndex: result.recommendation.route_index,
      forecastHourOffset: 0,
      error: null,
    }),
  setSelectedRoute: (index) => set({ selectedRouteIndex: index }),
  setForecastHour: (hour) => set({ forecastHourOffset: hour }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () =>
    set({
      analysisResult: null,
      selectedRouteIndex: null,
      forecastHourOffset: 0,
      isLoading: false,
      error: null,
    }),
}));
