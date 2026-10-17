import { z } from "zod";

export function defaultDeparture(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const routeFormSchema = z.object({
  origin: z.string().min(2, "Enter a valid origin address"),
  destination: z.string().min(2, "Enter a valid destination address"),
  departure_time: z.string().refine((v) => {
    if (!v) return false;
    const d = new Date(v);
    // Match backend grace window: 15 minutes in the past
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    return !isNaN(d.getTime()) && d > fifteenMinsAgo;
  }, "Departure time must not be more than 15 minutes in the past"),
  load_weight_lbs: z.coerce
    .number({ invalid_type_error: "Enter a valid load weight in lbs" })
    .positive("Load weight must be greater than 0")
    .max(200_000, "Maximum 200,000 lbs"),
  checkpoint_interval: z.coerce
    .number()
    .refine((v) => [10, 25, 50].includes(v), {
      message: "Interval must be 10, 25, or 50 miles",
    }),
});

export type RouteFormSchema = z.infer<typeof routeFormSchema>;

