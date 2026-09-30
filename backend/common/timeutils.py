"""Business-day helpers: UTC storage, Africa/Cairo calendar days (BR-GEN-02, OQ-16, ADR-0013)."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone

UTC = ZoneInfo("UTC")


def business_tz() -> ZoneInfo:
    return ZoneInfo(settings.BUSINESS_TIMEZONE)


def today_cairo(now: datetime | None = None) -> date:
    return (now or timezone.now()).astimezone(business_tz()).date()


def cairo_day_bounds(day: date) -> tuple[datetime, datetime]:
    """[start, end) of a Cairo calendar day, in UTC."""
    tz = business_tz()
    start = datetime.combine(day, time.min, tzinfo=tz)
    end = datetime.combine(day + timedelta(days=1), time.min, tzinfo=tz)
    return start.astimezone(UTC), end.astimezone(UTC)


def cairo_range_bounds(date_from: date, date_to: date) -> tuple[datetime, datetime]:
    """[start of date_from, end of date_to) in UTC; both dates inclusive, Cairo calendar."""
    return cairo_day_bounds(date_from)[0], cairo_day_bounds(date_to)[1]


def week_start_cairo(day: date) -> date:
    """The Saturday on or before `day` (week runs Saturday..Friday, OQ-16)."""
    # Python: Monday=0 .. Saturday=5, Sunday=6
    return day - timedelta(days=(day.weekday() - 5) % 7)
