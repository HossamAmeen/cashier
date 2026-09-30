"""The single server environment (ADR-0004). All values come from /opt/simple-pos/.env."""

from .base import *  # noqa: F403
from .base import env

DEBUG = False
APP_ENV = "production"
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")  # api.cashier.hossam-ameen.online,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")  # https://cashier.hossam-ameen.online
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS")  # https://api.cashier.hossam-ameen.online

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # nginx terminates TLS (ADR-0002)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_REFERRER_POLICY = "same-origin"
# HSTS is set by nginx; SSL redirect is done by nginx (port 80 server block).
# nginx owns HTTP→HTTPS redirect and HSTS for this host (ADR-0002); Django would duplicate them.
SILENCED_SYSTEM_CHECKS = ["security.W004", "security.W008"]
