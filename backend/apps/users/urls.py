"""Users and Cashiers domain URLs matching docs/api/openapi.yaml."""

from django.urls import path

from .views_users import CashierDetailView, CashierListView, UserDetailView, UserListCreateView

urlpatterns = [
    path("users", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<int:id>", UserDetailView.as_view(), name="user-detail"),
    path("cashiers", CashierListView.as_view(), name="cashier-list"),
    path("cashiers/<int:id>", CashierDetailView.as_view(), name="cashier-detail"),
]
