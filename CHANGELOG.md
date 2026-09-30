# Changelog — Simple POS (نظام الكاشير المبسط)

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-10-01

### Added
- **Authentication & RBAC (`apps/users`)**: JWT authentication with refresh token cookies, custom user roles (`CASHIER`, `ADMIN`), user management, and password policy.
- **Store Settings (`apps/store_settings`)**: Business details, tax configuration, receipt header/footer settings.
- **Catalog Management (`apps/catalog`)**: Category and Item management with active/inactive states and snapshot preservation.
- **Table Operations (`apps/tables`)**: Interactive table grid, real-time table occupancy, and DINE_IN order linking.
- **Shifts & Cash Management (`apps/shifts`)**: Open shift initialization, expected cash tracking, row-locked shift close validation, surplus/deficit preview, and shift history reports.
- **Order Processing (`apps/orders`)**: Tap-optimized Order Editor (≤ 5 taps), DINE_IN/TAKEAWAY support, discount calculations, line note support, order cancellation reason tracking, and historical order filtering (Africa/Cairo timezone).
- **Payments & Thermal Receipts (`apps/payments`)**: CASH and CARD payments with change calculation, Idempotency-Key duplicate submission prevention, and 80mm printable receipts.
- **Dashboards (`apps/dashboard`)**: Dedicated Cashier Home (Screen 02) and Admin Dashboard (Screen 20) with live financial KPIs, table occupancy, and open shift monitoring.
- **PWA Capabilities**: ServiceWorker pre-caching, webmanifest, offline banner, and Arabic (RTL) responsive layout.
- **DevOps & Infrastructure**: Nginx reverse proxy configuration, Automated Database Backup script with 7-day daily / 4-week weekly rotation, and operational runbook.
