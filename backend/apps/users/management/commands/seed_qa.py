"""seed_qa management command: resets database for remote QA runs. Refuses unless PRELAUNCH=True."""

from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.users.models import Role, User, UserStatus


class Command(BaseCommand):
    help = "Resets and seeds QA test database. Refuses to run if PRELAUNCH is False."

    def handle(self, *args: Any, **options: Any) -> None:
        if not getattr(settings, "PRELAUNCH", False):
            raise CommandError("seed_qa is only allowed when PRELAUNCH=true (ADR-0004)")

        self.stdout.write("Seeding QA test data...")
        with transaction.atomic():
            admin, _created = User.objects.get_or_create(
                username="qa_admin",
                defaults={
                    "name": "QA Admin",
                    "role": Role.ADMIN,
                    "status": UserStatus.ACTIVE,
                    "is_staff": True,
                },
            )
            admin.set_password("qa_admin1234")
            admin.save()

            cashier, _created = User.objects.get_or_create(
                username="qa_cashier",
                defaults={
                    "name": "QA Cashier",
                    "role": Role.CASHIER,
                    "status": UserStatus.ACTIVE,
                },
            )
            cashier.set_password("qa_cashier1234")
            cashier.save()

        self.stdout.write(self.style.SUCCESS("seed_qa complete!"))
