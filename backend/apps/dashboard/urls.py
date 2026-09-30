from django.urls import path

from .views import AdminDashboardView, CashierDashboardView

urlpatterns = [
    path("dashboard/cashier", CashierDashboardView.as_view(), name="cashier-dashboard"),
    path("dashboard/admin", AdminDashboardView.as_view(), name="admin-dashboard"),
]
