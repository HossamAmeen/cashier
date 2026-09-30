from django.urls import path

from .views import (
    CatalogView,
    CategoryDetailView,
    CategoryListCreateView,
    ItemDetailView,
    ItemListCreateView,
)

urlpatterns = [
    path("categories", CategoryListCreateView.as_view(), name="category-list-create"),
    path("categories/<int:id>", CategoryDetailView.as_view(), name="category-detail"),
    path("items", ItemListCreateView.as_view(), name="item-list-create"),
    path("items/<int:id>", ItemDetailView.as_view(), name="item-detail"),
    path("catalog", CatalogView.as_view(), name="catalog"),
]
