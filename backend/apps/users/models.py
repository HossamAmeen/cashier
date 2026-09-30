"""Users (BR §2 User, BR §3) and the BR-AUTH-03 login-failure log (ADR-0009).

A Cashier is a User with role CASHIER; there is no separate cashier table (BR §2).
Users are never deleted, only disabled (BR-USR-02, BR-GEN-04).
"""

from typing import ClassVar

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from common.models import BaseModel

from .managers import UserManager

# BR §2 User: username `[a-z0-9._]{3,32}`, stored lower-case, unique case-insensitively.
USERNAME_PATTERN = r"^[a-z0-9._]{3,32}$"
USERNAME_MAX_LENGTH = 32
NAME_MAX_LENGTH = 100  # BR §2 User: name 1–100 chars (OQ-41)

# DB constraint names (ADR-0006). IntegrityError → §9 code mapping is done by name (common/db.py).
UNIQ_USERNAME_CI = "uniq_user_username_ci"
CHECK_USERNAME_FORMAT = "user_username_format"
CHECK_ROLE = "user_role_valid"
CHECK_STATUS = "user_status_valid"
CHECK_NAME_NOT_BLANK = "user_name_not_blank"
CHECK_TOKEN_VERSION = "user_token_version_gte_0"  # noqa: S105
# Django also creates `users_user_username_key` for `unique=True` (required by ModelBackend, auth.E003);
# both names mean DUPLICATE_VALUE for the username.
USERNAME_UNIQUE_CONSTRAINTS = frozenset({UNIQ_USERNAME_CI, "users_user_username_key"})


class Role(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    CASHIER = "CASHIER", "Cashier"


class UserStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    DISABLED = "DISABLED", "Disabled"


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """BR §2 User. `token_version` gives immediate session revocation (BR-AUTH-02, ADR-0011)."""

    name = models.CharField(max_length=NAME_MAX_LENGTH)
    username = models.CharField(max_length=USERNAME_MAX_LENGTH, unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CASHIER)
    status = models.CharField(max_length=10, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    token_version = models.PositiveIntegerField(default=0)
    last_login_at = models.DateTimeField(null=True, blank=True)  # set on successful login only (ADR-0011 §8)
    # Django admin access only; unrelated to the POS role (DRF_SKILL §22).
    is_staff = models.BooleanField(default=False)

    # One timestamp for logins: `last_login_at` (BR §2). Removing the inherited field also disconnects
    # django.contrib.auth's update_last_login signal.
    last_login = None

    objects: ClassVar[UserManager] = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS: ClassVar[list[str]] = ["name"]

    class Meta:
        ordering = ("-created_at", "-id")
        constraints: ClassVar[list[models.BaseConstraint]] = [
            models.UniqueConstraint(Lower("username"), name=UNIQ_USERNAME_CI),
            models.CheckConstraint(condition=models.Q(username__regex=USERNAME_PATTERN), name=CHECK_USERNAME_FORMAT),
            models.CheckConstraint(condition=models.Q(role__in=Role.values), name=CHECK_ROLE),
            models.CheckConstraint(condition=models.Q(status__in=UserStatus.values), name=CHECK_STATUS),
            models.CheckConstraint(condition=~models.Q(name=""), name=CHECK_NAME_NOT_BLANK),
            models.CheckConstraint(condition=models.Q(token_version__gte=0), name=CHECK_TOKEN_VERSION),
        ]

    def __str__(self) -> str:
        return self.username

    @property
    def is_active(self) -> bool:  # type: ignore[override]
        """Used by Django admin, ModelBackend and simplejwt: only ACTIVE users may authenticate (BR-AUTH-02)."""
        return self.status == UserStatus.ACTIVE

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN

    @property
    def is_cashier(self) -> bool:
        return self.role == Role.CASHIER

    @classmethod
    def normalize_username(cls, username: str) -> str:
        """Usernames are case-insensitive and stored lower-case (BR §2 User)."""
        return normalize_username(username)


def normalize_username(username: str) -> str:
    return str(username).strip().lower()


class LoginFailure(models.Model):
    """One failed login for (username, client IP) — BR-AUTH-03 counter (ADR-0009).

    `username_normalized` is whatever was typed (lower-cased), known user or not, so the counter cannot be used to
    discover valid usernames (BR-AUTH-01).
    """

    username_normalized = models.CharField(max_length=64)
    ip = models.CharField(max_length=64)
    created_at = models.DateTimeField(default=timezone.now)

    objects: ClassVar[models.Manager["LoginFailure"]] = models.Manager()

    class Meta:
        indexes: ClassVar[list[models.Index]] = [
            models.Index(fields=["username_normalized", "ip", "created_at"], name="loginfailure_user_ip_created"),
            models.Index(fields=["created_at"], name="loginfailure_created"),
        ]

    def __str__(self) -> str:
        return f"{self.username_normalized}@{self.ip} {self.created_at.isoformat()}"
