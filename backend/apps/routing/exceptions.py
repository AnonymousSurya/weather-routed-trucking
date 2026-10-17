import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


class GeocodingError(Exception):
    pass


class RoutingError(Exception):
    pass


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        # Flatten DRF field errors (dicts/lists) to a single readable string
        raw = response.data
        if isinstance(raw, dict):
            parts = []
            for field, errs in raw.items():
                if isinstance(errs, list):
                    parts.extend(str(e) for e in errs)
                else:
                    parts.append(str(errs))
            error_str = " ".join(parts)
        elif isinstance(raw, list):
            error_str = " ".join(str(e) for e in raw)
        else:
            error_str = str(raw)
        response.data = {"error": error_str, "status": response.status_code}
        return response

    if isinstance(exc, (GeocodingError, RoutingError)):
        logger.warning("Routing error: %s", exc)
        return Response(
            {"error": str(exc), "status": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, ValueError):
        logger.warning("Validation error: %s", exc)
        return Response(
            {"error": str(exc), "status": 400},
            status=status.HTTP_400_BAD_REQUEST,
        )

    logger.exception("Unhandled exception: %s", exc)
    return Response(
        {"error": "An internal error occurred. Please try again.", "status": 500},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
