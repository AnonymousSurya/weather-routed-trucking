from datetime import timedelta

from rest_framework import serializers
from django.utils import timezone

DEPARTURE_GRACE_MINUTES = 15


class RouteRequestSerializer(serializers.Serializer):
    origin = serializers.CharField(max_length=300)
    destination = serializers.CharField(max_length=300)
    departure_time = serializers.DateTimeField()
    load_weight_lbs = serializers.FloatField(min_value=0, max_value=200_000)
    checkpoint_interval = serializers.ChoiceField(
        choices=[10, 25, 50],
        default=25,
        required=False,
    )

    def validate_departure_time(self, value):
        grace = timezone.now() - timedelta(minutes=DEPARTURE_GRACE_MINUTES)
        if value < grace:
            raise serializers.ValidationError(
                "Departure time must not be more than 15 minutes in the past."
            )
        return value

    def validate_load_weight_lbs(self, value):
        if value <= 0:
            raise serializers.ValidationError("Load weight must be greater than 0.")
        return value


class GeocodeRequestSerializer(serializers.Serializer):
    address = serializers.CharField(max_length=300)
