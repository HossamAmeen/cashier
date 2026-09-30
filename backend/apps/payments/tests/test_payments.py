import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Category, Item
from apps.orders.models import Order, OrderStatus, OrderType
from apps.shifts.models import Shift, ShiftStatus
from apps.tables.models import Table
from apps.users.models import User


@pytest.mark.django_db
class TestPaymentsAPI:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.cashier = User.objects.create_user(
            username="cashier1",
            name="Cashier 1",
            role="CASHIER",
            status="ACTIVE",
            password="Password123!",
        )
        self.category = Category.objects.create(name="Hot Drinks", icon="coffee", sort_order=1)
        self.item = Item.objects.create(
            category=self.category,
            name="Espresso",
            price_minor=3000,
            status="ACTIVE",
        )
        self.table = Table.objects.create(number=1, is_active=True)
        self.shift = Shift.objects.create(
            cashier=self.cashier,
            opening_balance_minor=10000,
            status=ShiftStatus.OPEN,
        )

        self.order = Order.objects.create(
            number=1001,
            type=OrderType.DINE_IN,
            status=OrderStatus.OPEN,
            table=self.table,
            cashier=self.cashier,
            shift=self.shift,
            subtotal_minor=3000,
            discount_minor=0,
            total_minor=3000,
        )

        self.client = APIClient()

    def test_pay_order_cash_success(self):
        self.client.force_authenticate(user=self.cashier)
        payload = {
            "method": "CASH",
            "amount_received_minor": 5000,
        }
        res = self.client.post(f"/api/orders/{self.order.id}/payment", payload, format="json")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["order"]["status"] == "PAID"
        assert data["payment"]["amount_due_minor"] == 3000
        assert data["payment"]["amount_received_minor"] == 5000
        assert data["payment"]["change_minor"] == 2000

    def test_pay_order_insufficient_cash(self):
        self.client.force_authenticate(user=self.cashier)
        payload = {
            "method": "CASH",
            "amount_received_minor": 2000,
        }
        res = self.client.post(f"/api/orders/{self.order.id}/payment", payload, format="json")
        assert res.status_code == 422
        assert res.json()["code"] == "INSUFFICIENT_CASH"

    def test_pay_order_card_success(self):
        self.client.force_authenticate(user=self.cashier)
        payload = {
            "method": "CARD",
        }
        res = self.client.post(f"/api/orders/{self.order.id}/payment", payload, format="json")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["order"]["status"] == "PAID"
        assert data["payment"]["method"] == "CARD"
        assert data["payment"]["change_minor"] == 0

    def test_get_receipt_success(self):
        self.client.force_authenticate(user=self.cashier)
        # First pay order
        self.client.post(
            f"/api/orders/{self.order.id}/payment",
            {"method": "CASH", "amount_received_minor": 3000},
            format="json",
        )

        res = self.client.get(f"/api/orders/{self.order.id}/receipt")
        assert res.status_code == 200
        receipt = res.json()["data"]
        assert receipt["order_number"] == 1001
        assert receipt["payment_method"] == "CASH"
