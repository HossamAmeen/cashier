# ADR-0013 — UTC storage, Africa/Cairo business day

- Status: Accepted (team-lead, 2026-09-29)
- Refs: BR-GEN-02, BR-GEN-05, OQ-15, OQ-16, OQ-34, OQ-35, OQ-39; US-26.3–4

## Decision
1. Django `USE_TZ=True`, `TIME_ZONE="UTC"`; all timestamps are stored as `timestamptz` and serialised as RFC 3339 with
   `Z`. Server time is the only source of `opened_at`, `closed_at`, `created_at`, `paid_at`, `cancelled_at`.
2. `BUSINESS_TIMEZONE = "Africa/Cairo"` (setting, not env-dependent). `common/timeutils.py` provides
   `cairo_day_bounds(date) -> (start_utc, end_utc)`, `today_cairo()`, `week_bounds_cairo(date)` (week starts Saturday
   00:00 Cairo, OQ-16). Cairo DST is handled by `zoneinfo`.
3. API date filters take Cairo **calendar dates** (`date_from`, `date_to`, format `YYYY-MM-DD`, inclusive) and the
   server converts them to UTC ranges. Order history filters on `created_at`; sales KPIs on `paid_at` (OQ-16).
4. The PWA formats times in `Africa/Cairo` with 12-hour `ص/م`, dates `DD/MM/YYYY`, Western digits (OQ-34).
5. A shift may span midnight (OQ-39); shift totals are by shift, not by day.

## Consequences
- AC/US tests include a 23:30-Cairo case that lands on a different UTC date (US-26.4), using `freezegun`.
