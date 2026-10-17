import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface Suggestion {
  id: number;
  name: string;
  admin1?: string;
  country_code?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface Props {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
}

export function LocationInput({
  label,
  icon,
  value,
  onChange,
  placeholder,
  error,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);
  const userTypingRef = useRef(false);

  // Debounced search via Open-Meteo Geocoding API
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    // Only search when the user is actually typing, not when a preset sets the value
    if (!userTypingRef.current) {
      return;
    }

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const query = value.trim();
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
          )}&count=5&language=en&format=json`
        );
        if (!res.ok) return;
        const data = await res.json();
        const results = (data.results ?? []) as Suggestion[];
        // If user tapped a suggestion during the network flight, don't reopen
        if (!justSelectedRef.current) {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        // Silently fail on network/cors glitch and leave free-text input intact
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: Suggestion) => {
    justSelectedRef.current = true;
    userTypingRef.current = false;
    const parts = [s.name, s.admin1, s.country_code ?? s.country].filter(Boolean);
    const formatted = parts.join(", ");
    setIsOpen(false);
    setSuggestions([]);
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || !suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
        <span className="inline-flex items-center mr-1 text-teal-400">{icon}</span>
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            userTypingRef.current = true;
            justSelectedRef.current = false;
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0 && !justSelectedRef.current) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition shadow-inner pr-8"
        />

        {isLoading && (
          <div className="absolute right-3 top-3 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in-50 duration-150">
          <div className="p-1">
            {suggestions.map((s, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={`${s.id}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(s)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition text-xs ${
                    isHighlighted
                      ? "bg-teal-500/20 text-white border border-teal-500/30"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {[s.admin1, s.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
