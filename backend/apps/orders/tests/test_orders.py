import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Category, Item
from apps.orders.models import Order, OrderStatus, OrderType
from apps.shifts.models import Shift, ShiftStatus
from apps.tables.models import Table
from apps.users.models import User


@pytest.mark.django_db
class TestOrdersAPI:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.cashier = User.objects.create_user(
            username="cashier1",
            name="Cashier 1",
            role="CASHIER",
            status="ACTIVE",
            password="Password123!",
        )
        self.other_cashier = User.objects.create_user(
            username="cashier2",
            name="Cashier 2",
            role="CASHIER",
            status="ACTIVE",
            password="Password123!",
        )
        self.admin = User.objects.create_user(
            username="admin1",
            name="Admin 1",
            role="ADMIN",
            status="ACTIVE",
            password="Password123!",
        )

        self.category = Category.objects.create(name="Hot Drinks", icon="coffee", sort_order=1)
        self.item1 = Item.objects.create(
            category=self.category,
            name="Espresso",
            price_minor=3000,
            status="ACTIVE",
        )
        self.item2 = Item.objects.create(
            category=self.category,
            name="Latte",
            price_minor=4500,
            status="ACTIVE",
        )

        self.table1 = Table.objects.create(number=1, is_active=True)

        self.shift = Shift.objects.create(
            cashier=self.cashier,
            opening_balance_minor=10000,
            status=ShiftStatus.OPEN,
        )

        self.client = APIClient()

    def test_create_order_dine_in_success(self):
        self.client.force_authenticate(user=self.cashier)
        payload = {
            "type": "DINE_IN",
            "table_id": self.table1.id,
            "lines": [
                {"item_id": self.item1.id, "qty": 2, "note": "Extra hot"},
                {"item_id": self.item2.id, "qty": 1},
            ],
            "discount_minor": 500,
        }
        res = self.client.post("/api/orders", payload, format="json")
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["number"] == 1001
        assert data["type"] == "DINE_IN"
        assert data["table_id"] == self.table1.id
        assert data["subtotal_minor"] == (3000 * 2) + 4500  # 10500
        assert data["discount_minor"] == 500
        assert data["total_minor"] == 10000

    def test_create_order_no_open_shift(self):
        self.client.force_authenticate(user=self.other_cashier)
        payload = {
            "type": "TAKEAWAY",
            "lines": [{"item_id": self.item1.id, "qty": 1}],
        }
        res = self.client.post("/api/orders", payload, format="json")
        assert res.status_code == 409
        assert res.json()["code"] == "NO_OPEN_SHIFT"

    def test_create_order_empty_lines(self):
        self.client.force_authenticate(user=self.cashier)
        payload = {"type": "TAKEAWAY", "lines": []}
        res = self.client.post("/api/orders", payload, format="json")
        assert res.status_code == 422
        assert res.json()["code"] == "ORDER_EMPTY"

    def test_create_order_table_occupied(self):
        self.client.force_authenticate(user=self.cashier)
        Order.objects.create(
            number=1001,
            type=OrderType.DINE_IN,
            status=OrderStatus.OPEN,
            table=self.table1,
            cashier=self.cashier,
            shift=self.shift,
            subtotal_minor=3000,
            total_minor=3000,
        )

        payload = {
            "type": "DINE_IN",
            "table_id": self.table1.id,
            "lines": [{"item_id": self.item1.id, "qty": 1}],
        }
        res = self.client.post("/api/orders", payload, format="json")
        assert res.status_code == 409
        assert res.json()["code"] == "TABLE_OCCUPIED"

    def test_cancel_order_success(self):
        self.client.force_authenticate(user=self.cashier)
        order = Order.objects.create(
            number=1001,
            type=OrderType.TAKEAWAY,
            status=OrderStatus.OPEN,
            cashier=self.cashier,
            shift=self.shift,
            subtotal_minor=3000,
            total_minor=3000,
        )

        res = self.client.post(f"/api/orders/{order.id}/cancel", {"reason": "Customer changed mind"}, format="json")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "CANCELLED"
        assert data["cancel_reason"] == "Customer changed mind"

    def test_list_orders_scoping_and_today_counts(self):
        self.client.force_authenticate(user=self.cashier)
        Order.objects.create(
            number=1001,
            type=OrderType.TAKEAWAY,
            status=OrderStatus.OPEN,
            cashier=self.cashier,
            shift=self.shift,
            subtotal_minor=3000,
            total_minor=3000,
        )

        res = self.client.get("/api/orders")
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data["items"]) == 1
        assert "today_counts" in data
        assert data["today_counts"]["total"] == 1
        assert data["today_counts"]["open"] == 1

        # Cashier cannot pass another cashier's id
        res_forbidden = self.client.get(f"/api/orders?cashier_id={self.other_cashier.id}")
        assert res_forbidden.status_code == 403
        assert res_forbidden.json()["code"] == "FORBIDDEN_ROLE"

