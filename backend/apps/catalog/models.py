from django.db import models

from common.models import BaseModel


class CatalogStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "ACTIVE"
    DISABLED = "DISABLED", "DISABLED"


class CategoryIcon(models.TextChoices):
    COFFEE = "coffee", "coffee"
    TEA = "tea", "tea"
    JUICE = "juice", "juice"
    SOFT_DRINK = "soft_drink", "soft_drink"
    WATER = "water", "water"
    BREAKFAST = "breakfast", "breakfast"
    SANDWICH = "sandwich", "sandwich"
    BURGER = "burger", "burger"
    PIZZA = "pizza", "pizza"
    GRILL = "grill", "grill"
    CHICKEN = "chicken", "chicken"
    PASTA = "pasta", "pasta"
    RICE = "rice", "rice"
    SALAD = "salad", "salad"
    SOUP = "soup", "soup"
    APPETIZER = "appetizer", "appetizer"
    DESSERT = "dessert", "dessert"
    CAKE = "cake", "cake"
    ICE_CREAM = "ice_cream", "ice_cream"
    BAKERY = "bakery", "bakery"


class Category(BaseModel):
    name = models.CharField(max_length=80, unique=True)
    sort_order = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=CatalogStatus.choices, default=CatalogStatus.ACTIVE
    )
    icon = models.CharField(  # noqa: DJ001
        max_length=40, choices=CategoryIcon.choices, null=True, blank=True
    )

    class Meta:
        db_table = "categories"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return str(self.name)


class Item(BaseModel):
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="items"
    )
    name = models.CharField(max_length=80)
    price_minor = models.BigIntegerField()
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=CatalogStatus.choices, default=CatalogStatus.ACTIVE
    )

    class Meta:
        db_table = "items"
        ordering = ["category__sort_order", "category__name", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["category", "name"], name="uniq_item_name_per_category"
            ),
            models.CheckConstraint(
                condition=models.Q(price_minor__gt=0), name="item_price_positive"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.category.name})"
