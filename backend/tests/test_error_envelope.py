"""ADR-0010 envelope and BR-GEN-06 (stable §9 code on every rejection)."""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.urls("tests.urls_errors")


def test_success_is_wrapped(api_client: APIClient) -> None:
    res = api_client.get("/ok")
    assert res.status_code == 200
    assert res.json() == {"success": True, "message": "OK", "data": {"value": 1}}


def test_br_gen_06_app_error_uses_catalog_status_message_and_details(api_client: APIClient) -> None:
    res = api_client.get("/app-error")
    assert res.status_code == 409
    body = res.json()
    assert body == {
        "success": False,
        "code": "SHIFT_HAS_OPEN_ORDERS",
        "message": "لا يمكن إغلاق الوردية مع وجود طلبات غير مكتملة",
        "details": {"open_order_numbers": [1047, 1049]},
    }


def test_br_gen_06_validation_error_is_422_with_flattened_fields(api_client: APIClient) -> None:
    res = api_client.post("/validation", {"lines": [{"qty": 0}]}, format="json")
    assert res.status_code == 422
    body = res.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert "lines.0.qty" in body["details"]["fields"]


def test_br_gen_06_malformed_json_is_validation_error(api_client: APIClient) -> None:
    res = api_client.generic("POST", "/validation", "{not json", content_type="application/json")
    assert res.status_code == 422
    assert res.json()["code"] == "VALIDATION_ERROR"


def test_br_gen_06_unauthenticated_is_401(api_client: APIClient) -> None:
    res = api_client.get("/unauth")
    assert res.status_code == 401
    assert res.json()["code"] == "UNAUTHENTICATED"


def test_br_role_05_permission_denied_is_forbidden_role(api_client: APIClient) -> None:
    res = api_client.get("/forbidden")
    assert res.status_code == 403
    assert res.json()["code"] == "FORBIDDEN_ROLE"


def test_throttled_is_429_too_many_attempts_with_retry_after(api_client: APIClient) -> None:
    res = api_client.get("/throttled")
    assert res.status_code == 429
    assert res.json()["code"] == "TOO_MANY_ATTEMPTS"
    assert res.json()["details"]["retry_after_seconds"] == 13
    assert res["Retry-After"] == "13"


def test_method_not_allowed_maps_to_not_found(api_client: APIClient) -> None:
    res = api_client.delete("/ok")
    assert res.status_code == 404
    assert res.json()["code"] == "NOT_FOUND"


def test_unknown_url_returns_json_not_found(api_client: APIClient) -> None:
    res = api_client.get("/does-not-exist")
    assert res.status_code == 404
    assert res.json()["code"] == "NOT_FOUND"


def test_unexpected_exception_is_500_without_leaking_detail(api_client: APIClient) -> None:
    api_client.raise_request_exception = False
    res = api_client.get("/crash")
    assert res.status_code == 500
    body = res.json()
    assert body["code"] == "INTERNAL_ERROR"
    assert "boom" not in res.content.decode()
