"""pytest settings. Tests run against a real PostgreSQL (CLAUDE.md §4, ADR-0006).

DATABASE_URL defaults to the `make db-up` container; CI provides its own service.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

os.environ.setdefault("SECRET_KEY", "test-only-secret-key-not-used-anywhere-else")
os.environ.setdefault("HEALTH_CHECK_PASSWORD", "test-health-password")
os.environ.setdefault("DATABASE_URL", "sqlite:///" + str(BASE_DIR / "test_db.sqlite3"))

from .base import *  # noqa: F403
from .base import REST_FRAMEWORK

DEBUG = False
APP_ENV = "development"
ALLOWED_HOSTS = ["testserver", "localhost"]
CORS_ALLOWED_ORIGINS = ["https://cashier.test"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # speed; argon2 is asserted in its own test
REST_FRAMEWORK = {**REST_FRAMEWORK, "NUM_PROXIES": 1}
LOGGING = {"version": 1, "disable_existing_loggers": False}
