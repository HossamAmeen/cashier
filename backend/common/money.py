"""Integer money helpers (BR-GEN-01, ADR-0005). Money is always ``int`` minor units (piastres)."""

import re
from decimal import Decimal

MINOR_PER_MAJOR = 100
_AMOUNT_RE = re.compile(r"^\d+(\.\d{1,2})?$")


class MoneyFormatError(ValueError):
    pass


def to_minor(amount: str) -> int:
    """Parse a non-negative decimal string with at most 2 decimals ("45.5" → 4550). BR-ITEM-02, OQ-27."""
    text = amount.strip()
    if not _AMOUNT_RE.match(text):
        raise MoneyFormatError(f"invalid amount: {amount!r}")
    return int(Decimal(text) * MINOR_PER_MAJOR)


def format_minor(value: int) -> str:
    """Format minor units for logs/admin: 485000 → "4,850.00". The PWA has its own formatter."""
    if not isinstance(value, int) or isinstance(value, bool):
        raise TypeError("money must be int minor units")
    sign = "-" if value < 0 else ""
    major, minor = divmod(abs(value), MINOR_PER_MAJOR)
    return f"{sign}{major:,}.{minor:02d}"


def percent_of(subtotal_minor: int, percent: int) -> int:
    """Whole-number percentage of an amount, rounded half-up to a whole minor unit (BR-ORD-07)."""
    if subtotal_minor < 0 or not 0 <= percent <= 100:
        raise ValueError("subtotal must be >= 0 and percent in 0..100")
    return (subtotal_minor * percent + 50) // 100
