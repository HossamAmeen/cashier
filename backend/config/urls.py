from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", include("apps.health.urls")),
    path("api/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Domain apps are mounted here slice by slice (docs/tasks.md), e.g.:
    path("api/auth/", include("apps.users.urls_auth")),
    path("api/", include("apps.users.urls")),
    path("api/", include("apps.store_settings.urls")),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.tables.urls")),
    path("api/", include("apps.shifts.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.payments.urls")),
    path("api/", include("apps.dashboard.urls")),
]

handler404 = "common.views.json_not_found"
handler500 = "common.views.json_server_error"
