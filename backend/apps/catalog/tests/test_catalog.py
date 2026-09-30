import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalog.models import Category, Item
from apps.users.models import Role, User


@pytest.fixture
def admin_user(db: None) -> User:
    return User.objects.create_user(
        name="Admin Test",
        username="admin_catalog",
        password="Password123!",
        role=Role.ADMIN,
    )


@pytest.fixture
def cashier_user(db: None) -> User:
    return User.objects.create_user(
        name="Cashier Test",
        username="cashier_catalog",
        password="Password123!",
        role=Role.CASHIER,
    )


@pytest.fixture
def admin_client(admin_user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def cashier_client(cashier_user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=cashier_user)
    return client


@pytest.mark.django_db
def test_create_category_admin_only(admin_client: APIClient, cashier_client: APIClient) -> None:
    """BR-ROLE-01: Admin can create category, Cashier forbidden."""
    resp = cashier_client.post("/api/categories", {"name": "Hot Drinks", "icon": "coffee"}, format="json")
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    resp = admin_client.post("/api/categories", {"name": "Hot Drinks", "icon": "coffee"}, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["data"]["name"] == "Hot Drinks"
    assert resp.json()["data"]["icon"] == "coffee"


@pytest.mark.django_db
def test_category_duplicate_name(admin_client: APIClient) -> None:
    """DUPLICATE_VALUE: Unique category name."""
    Category.objects.create(name="Drinks")
    resp = admin_client.post("/api/categories", {"name": "Drinks"}, format="json")
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert resp.json()["code"] == "DUPLICATE_VALUE"


@pytest.mark.django_db
def test_delete_category_not_empty(admin_client: APIClient) -> None:
    """CATEGORY_NOT_EMPTY: Cannot delete category containing items."""
    cat = Category.objects.create(name="Desserts")
    Item.objects.create(category=cat, name="Cake", price_minor=2000)

    resp = admin_client.delete(f"/api/categories/{cat.id}")
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert resp.json()["code"] == "CATEGORY_NOT_EMPTY"


@pytest.mark.django_db
def test_create_item_positive_price(admin_client: APIClient) -> None:
    """BR-ITEM-02: Item price must be > 0."""
    cat = Category.objects.create(name="Food")
    resp = admin_client.post("/api/items", {"category_id": cat.id, "name": "Pizza", "price_minor": 0}, format="json")
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.django_db
def test_catalog_active_only(cashier_client: APIClient) -> None:
    """BR-ITEM-01, BR-ITEM-05: /api/catalog returns only ACTIVE categories and ACTIVE items."""
    cat_active = Category.objects.create(name="Active Cat", sort_order=1)
    cat_disabled = Category.objects.create(name="Disabled Cat", status="DISABLED", sort_order=2)

    Item.objects.create(category=cat_active, name="Active Item", price_minor=1000)
    Item.objects.create(category=cat_active, name="Disabled Item", status="DISABLED", price_minor=1500)
    Item.objects.create(category=cat_disabled, name="Other Item", price_minor=2000)

    resp = cashier_client.get("/api/catalog")
    assert resp.status_code == status.HTTP_200_OK
    categories = resp.json()["data"]["categories"]
    assert len(categories) == 1
    assert categories[0]["name"] == "Active Cat"
    assert len(categories[0]["items"]) == 1
    assert categories[0]["items"][0]["name"] == "Active Item"
