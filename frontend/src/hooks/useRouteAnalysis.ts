import { useMutation } from "@tanstack/react-query";
import { analyzeRoutes } from "../services/api";
import { useRouteStore } from "../store/routeStore";

export function useRouteAnalysis() {
  const { setAnalysisResult, setLoading, setError } = useRouteStore();

  return useMutation({
    mutationFn: analyzeRoutes,
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setLoading(false);
    },
    onError: (err: Error) => {
      setError(err.message);
      setLoading(false);
    },
  });
}
