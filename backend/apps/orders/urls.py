from django.urls import path

from .views import OrderCancelView, OrderDetailView, OrderListCreateView

urlpatterns = [
    path("orders", OrderListCreateView.as_view(), name="order-list-create"),
    path("orders/<int:id>", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<int:id>/cancel", OrderCancelView.as_view(), name="order-cancel"),
]
