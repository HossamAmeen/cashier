import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.tables.models import Table
from apps.users.models import Role, User


@pytest.fixture
def admin_user(db: None) -> User:
    return User.objects.create_user(
        name="Admin Test",
        username="admin_tables",
        password="Password123!",
        role=Role.ADMIN,
    )


@pytest.fixture
def cashier_user(db: None) -> User:
    return User.objects.create_user(
        name="Cashier Test",
        username="cashier_tables",
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
def test_create_table_positive_unique(admin_client: APIClient, cashier_client: APIClient) -> None:
    """BR-TBL-06: Positive unique table number, Admin only."""
    resp = cashier_client.post("/api/tables", {"number": 1}, format="json")
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    resp = admin_client.post("/api/tables", {"number": 1}, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["data"]["number"] == 1

    # Duplicate
    resp = admin_client.post("/api/tables", {"number": 1}, format="json")
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert resp.json()["code"] == "DUPLICATE_VALUE"

    # Non-positive number
    resp = admin_client.post("/api/tables", {"number": 0}, format="json")
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.django_db
def test_cashier_sees_active_tables_only(admin_client: APIClient, cashier_client: APIClient) -> None:
    """BR-TBL-06: Cashier sees active tables only, inactive is 404 for cashier."""
    Table.objects.create(number=10, is_active=True)
    t_inactive = Table.objects.create(number=11, is_active=False)

    resp = cashier_client.get("/api/tables")
    assert resp.status_code == status.HTTP_200_OK
    items = resp.json()["data"]["items"]
    numbers = [t["number"] for t in items]
    assert 10 in numbers
    assert 11 not in numbers

    # Inactive is NOT_FOUND for cashier
    resp = cashier_client.get(f"/api/tables/{t_inactive.id}")
    assert resp.status_code == status.HTTP_404_NOT_FOUND

    # Admin sees all tables
    resp = admin_client.get("/api/tables")
    assert resp.status_code == status.HTTP_200_OK
    assert len(resp.json()["data"]["items"]) == 2
