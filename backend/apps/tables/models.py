from django.db import models

from common.models import BaseModel


class Table(BaseModel):
    number = models.IntegerField(unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "tables"
        ordering = ["number"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(number__gt=0), name="table_number_positive"
            ),
        ]

    def __str__(self) -> str:
        return f"Table #{self.number}"
