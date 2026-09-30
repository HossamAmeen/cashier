"""BR-GEN-02 / OQ-16 business-day helpers (ADR-0013)."""

from datetime import UTC, date, datetime

from common.timeutils import cairo_day_bounds, today_cairo, week_start_cairo


def test_br_gen_02_cairo_day_bounds_are_utc() -> None:
    start, end = cairo_day_bounds(date(2026, 1, 15))  # Cairo is UTC+2 in January
    assert start == datetime(2026, 1, 14, 22, 0, tzinfo=UTC)
    assert end == datetime(2026, 1, 15, 22, 0, tzinfo=UTC)


def test_br_gen_02_late_evening_counts_on_the_cairo_day() -> None:
    # 23:30 Cairo on 15 Jan = 21:30 UTC on 15 Jan; 00:30 Cairo on 16 Jan = 22:30 UTC on 15 Jan (US-26.4)
    assert today_cairo(datetime(2026, 1, 15, 22, 30, tzinfo=UTC)) == date(2026, 1, 16)


def test_oq_16_week_starts_on_saturday() -> None:
    assert week_start_cairo(date(2026, 9, 26)) == date(2026, 9, 26)  # Saturday
    assert week_start_cairo(date(2026, 10, 2)) == date(2026, 9, 26)  # Friday
    assert week_start_cairo(date(2026, 9, 27)) == date(2026, 9, 26)  # Sunday
