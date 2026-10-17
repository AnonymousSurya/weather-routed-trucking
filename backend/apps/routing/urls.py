from django.urls import path
from . import views

urlpatterns = [
    path("routes/analyze/", views.analyze_routes, name="analyze-routes"),
    path("routes/geocode/", views.geocode_address, name="geocode-address"),
    path("health/", views.health, name="health"),
]
