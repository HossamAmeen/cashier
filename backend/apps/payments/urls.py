from django.urls import path

from .views import PaymentCreateView, ReceiptDetailView

urlpatterns = [
    path("orders/<int:id>/payment", PaymentCreateView.as_view(), name="payment-create"),
    path("orders/<int:id>/receipt", ReceiptDetailView.as_view(), name="receipt-detail"),
]
