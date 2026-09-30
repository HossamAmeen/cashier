"""Shared settings (DRF_SKILL.md §7). Environment-specific values come from env vars only (§8)."""

from datetime import timedelta
from pathlib import Path

import dj_database_url
import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    environ.Env.read_env(str(_env_file))

# --- Core -------------------------------------------------------------------
SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS: list[str] = env.list("ALLOWED_HOSTS", default=[])
APP_ENV = env("APP_ENV", default="development")  # development | production (ADR-0004)
PRELAUNCH = env.bool("PRELAUNCH", default=False)  # true until GATE C (ADR-0004)

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Project
    "apps.health",
    "apps.users",
    "apps.store_settings",
    "apps.catalog",
    "apps.tables",
    "apps.shifts",
    "apps.orders",
    "apps.payments",
    "apps.dashboard",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
APPEND_SLASH = False  # contract paths have no trailing slash (ADR-0008)

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Database (DRF_SKILL §9; PostgreSQL 16 on the server and in tests) ---------
DATABASES = {
    "default": dj_database_url.config(
        env="DATABASE_URL",
        default="sqlite:///" + str(BASE_DIR / "db.sqlite3"),
        conn_max_age=600,
    )
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Auth -------------------------------------------------------------------
AUTH_USER_MODEL = "users.User"
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",  # BR-USR-01
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# --- I18N / time (ADR-0013) ---------------------------------------------------
LANGUAGE_CODE = "en-us"  # code and admin in English; user-facing text is Arabic in the PWA (CLAUDE.md §7)
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
BUSINESS_TIMEZONE = "Africa/Cairo"

# --- Static -----------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = env("STATIC_ROOT", default=str(BASE_DIR / "staticfiles"))

# --- Cache (shared by all gunicorn workers for throttling; ADR-0009) -----------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}

# --- DRF --------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.users.authentication.PosJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["common.responses.EnvelopeJSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "common.exception_handler.envelope_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("RATELIMIT_ANON", default="60/minute"),
        "user": env("RATELIMIT_USER", default="300/minute"),
        "auth": env("RATELIMIT_AUTH", default="30/minute"),
        "health": env("RATELIMIT_HEALTH", default="120/minute"),
    },
    "NUM_PROXIES": env.int("NUM_PROXIES", default=1),  # nginx only (ADR-0002, ADR-0009)
    "UNAUTHENTICATED_USER": "django.contrib.auth.models.AnonymousUser",
}

# --- JWT (ADR-0011) -----------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": env("JWT_SIGNING_KEY", default=SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": False,
}
REFRESH_COOKIE = {
    "NAME": "pos_refresh",
    "PATH": "/api/auth/",
    "SECURE": True,
    "HTTPONLY": True,
    "SAMESITE": "Strict",
    "DOMAIN": None,  # host-only on BACKEND_DOMAIN (ADR-0003)
    "REMEMBER_MAX_AGE": 7 * 24 * 3600,  # OQ-6
}
CSRF_HEADER_VALUE = "simple-pos"  # X-Requested-With value required on refresh/logout (ADR-0003)

# --- CORS (ADR-0003) ------------------------------------------------------------
CORS_ALLOWED_ORIGINS: list[str] = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True
CORS_URLS_REGEX = r"^/api/.*$"
CORS_ALLOW_HEADERS = (
    "accept",
    "authorization",
    "content-type",
    "idempotency-key",
    "x-requested-with",
)
CORS_EXPOSE_HEADERS = ["Retry-After", "Idempotent-Replayed"]
CORS_PREFLIGHT_MAX_AGE = 86400
CSRF_TRUSTED_ORIGINS: list[str] = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# --- Health (DRF_SKILL §23–24) ---------------------------------------------------
HEALTH_CHECK_PASSWORD = env("HEALTH_CHECK_PASSWORD")

# --- OpenAPI (ADR-0008) -----------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "Simple POS API",
    "VERSION": "1.0.0",
    "OAS_VERSION": "3.0.3",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api",
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
        "common.schema.wrap_success_envelope",
    ],
}

# --- Admin (DRF_SKILL §22) ------------------------------------------------------------
JAZZMIN_SETTINGS = {
    "site_title": "Simple POS Admin",
    "site_header": "Simple POS",
    "site_brand": "Simple POS",
    "welcome_sign": "Simple POS administration",
    "copyright": "Simple POS",
    "show_sidebar": True,
    "navigation_expanded": True,
}

# --- Logging (structured JSON to stdout) -------------------------------------------
LOG_LEVEL = env("LOG_LEVEL", default="INFO")
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": "common.logformat.JsonFormatter"}},
    "handlers": {"stdout": {"class": "logging.StreamHandler", "formatter": "json"}},
    "root": {"handlers": ["stdout"], "level": LOG_LEVEL},
    "loggers": {
        "django.db.backends": {"level": "WARNING"},
    },
}

# --- Security headers shared by all envs ---------------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
