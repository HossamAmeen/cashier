"""User manager: lower-cased usernames (BR §2 User), argon2 hashes via set_password (BR-USR-01)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from django.contrib.auth.base_user import BaseUserManager

if TYPE_CHECKING:
    from .models import User


class UserManager(BaseUserManager["User"]):
    use_in_migrations = True

    def get_by_natural_key(self, username: str | None) -> User:
        """Case-insensitive lookup (BR §2 User); also used by Django admin's ModelBackend login."""
        return self.get(username=str(username or "").strip().lower())

    def create_user(self, username: str, password: str | None, *, name: str, **extra: Any) -> User:
        user = self.model(username=self.model.normalize_username(username), name=name, **extra)
        user.set_password(password)
        user.full_clean(exclude=["password"])
        user.save(using=self._db)
        return user

    def create_superuser(self, username: str, password: str | None, *, name: str, **extra: Any) -> User:
        """`createsuperuser`: a POS ADMIN who may also use the Django admin."""
        extra.setdefault("role", "ADMIN")
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(username, password, name=name, **extra)
