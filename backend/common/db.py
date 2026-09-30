"""DB helpers: map IntegrityError to a constraint name (ADR-0006)."""

from django.db import IntegrityError


def constraint_name(error: IntegrityError) -> str | None:
    """Return the violated constraint's name on PostgreSQL (psycopg 3), else None."""
    cause = error.__cause__
    diag = getattr(cause, "diag", None)
    name = getattr(diag, "constraint_name", None)
    return str(name) if name else None
