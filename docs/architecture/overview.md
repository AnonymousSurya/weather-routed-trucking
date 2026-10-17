# Architecture Overview

## System Diagram

```
Browser (React)
      │
      │  POST /api/routes/analyze/
      ▼
Django View
  │
  ├── RoutingService ──────────────► OpenRouteService API
  │     └── 3 route polylines + durations
  │
  ├── CheckpointService
  │     └── Haversine interpolation every 10/25/50 miles
  │     └── ETA = departure + (dist_fraction × total_duration)
  │
  ├── WeatherService ──────────────► Open-Meteo API (concurrent)
  │     └── asyncio.gather → 48h forecast per checkpoint
  │
  ├── RiskCalculator
  │     └── Wind / Rain / Snow thresholds
  │     └── Load-weight escalation rules
  │
  ├── RecommendationEngine
  │     └── Sort by: no_travel → severe → high → avg_risk → time
  │
  └── LLMService ─────────────────► Groq API
        └── Natural language safety briefing
```

## Data Flow

1. **User** submits form: origin, destination, departure datetime, load weight (lbs)
2. **Backend** geocodes both addresses via ORS
3. **ORS** returns 3 alternative polylines (up to)
4. For each route, **checkpoints** are sampled every N miles using Haversine distance accumulation
5. Each checkpoint's **ETA** is computed: `departure + (checkpoint_dist / total_dist) × total_duration`
6. **Open-Meteo** returns 48h of hourly forecast per checkpoint (concurrent requests)
7. **RiskCalculator** classifies each checkpoint: LOW / MODERATE / HIGH / SEVERE / NO_TRAVEL
8. **RecommendationEngine** scores and ranks routes
9. **Groq** generates a 3-4 sentence safety briefing
10. **Frontend** renders all 3 routes on Leaflet with risk-coloured segments, checkpoint markers, and a weather heatmap

## Key Design Decisions

- **Stateless backend**: no database, all computation is per-request
- **Concurrent weather fetching**: `asyncio.gather` over all checkpoints for all routes
- **48h forecast slider**: all forecast data is pre-fetched and sent to the frontend — slider is purely client-side with no additional API calls
- **Risk segments**: each route polyline is broken into per-checkpoint segments coloured by the downstream checkpoint's risk level
