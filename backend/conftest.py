"""Global pytest fixtures (DRF_SKILL §35), at the rootdir so both tests/ and apps/*/tests/ see them."""

from pathlib import Path

import pytest
from rest_framework.test import APIClient

REPO_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    from django.core.cache import cache

    cache.clear()
