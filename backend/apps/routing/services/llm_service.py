"""
Groq LLM service.

Generates a concise, human-readable route recommendation summary
using the llama-3.3-70b-versatile model.
"""
import json
import logging
from typing import List

from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)

MODEL = "qwen/qwen3.8-27b"


def _build_prompt(routes_data: List[dict], recommended_index: int, load_weight_lbs: float) -> str:
    summaries = []
    for r in routes_data:
        s = r["risk_summary"]
        summaries.append(
            f"Route {r['index'] + 1} ({r['name']}): "
            f"{r['distance_miles']:.0f} mi, "
            f"{r['duration_hours']:.1f}h, "
            f"No-Travel={s['no_travel_miles']:.1f}mi, "
            f"Severe={s['severe_miles']:.1f}mi, "
            f"High={s['high_miles']:.1f}mi, "
            f"Avg Risk={s['avg_risk_score']:.1f}/5, "
            f"Overall={s['overall_risk_label']}"
        )

    routes_text = "\n".join(summaries)
    recommended_name = routes_data[recommended_index]["name"]

    return f"""You are a professional truck route safety advisor. A driver with a {load_weight_lbs:,.0f} lb load needs route guidance.

Route Analysis:
{routes_text}

Route {recommended_index + 1} ({recommended_name}) is recommended.

Write a 3-4 sentence safety briefing for the driver. Mention:
1. Why the recommended route is safest given the weather and load
2. The main hazard(s) on the alternative routes
3. Any specific caution for the recommended route itself

Be direct, specific, and professional. Do not use markdown or bullet points."""


def generate_recommendation_summary(
    routes_data: List[dict],
    recommended_index: int,
    load_weight_lbs: float,
) -> str:
    """Call Groq and return the AI safety briefing text."""
    try:
        client = Groq(api_key=settings.GROQ_API_KEY, timeout=30.0)
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise, professional truck route safety advisor.",
                },
                {
                    "role": "user",
                    "content": _build_prompt(routes_data, recommended_index, load_weight_lbs),
                },
            ],
            max_tokens=300,
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        logger.error("Groq LLM call failed: %s", exc)
        return (
            "AI summary unavailable. Please review the route risk scores above "
            "to make your routing decision."
        )
