# WeatherRoute — Weather-Aware Truck Routing

> A production-grade full-stack application that helps truck drivers choose the safest route based on real-time weather forecasts, load weight, and travel time.

![CI](https://github.com/your-org/weather-truck-routing/actions/workflows/ci.yml/badge.svg)

---

## Features

- **3 Route Alternatives** via OpenRouteService (driving-HGV profile)
- **Weather-Accurate Checkpoints** sampled every 10, 25, or 50 miles with ETA-based weather forecasts
- **Risk Classification** — Low / Moderate / High / Severe / No Travel per checkpoint (wind, rain, snow + load rules)
- **Smart Recommendation** — ranked by fewest severe/high miles, then average risk, then travel time
- **Interactive Map** — risk-coloured polyline segments, checkpoint popups, weather heatmap overlay
- **0–48h Forecast Slider** — explore how weather evolves along the route over the next 2 days
- **AI Safety Briefing** — Groq (llama-3.3-70b) explains the recommendation in plain language

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Map | Leaflet.js + react-leaflet, leaflet.heat |
| State | Zustand + TanStack Query |
| Backend | Django 5, Django REST Framework |
| Routing API | OpenRouteService (free tier) |
| Weather API | Open-Meteo (free, no key needed) |
| LLM | Groq — llama-3.3-70b-versatile |
| CI/CD | GitHub Actions |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node 20+
- OpenRouteService API key ([free signup](https://openrouteservice.org/))
- Groq API key ([free signup](https://console.groq.com/))

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements/dev.txt

cp .env.example .env   # Fill in ORS_API_KEY and GROQ_API_KEY

python manage.py migrate
python manage.py runserver
```

API is available at `http://localhost:8000/api/`  
Swagger docs at `http://localhost:8000/api/docs/`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App is available at `http://localhost:5173`

### Docker (Full Stack)

```bash
cp backend/.env.example backend/.env  # Fill in keys
docker compose up --build
```

---

## Running Tests

```bash
cd backend
pytest --cov=apps --cov-report=term-missing
```

Test coverage includes:
- Risk classification (all boundary conditions)
- Load-weight escalation rules
- Checkpoint sampling (origin, destination, ETAs, spacing)
- Route ranking logic

---

## API Reference

### `POST /api/routes/analyze/`

```json
{
  "origin": "Dallas, TX",
  "destination": "Oklahoma City, OK",
  "departure_time": "2025-06-15T08:00:00Z",
  "load_weight_lbs": 35000,
  "checkpoint_interval": 25
}
```

Returns 3 routes with full checkpoint weather data, risk levels, and an AI recommendation.

### `GET /api/routes/geocode/?address=Dallas,TX`

Returns `{ lat, lon }` for a free-text address.

### `GET /api/health/`

Liveness probe: `{ "status": "ok" }`.

Full interactive docs: `http://localhost:8000/api/docs/`

---

## Risk Rules

| Condition | Low | Moderate | High | Severe | No Travel |
|---|---|---|---|---|---|
| Wind | < 25 mph | 25–34 | 35–44 | 45–54 | ≥ 55 mph |
| Rain | < 0.10 in/hr | 0.10–0.25 | 0.25–0.50 | 0.50–1.00 | > 1.00 |
| Snow | < 0.5 in/hr | 0.5–1.0 | 1.0–2.0 | 2.0–3.0 | > 3.0 |

**Load escalations:**
- ≥ 55 mph wind → No Travel (any load)
- 45–54 mph wind + load > 30,000 lb → No Travel
- 35–44 mph wind + load > 40,000 lb → Severe (minimum)

**Route ranking priority:**
1. Fewest No-Travel miles
2. Fewest Severe miles
3. Fewest High miles
4. Lowest average risk score
5. Shortest travel time

---

## Project Structure

```
weather-truck-routing/
├── backend/
│   ├── apps/routing/
│   │   └── services/
│   │       ├── risk_calculator.py      # Pure risk logic, fully tested
│   │       ├── checkpoint_service.py   # Haversine polyline sampling
│   │       ├── weather_service.py      # Open-Meteo async fetcher
│   │       ├── routing_service.py      # OpenRouteService integration
│   │       ├── recommendation_engine.py# Route scoring & ranking
│   │       └── llm_service.py          # Groq AI briefings
│   └── tests/                          # pytest unit tests
├── frontend/
│   └── src/
│       ├── components/                 # React components
│       ├── store/                      # Zustand global state
│       └── hooks/                      # TanStack Query hooks
├── .github/workflows/ci.yml            # GitHub Actions CI
├── docker-compose.yml                  # Local dev container setup
└── docs/architecture/                  # ADRs and system overview
```

---

## Deployment

**Backend:** Deploy to [Railway](https://railway.app) or [Render](https://render.com) — both support Python with free tiers.

**Frontend:** Deploy to [Vercel](https://vercel.com) — set `VITE_API_URL` to your backend URL.

---

## License

MIT
