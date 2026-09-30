# Simple POS API (ADR-0001, ADR-0002). Python 3.13 is the reference interpreter.
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/ requirements/
RUN pip install -r requirements/production.txt

COPY . .

RUN useradd --system --uid 10001 --home /app pos \
    && mkdir -p /app/staticfiles \
    && chown -R pos /app/staticfiles
USER pos

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS -H "X-Health-Check-Token: ${HEALTH_CHECK_PASSWORD}" http://127.0.0.1:8000/api/health || exit 1

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
CMD ["serve"]
