"""Abstract base model (DRF_SKILL §11, adapted by ADR-0001: no soft delete; BR-GEN-04 uses status fields)."""

from django.db import models


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, editable=False)  # BR §2 (OQ-35): set once, UTC
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
