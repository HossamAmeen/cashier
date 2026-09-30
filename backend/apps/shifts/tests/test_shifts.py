import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.shifts.models import Shift, ShiftStatus
from apps.users.models import Role, User


@pytest.fixture
def admin_user(db: None) -> User:
    return User.objects.create_user(
        name="Admin Test",
        username="admin_shifts",
        password="Password123!",
        role=Role.ADMIN,
    )


@pytest.fixture
def cashier_user(db: None) -> User:
    return User.objects.create_user(
        name="Cashier Test",
        username="cashier_shifts",
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
def test_open_shift_cashier_and_already_open(cashier_client: APIClient, admin_client: APIClient) -> None:
    """BR-SHIFT-01, BR-ROLE-02: Cashier can open shift; second open fails with SHIFT_ALREADY_OPEN; Admin gets FORBIDDEN_ROLE."""
    # Admin gets FORBIDDEN_ROLE
    resp = admin_client.post("/api/shifts", {"opening_balance_minor": 20000}, format="json")
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # Cashier opens shift
    resp = cashier_client.post("/api/shifts", {"opening_balance_minor": 20000}, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["data"]["opening_balance_minor"] == 20000
    assert resp.json()["data"]["status"] == "OPEN"

    # Second open attempt -> SHIFT_ALREADY_OPEN (409)
    resp = cashier_client.post("/api/shifts", {"opening_balance_minor": 10000}, format="json")
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert resp.json()["code"] == "SHIFT_ALREADY_OPEN"


@pytest.mark.django_db
def test_get_current_shift(cashier_client: APIClient, cashier_user: User) -> None:
    """BR-SHIFT-03: getCurrentShift returns current open shift or null."""
    # No shift -> returns null
    resp = cashier_client.get("/api/shifts/current")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["data"] is None

    # Open shift
    Shift.objects.create(cashier=cashier_user, opening_balance_minor=5000, status=ShiftStatus.OPEN)
    resp = cashier_client.get("/api/shifts/current")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["data"]["opening_balance_minor"] == 5000
    assert resp.json()["data"]["status"] == "OPEN"


@pytest.mark.django_db
def test_shift_detail_forbidden_another_cashier(cashier_user: User, cashier_client: APIClient) -> None:
    """BR-ROLE-04: Cashier cannot view another cashier's shift."""
    other_cashier = User.objects.create_user(
        name="Other Cashier",
        username="other_cashier",
        password="Password123!",
        role=Role.CASHIER,
    )
    shift = Shift.objects.create(cashier=other_cashier, opening_balance_minor=1000)

    resp = cashier_client.get(f"/api/shifts/{shift.id}")
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_close_shift_with_open_orders_fails(cashier_user: User, cashier_client: APIClient) -> None:
    from apps.orders.models import Order, OrderStatus, OrderType

    shift = Shift.objects.create(cashier=cashier_user, opening_balance_minor=10000, status=ShiftStatus.OPEN)
    Order.objects.create(
        number=1001,
        type=OrderType.TAKEAWAY,
        status=OrderStatus.OPEN,
        cashier=cashier_user,
        shift=shift,
        subtotal_minor=5000,
        total_minor=5000,
    )

    resp = cashier_client.post(f"/api/shifts/{shift.id}/close", {"counted_cash_minor": 10000}, format="json")
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert resp.json()["code"] == "SHIFT_HAS_OPEN_ORDERS"
    assert resp.json()["details"]["open_order_numbers"] == [1001]


@pytest.mark.django_db
def test_close_shift_success_math_and_snapshot(cashier_user: User, cashier_client: APIClient) -> None:
    from apps.orders.models import Order, OrderStatus, OrderType
    from apps.payments.models import Payment, PaymentMethod

    # Opening cash: 200.00 (20000 minor)
    shift = Shift.objects.create(cashier=cashier_user, opening_balance_minor=20000, status=ShiftStatus.OPEN)

    # Cash Order: 300.00 (30000 minor)
    order_cash = Order.objects.create(
        number=1001,
        type=OrderType.TAKEAWAY,
        status=OrderStatus.PAID,
        cashier=cashier_user,
        shift=shift,
        subtotal_minor=30000,
        total_minor=30000,
    )
    Payment.objects.create(
        order=order_cash,
        method=PaymentMethod.CASH,
        amount_due_minor=30000,
        amount_received_minor=30000,
        change_minor=0,
    )

    # Card Order: 100.00 (10000 minor)
    order_card = Order.objects.create(
        number=1002,
        type=OrderType.TAKEAWAY,
        status=OrderStatus.PAID,
        cashier=cashier_user,
        shift=shift,
        subtotal_minor=10000,
        total_minor=10000,
    )
    Payment.objects.create(
        order=order_card,
        method=PaymentMethod.CARD,
        amount_due_minor=10000,
        amount_received_minor=10000,
        change_minor=0,
    )

    # Counted cash: 480.00 (48000 minor). Expected = 20000 + 30000 = 50000. Diff = 48000 - 50000 = -2000 (-20.00 deficit)
    resp = cashier_client.post(f"/api/shifts/{shift.id}/close", {"counted_cash_minor": 48000}, format="json")
    assert resp.status_code == status.HTTP_200_OK

    data = resp.json()["data"]
    assert data["status"] == "CLOSED"
    assert data["sales_total_minor"] == 40000
    assert data["cash_total_minor"] == 30000
    assert data["card_total_minor"] == 10000
    assert data["expected_cash_minor"] == 50000
    assert data["counted_cash_minor"] == 48000
    assert data["difference_minor"] == -2000

    shift.refresh_from_db()
    assert shift.status == ShiftStatus.CLOSED
    assert shift.difference_minor == -2000


@pytest.mark.django_db
def test_close_already_closed_shift_fails(cashier_user: User, cashier_client: APIClient) -> None:
    shift = Shift.objects.create(cashier=cashier_user, opening_balance_minor=10000, status=ShiftStatus.CLOSED)

    resp = cashier_client.post(f"/api/shifts/{shift.id}/close", {"counted_cash_minor": 10000}, format="json")
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert resp.json()["code"] == "NO_OPEN_SHIFT"

