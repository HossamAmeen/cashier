from django.urls import path

from .views import TableDetailView, TableListCreateView

urlpatterns = [
    path("tables", TableListCreateView.as_view(), name="table-list-create"),
    path("tables/<int:id>", TableDetailView.as_view(), name="table-detail"),
]
