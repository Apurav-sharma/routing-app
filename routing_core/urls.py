from django.urls import path
from .views import health_check, list_hubs, geocode_location, analyze_routes

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("hubs/", list_hubs, name="list_hubs"),
    path("geocode/", geocode_location, name="geocode_location"),
    path("routes/analyze/", analyze_routes, name="analyze_routes"),
]
