import pytest
from datetime import datetime, timezone


@pytest.fixture
def departure_time():
    return datetime(2025, 6, 15, 8, 0, tzinfo=timezone.utc)
