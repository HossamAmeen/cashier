"""seed_dev management command: populates sample data for local development (admin + cashiers)."""

from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import Role, User, UserStatus


class Command(BaseCommand):
    help = "Seeds local development database with sample users and tables"

    def handle(self, *args: Any, **options: Any) -> None:
        self.stdout.write("Seeding development data...")
        with transaction.atomic():
            # 1. Users
            admin, created = User.objects.get_or_create(
                username="admin",
                defaults={
                    "name": "مدير النظام",
                    "role": Role.ADMIN,
                    "status": UserStatus.ACTIVE,
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            if created:
                admin.set_password("admin1234")
                admin.save()
                self.stdout.write("Created admin user: admin / admin1234")

            c1, created1 = User.objects.get_or_create(
                username="cashier1",
                defaults={
                    "name": "أحمد محمود",
                    "role": Role.CASHIER,
                    "status": UserStatus.ACTIVE,
                },
            )
            if created1:
                c1.set_password("cashier1234")
                c1.save()
                self.stdout.write("Created cashier user: cashier1 / cashier1234")

            c2, created2 = User.objects.get_or_create(
                username="cashier2",
                defaults={
                    "name": "سارة علي",
                    "role": Role.CASHIER,
                    "status": UserStatus.ACTIVE,
                },
            )
            if created2:
                c2.set_password("cashier1234")
                c2.save()
                self.stdout.write("Created cashier user: cashier2 / cashier1234")

        self.stdout.write(self.style.SUCCESS("seed_dev complete!"))
