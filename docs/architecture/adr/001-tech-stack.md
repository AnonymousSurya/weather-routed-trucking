# ADR 001: Technology Stack Selection

**Status:** Accepted  
**Date:** 2025-06-01

## Context

We need to build a weather-aware truck routing web application that:
- Fetches multiple route alternatives
- Samples weather at time-accurate checkpoints
- Applies risk rules and ranks routes
- Displays everything on an interactive map with a heatmap

## Decision

### Backend: Django + Django REST Framework
- Specified in the assessment
- DRF provides clean serializer/view separation
- `drf-spectacular` gives us OpenAPI docs for free

### Frontend: React + TypeScript + Vite
- React with TypeScript for type safety at scale
- Vite for fast HMR during development

### Routing API: OpenRouteService (ORS)
- Free tier (2000 req/day)
- Supports `driving-hgv` profile (heavy goods vehicles) — directly relevant
- Returns 3 alternative routes with full geometry
- No complex setup required

### Weather API: Open-Meteo
- **Completely free** — no API key, no rate limits for our use case
- Returns hourly forecasts for 48 hours (matches the slider requirement exactly)
- `wind_speed_10m`, `precipitation`, `snowfall` fields map directly to risk rules
- One API call per checkpoint returns all 48 hours of data

### Map: Leaflet + react-leaflet
- Open source, no API key
- `leaflet.heat` for heatmap overlay
- Risk-coloured polyline segments between checkpoints

### LLM: Groq (Qwen 3.8 27B)
- Free tier, extremely fast inference
- Used for natural language safety briefing

## Consequences

- Open-Meteo's hourly resolution means we interpolate to the nearest hour for ETAs
- ORS free tier is sufficient for demo; production would need a paid plan or self-hosted instance
- No database needed — all computation is request-scoped
