#!/usr/bin/env sh
# Container entrypoint (ADR-0002). Migrations are run explicitly by the deploy script
# (`docker compose run --rm api migrate`) after a backup, never implicitly here (CLAUDE.md §7).
set -eu

case "${1:-serve}" in
  serve)
    python manage.py createcachetable
    python manage.py collectstatic --noinput >/dev/null
    exec gunicorn config.wsgi:application \
      --bind 0.0.0.0:8000 \
      --workers "${GUNICORN_WORKERS:-2}" \
      --access-logfile - \
      --forwarded-allow-ips "*"
    ;;
  migrate)
    exec python manage.py migrate --noinput
    ;;
  *)
    exec "$@"
    ;;
esac
