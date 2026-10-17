import { useState, forwardRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { routeFormSchema, defaultDeparture, type RouteFormSchema } from "./schema";
import { useRouteAnalysis } from "../../hooks/useRouteAnalysis";
import { useRouteStore } from "../../store/routeStore";
import { LocationInput } from "./LocationInput";
import {
  Loader2,
  Navigation,
  Package,
  Clock,
  Calendar,
  ChevronDown,
  Sparkles,
  Check,
  MapPin,
  Info,
} from "lucide-react";

const CustomDateInput = forwardRef<
  HTMLButtonElement,
  { value?: string; onClick?: () => void; isOpen?: boolean }
>(({ value, onClick, isOpen }, ref) => (
  <button
    type="button"
    ref={ref}
    onClick={onClick}
    className={`w-full bg-slate-800 border rounded-xl px-3.5 py-2.5 text-sm text-left flex items-center justify-between transition-all shadow-inner group ${
      isOpen
        ? "border-teal-400 ring-2 ring-teal-500/30 bg-slate-800"
        : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/80"
    }`}
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <Calendar className="w-4 h-4 text-teal-400 flex-shrink-0" />
      <span className="font-semibold text-white truncate text-sm">
        {value || "Select Departure Time"}
      </span>
    </div>
    <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-2 flex-shrink-0">
      <span className="text-[11px] font-medium text-teal-400/80 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
        Edit
      </span>
      <ChevronDown
        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
          isOpen ? "rotate-180 text-teal-400" : ""
        }`}
      />
    </div>
  </button>
));
CustomDateInput.displayName = "CustomDateInput";

function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PRESET_ROUTES = [
  { label: "LA → Phoenix", origin: "Los Angeles, California, US", destination: "Phoenix, Arizona, US", weight: 25000, interval: 25 as const },
  { label: "Dallas → OKC", origin: "Dallas, Texas, US", destination: "Oklahoma City, Oklahoma, US", weight: 35000, interval: 25 as const },
  { label: "Chicago → Minneapolis", origin: "Chicago, Illinois, US", destination: "Minneapolis, Minnesota, US", weight: 45000, interval: 50 as const },
];

export function RouteForm() {
  const { mutate, isPending } = useRouteAnalysis();
  const { error } = useRouteStore();
  const [dateOpen, setDateOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<RouteFormSchema>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      origin: "",
      destination: "",
      departure_time: defaultDeparture(),
      load_weight_lbs: 25000,
      checkpoint_interval: 25,
    },
  });

  const currentInterval = watch("checkpoint_interval") ?? 25;

  const onSubmit = (values: RouteFormSchema) => {
    mutate({
      origin: values.origin.trim(),
      destination: values.destination.trim(),
      departure_time: values.departure_time,
      load_weight_lbs: Number(values.load_weight_lbs),
      checkpoint_interval: Number(values.checkpoint_interval) as 10 | 25 | 50,
    });
  };

  const applyPreset = (preset: typeof PRESET_ROUTES[0]) => {
    setValue("origin", preset.origin, { shouldValidate: true });
    setValue("destination", preset.destination, { shouldValidate: true });
    setValue("load_weight_lbs", preset.weight, { shouldValidate: true });
    setValue("checkpoint_interval", preset.interval, { shouldValidate: true });
    setValue("departure_time", defaultDeparture(), { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, (errs) => console.warn("Form validation:", errs))} className="space-y-4">
      {/* Quick Test Presets */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Route Presets
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_ROUTES.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Origin Autocomplete */}
      <LocationInput
        label="Origin Address"
        icon={<MapPin className="w-3.5 h-3.5" />}
        value={watch("origin") ?? ""}
        onChange={(val) => setValue("origin", val, { shouldValidate: true })}
        placeholder="City or address (e.g. Dallas, TX or Los Angeles, CA)"
        error={errors.origin?.message}
      />

      {/* Destination Autocomplete */}
      <LocationInput
        label="Destination Address"
        icon={<Navigation className="w-3.5 h-3.5" />}
        value={watch("destination") ?? ""}
        onChange={(val) => setValue("destination", val, { shouldValidate: true })}
        placeholder="City or address (e.g. Oklahoma City, OK or Phoenix, AZ)"
        error={errors.destination?.message}
      />

      {/* Departure Time */}
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
          <Clock className="inline w-3.5 h-3.5 text-teal-400 mr-1" />
          Departure Date & Time
        </label>
        <Controller
          name="departure_time"
          control={control}
          render={({ field }) => {
            const dateVal = field.value ? new Date(field.value) : new Date();
            const displayStr = !isNaN(dateVal.getTime())
              ? dateVal.toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Select Departure Time";

            return (
              <div className="space-y-2">
                <CustomDateInput
                  value={displayStr}
                  isOpen={dateOpen}
                  onClick={() => setDateOpen((v) => !v)}
                />

                {dateOpen && (
                  <div className="rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl p-2.5 overflow-hidden animate-in fade-in-50 duration-150">
                    <div className="flex justify-center">
                      <DatePicker
                        inline
                        selected={dateVal}
                        onChange={(date: Date | null) => {
                          if (date) field.onChange(toDateTimeLocal(date));
                        }}
                        showTimeSelect
                        timeIntervals={15}
                        minDate={new Date(Date.now() - 15 * 60 * 1000)}
                        filterTime={(time) => {
                          const cutoff = new Date(Date.now() - 15 * 60 * 1000);
                          const sel = field.value ? new Date(field.value) : new Date();
                          const sameDay = sel.toDateString() === new Date().toDateString();
                          return !sameDay || time >= cutoff;
                        }}
                      />
                    </div>
                    <div className="pt-2 border-t border-slate-800 mt-1">
                      <button
                        type="button"
                        onClick={() => setDateOpen(false)}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-teal-950/40 transition"
                      >
                        <Check className="w-4 h-4" />
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        />
        {errors.departure_time && (
          <p className="text-red-400 text-xs mt-1">
            {errors.departure_time.message}
          </p>
        )}
      </div>

      {/* Load Weight */}
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
          <Package className="inline w-3.5 h-3.5 text-teal-400 mr-1" />
          Truck Load Weight (lbs)
        </label>
        <input
          type="number"
          {...register("load_weight_lbs", { valueAsNumber: true })}
          placeholder="e.g. 35000"
          className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition shadow-inner"
        />
        {errors.load_weight_lbs && (
          <p className="text-red-400 text-xs mt-1">
            {errors.load_weight_lbs.message}
          </p>
        )}
        <p className="text-[11px] text-slate-500 mt-1">
          Load rules apply for &gt;30,000 lbs (No-travel at 45 mph) and &gt;40,000 lbs (Severe at 35 mph)
        </p>
      </div>

      {/* Checkpoint Interval Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
            Weather Sampling Interval
            <span className="relative group">
              <Info className="w-3 h-3 text-slate-600 cursor-help" />
              <span className="absolute bottom-full right-0 mb-1.5 w-44 text-[10px] leading-relaxed text-slate-200 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-normal normal-case tracking-normal">
                How often weather is checked along the route. Shorter = more detail, slower. Longer = faster, less granular.
              </span>
            </span>
          </label>
          <span className="text-[11px] text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/30">
            Selected: {currentInterval} miles
          </span>
        </div>
        <input
          type="hidden"
          {...register("checkpoint_interval", { valueAsNumber: true })}
        />
        <div className="grid grid-cols-3 gap-2">
          {([10, 25, 50] as const).map((v) => {
            const isSelected = Number(currentInterval) === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setValue("checkpoint_interval", v, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                }}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? "border-teal-400 bg-teal-500/20 text-teal-300 ring-2 ring-teal-500/40 shadow-teal-950/30"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                <span>{v} miles</span>
                <span className="text-[10px] font-normal opacity-70">
                  {v === 10 ? "Detailed" : v === 25 ? "Standard" : "Fastest"}
                </span>
              </button>
            );
          })}
        </div>
        {errors.checkpoint_interval && (
          <p className="text-red-400 text-xs mt-1">
            {errors.checkpoint_interval.message}
          </p>
        )}
      </div>

      {/* Validation feedback banner */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-amber-950/40 border border-amber-600/60 rounded-xl p-3 text-xs text-amber-300 shadow-md">
          <p className="font-bold mb-1 flex items-center gap-1.5">
            <span>⚠️</span> Please fix the following before analyzing:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-200/90">
            {errors.origin && <li>Origin: {errors.origin.message}</li>}
            {errors.destination && <li>Destination: {errors.destination.message}</li>}
            {errors.departure_time && <li>Departure: {errors.departure_time.message}</li>}
            {errors.load_weight_lbs && <li>Weight: {errors.load_weight_lbs.message}</li>}
            {errors.checkpoint_interval && <li>Interval: {errors.checkpoint_interval.message}</li>}
          </ul>
        </div>
      )}

      {/* Error banner from backend */}
      {error && (
        <div className="bg-red-950/60 border border-red-700/80 rounded-xl p-3 shadow-lg">
          <p className="text-red-300 text-xs leading-relaxed">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 text-sm transition-all shadow-lg shadow-teal-950/40 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing Corridor Weather…
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" />
            Analyze &amp; Rank Routes
          </>
        )}
      </button>
    </form>
  );
}
