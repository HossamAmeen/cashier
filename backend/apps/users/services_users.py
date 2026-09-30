"""User management workflows: create_user, update_user (T02-BE-01)."""

import re
from typing import Any

from django.db import IntegrityError, transaction

from common.error_codes import ErrorCode
from common.exceptions import AppError

from .models import USERNAME_PATTERN, Role, User, UserStatus, normalize_username
from .selectors import count_active_admins, has_open_shift
from .services import revoke_sessions, validate_new_password


def create_user(*, name: str, username: str, password: str, role: str, status: str = UserStatus.ACTIVE) -> User:
    """BR-USR-01, BR §2 User, BR-ROLE-01."""
    clean_name = str(name).strip()
    if not clean_name:
        raise AppError(
            ErrorCode.VALIDATION_ERROR,
            details={"fields": {"name": ["This field may not be blank."]}},
        )

    clean_username = normalize_username(username)
    if not re.match(USERNAME_PATTERN, clean_username):
        raise AppError(
            ErrorCode.VALIDATION_ERROR,
            details={
                "fields": {
                    "username": ["Username must be 3-32 chars of lower-case letters, numbers, dot or underscore."]
                }
            },
        )

    validate_new_password(password)

    if role not in Role.values:
        raise AppError(
            ErrorCode.VALIDATION_ERROR,
            details={"fields": {"role": [f"Invalid role: {role}"]}},
        )

    if status not in UserStatus.values:
        raise AppError(
            ErrorCode.VALIDATION_ERROR,
            details={"fields": {"status": [f"Invalid status: {status}"]}},
        )

    try:
        with transaction.atomic():
            user = User(
                name=clean_name,
                username=clean_username,
                role=role,
                status=status,
            )
            user.set_password(password)
            user.save()
            return user
    except IntegrityError as exc:
        raise AppError(
            ErrorCode.DUPLICATE_VALUE, details={"fields": {"username": ["Username already taken."]}}
        ) from exc


def update_user(user_id: int, **data: Any) -> User:
    """BR-USR-01..05, BR-AUTH-02, OQ-31, OQ-37, AC-11, AC-12."""
    with transaction.atomic():
        # Lock user row and count active admins with lock
        user = User.objects.select_for_update().filter(pk=user_id).first()
        if user is None:
            raise AppError(ErrorCode.NOT_FOUND)

        requires_revocation = False

        if "name" in data and data["name"] is not None:
            clean_name = str(data["name"]).strip()
            if not clean_name:
                raise AppError(
                    ErrorCode.VALIDATION_ERROR,
                    details={"fields": {"name": ["This field may not be blank."]}},
                )
            user.name = clean_name

        if "username" in data and data["username"] is not None:
            clean_username = normalize_username(data["username"])
            if not re.match(USERNAME_PATTERN, clean_username):
                raise AppError(
                    ErrorCode.VALIDATION_ERROR,
                    details={
                        "fields": {
                            "username": [
                                "Username must be 3-32 chars of lower-case letters, numbers, dot or underscore."
                            ]
                        }
                    },
                )
            user.username = clean_username

        new_status = data.get("status")
        if new_status is not None and new_status != user.status:
            if new_status not in UserStatus.values:
                raise AppError(
                    ErrorCode.VALIDATION_ERROR, details={"fields": {"status": [f"Invalid status: {new_status}"]}}
                )

            if new_status == UserStatus.DISABLED:
                # BR-USR-03: cannot disable user with open shift
                if has_open_shift(user):
                    raise AppError(ErrorCode.USER_HAS_OPEN_SHIFT)

                # BR-USR-04: cannot disable last active admin (OQ-37)
                if user.role == Role.ADMIN and user.status == UserStatus.ACTIVE:
                    if count_active_admins() <= 1:
                        raise AppError(ErrorCode.LAST_ADMIN)

                requires_revocation = True
            user.status = new_status

        new_role = data.get("role")
        if new_role is not None and new_role != user.role:
            if new_role not in Role.values:
                raise AppError(ErrorCode.VALIDATION_ERROR, details={"fields": {"role": [f"Invalid role: {new_role}"]}})

            # BR-USR-05: cannot change role with open shift
            if has_open_shift(user):
                raise AppError(ErrorCode.USER_HAS_OPEN_SHIFT)

            # BR-USR-04: cannot demote last active admin
            if user.role == Role.ADMIN and new_role == Role.CASHIER and user.status == UserStatus.ACTIVE:
                if count_active_admins() <= 1:
                    raise AppError(ErrorCode.LAST_ADMIN)

            user.role = new_role
            requires_revocation = True

        new_password = data.get("password")
        if new_password:  # non-empty string
            validate_new_password(new_password)
            user.set_password(new_password)
            requires_revocation = True

        try:
            user.save()
        except IntegrityError as exc:
            raise AppError(
                ErrorCode.DUPLICATE_VALUE, details={"fields": {"username": ["Username already taken."]}}
            ) from exc

        if requires_revocation:
            revoke_sessions(user)

        return user
