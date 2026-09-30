"""Static rules on docs/api/openapi.yaml (ADR-0005, ADR-0008, ADR-0010)."""

from pathlib import Path
from typing import Any

import pytest
import yaml

METHODS = ("get", "post", "put", "patch", "delete")
ALLOWED_ROLES = {"PUBLIC", "ANY_AUTHENTICATED", "ADMIN", "CASHIER"}


@pytest.fixture(scope="module")
def contract() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[2] / "docs/api/openapi.yaml"
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _operations(contract: dict[str, Any]) -> list[tuple[str, str, dict[str, Any]]]:
    return [(m.upper(), p, item[m]) for p, item in contract["paths"].items() for m in METHODS if m in item]


def _properties(node: Any, path: str = "") -> list[tuple[str, str, dict[str, Any]]]:
    out: list[tuple[str, str, dict[str, Any]]] = []
    if isinstance(node, dict):
        for name, sub in (node.get("properties") or {}).items():
            if isinstance(sub, dict):
                out.append((f"{path}.{name}", name, sub))
        for key, value in node.items():
            out += _properties(value, f"{path}.{key}")
    elif isinstance(node, list):
        for value in node:
            out += _properties(value, path)
    return out


def test_br_gen_01_every_minor_field_is_an_integer(contract: dict[str, Any]) -> None:
    for where, name, schema in _properties(contract["components"]["schemas"]):
        if name.endswith("_minor"):
            assert schema.get("type") == "integer", where


def test_br_gen_01_no_number_type_anywhere(contract: dict[str, Any]) -> None:
    text = yaml.safe_dump(contract)
    assert "type: number" not in text  # no floats in the contract at all


def test_br_gen_01_money_described_fields_end_in_minor(contract: dict[str, Any]) -> None:
    for where, name, schema in _properties(contract["components"]["schemas"]):
        if "minor units" in str(schema.get("description", "")).lower():
            assert name.endswith("_minor"), where


def test_every_operation_declares_roles_br_ids_and_error_codes(contract: dict[str, Any]) -> None:
    for method, path, op in _operations(contract):
        label = f"{method} {path}"
        assert op.get("operationId"), label
        assert set(op["x-roles"]) <= ALLOWED_ROLES and op["x-roles"], label
        assert op["x-br"], label
        assert "BR" in op["description"], label
        enum = set(contract["components"]["schemas"]["ErrorCode"]["enum"])
        assert set(op["x-error-codes"]) <= enum, label


def test_br_gen_06_every_business_code_is_reachable(contract: dict[str, Any]) -> None:
    used = {c for _, _, op in _operations(contract) for c in op["x-error-codes"]}
    enum = set(contract["components"]["schemas"]["ErrorCode"]["enum"]) - {"INTERNAL_ERROR"}
    assert enum - used == set()


def test_br_pay_04_payment_requires_idempotency_key(contract: dict[str, Any]) -> None:
    op = contract["paths"]["/api/orders/{id}/payment"]["post"]
    refs = [p.get("$ref", "") for p in op["parameters"]]
    assert "#/components/parameters/IdempotencyKey" in refs
    assert contract["components"]["parameters"]["IdempotencyKey"]["required"] is True


def test_br_usr_02_no_user_delete_endpoint(contract: dict[str, Any]) -> None:
    assert "delete" not in contract["paths"]["/api/users/{id}"]


def test_oq_32_no_table_delete_endpoint(contract: dict[str, Any]) -> None:
    assert "delete" not in contract["paths"]["/api/tables/{id}"]


def test_br_set_03_settings_has_only_two_fields(contract: dict[str, Any]) -> None:
    props = contract["components"]["schemas"]["Settings"]["properties"]
    assert set(props) == {"business_name", "receipt_footer"}
