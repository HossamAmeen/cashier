"""seed_initial management command: creates initial admin user for production go-live."""

import os
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import Role, User, UserStatus


class Command(BaseCommand):
    help = "Seeds initial production data (first admin user)"

    def handle(self, *args: Any, **options: Any) -> None:
        admin_user = os.environ.get("SEED_ADMIN_USERNAME", "admin")
        admin_pass = os.environ.get("SEED_ADMIN_PASSWORD", "admin1234")

        self.stdout.write("Seeding initial data...")
        with transaction.atomic():
            admin, created = User.objects.get_or_create(
                username=admin_user,
                defaults={
                    "name": "مدير النظام",
                    "role": Role.ADMIN,
                    "status": UserStatus.ACTIVE,
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            if created:
                admin.set_password(admin_pass)
                admin.save()
                self.stdout.write(f"Created initial admin user: {admin_user}")

        self.stdout.write(self.style.SUCCESS("seed_initial complete!"))
