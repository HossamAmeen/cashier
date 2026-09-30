"""ADR-0003 / ADR-0011 invariants that must never regress."""

from django.conf import settings


def test_refresh_cookie_is_host_only_httponly_strict() -> None:
    cookie = settings.REFRESH_COOKIE
    assert cookie["HTTPONLY"] is True
    assert cookie["SAMESITE"] == "Strict"
    assert cookie["DOMAIN"] is None
    assert cookie["PATH"] == "/api/auth/"


def test_cors_is_an_explicit_allow_list_with_credentials() -> None:
    assert settings.CORS_ALLOW_CREDENTIALS is True
    assert not getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)
    assert "idempotency-key" in settings.CORS_ALLOW_HEADERS


def test_br_usr_01_argon2_is_the_production_hasher() -> None:
    from config.settings import base

    assert base.PASSWORD_HASHERS[0].endswith("Argon2PasswordHasher")


def test_access_token_lifetime_is_15_minutes() -> None:
    assert settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds() == 15 * 60
