from django.urls import path

from .views import CurrentShiftView, ShiftCloseView, ShiftDetailView, ShiftListOpenView

urlpatterns = [
    path("shifts", ShiftListOpenView.as_view(), name="shift-list-open"),
    path("shifts/current", CurrentShiftView.as_view(), name="current-shift"),
    path("shifts/<int:id>", ShiftDetailView.as_view(), name="shift-detail"),
    path("shifts/<int:id>/close", ShiftCloseView.as_view(), name="shift-close"),
]
