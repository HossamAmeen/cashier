"""DRF_SKILL §27 required health tests."""

import pytest
from django.conf import settings
from rest_framework.test import APIClient

URL = "/api/health"
PASSWORD = "test-health-password"


@pytest.mark.django_db
def test_health_endpoint_returns_success_with_valid_password(api_client: APIClient) -> None:
    res = api_client.get(URL, HTTP_X_HEALTH_CHECK_TOKEN=PASSWORD)
    assert res.status_code == 200
    assert res.json() == {"success": True, "message": "OK", "data": {"status": "healthy", "version": settings.APP_VERSION}}


def test_health_endpoint_accepts_query_password(api_client: APIClient) -> None:
    res = api_client.get(URL, {"password": PASSWORD})
    assert res.status_code == 200


def test_health_endpoint_rejects_invalid_password(api_client: APIClient) -> None:
    res = api_client.get(URL, HTTP_X_HEALTH_CHECK_TOKEN="wrong")
    assert res.status_code == 401
    assert res.json()["code"] == "UNAUTHENTICATED"


def test_health_endpoint_requires_password(api_client: APIClient) -> None:
    res = api_client.get(URL)
    assert res.status_code == 401


def test_health_endpoint_does_not_expose_secret(api_client: APIClient) -> None:
    for res in (api_client.get(URL, HTTP_X_HEALTH_CHECK_TOKEN=PASSWORD), api_client.get(URL)):
        assert PASSWORD not in res.content.decode()


def test_health_endpoint_has_its_own_throttle_scope() -> None:
    from apps.health.views import HealthView
    from common.throttling import HealthRateThrottle

    assert HealthView.throttle_classes == [HealthRateThrottle]
