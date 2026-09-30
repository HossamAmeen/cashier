import pytest
from rest_framework.test import APIClient

from apps.users.models import Role, User


@pytest.mark.django_db
class TestDashboardAPI:
    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.cashier = User.objects.create_user(
            username="cashier_dash",
            name="Cashier Dash",
            role=Role.CASHIER,
            password="Password123!",
        )
        self.admin = User.objects.create_user(
            username="admin_dash",
            name="Admin Dash",
            role=Role.ADMIN,
            password="Password123!",
        )
        self.client = APIClient()

    def test_cashier_dashboard_success(self):
        self.client.force_authenticate(user=self.cashier)
        res = self.client.get("/api/dashboard/cashier")
        assert res.status_code == 200
        data = res.json()["data"]
        assert "shift" in data
        assert "tables" in data
        assert "running_orders" in data

    def test_cashier_dashboard_forbidden_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/dashboard/cashier")
        assert res.status_code == 403
        assert res.json()["code"] == "FORBIDDEN_ROLE"

    def test_admin_dashboard_success(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/dashboard/admin")
        assert res.status_code == 200
        data = res.json()["data"]
        assert "business_date" in data
        assert "sales_today_minor" in data
        assert "open_shifts" in data
        assert "cashiers" in data

    def test_admin_dashboard_forbidden_for_cashier(self):
        self.client.force_authenticate(user=self.cashier)
        res = self.client.get("/api/dashboard/admin")
        assert res.status_code == 403
        assert res.json()["code"] == "FORBIDDEN_ROLE"
