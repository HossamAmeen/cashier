"""Local development (laptops). Never used on the server (ADR-0004)."""

from .base import *  # noqa: F403
from .base import REFRESH_COOKIE, env

DEBUG = env.bool("DEBUG", default=True)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"])
REFRESH_COOKIE = {**REFRESH_COOKIE, "SECURE": False}  # http://localhost only
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
