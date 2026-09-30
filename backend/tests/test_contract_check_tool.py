"""ADR-0008: the diff tool normalises spectacular's shapes and detects drift."""

import importlib.util
from pathlib import Path
from types import ModuleType

import pytest


@pytest.fixture(scope="module")
def tool() -> ModuleType:
    path = Path(__file__).resolve().parents[1] / "scripts/contract_check.py"
    spec = importlib.util.spec_from_file_location("contract_check", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_nullable_ref_forms_are_equivalent(tool: ModuleType) -> None:
    doc = {"components": {"schemas": {"S": {"type": "string", "enum": ["A", "B"]}, "NullEnum": {"enum": [None]}}}}
    res = tool.Resolver(doc)
    contract_form = {"allOf": [{"$ref": "#/components/schemas/S"}], "nullable": True}
    code_form = {"oneOf": [{"$ref": "#/components/schemas/S"}, {"$ref": "#/components/schemas/NullEnum"}]}
    assert res.shape(contract_form) == res.shape(code_form)


def test_missing_property_is_reported(tool: ModuleType) -> None:
    res = tool.Resolver({})
    a = res.shape({"type": "object", "required": ["x"], "properties": {"x": {"type": "integer"}}})
    b = res.shape({"type": "object", "required": [], "properties": {}})
    diffs = tool._diff(a, b)
    assert any("x" in d for d in diffs)


def test_type_change_is_reported(tool: ModuleType) -> None:
    res = tool.Resolver({})
    a = res.shape({"type": "object", "properties": {"total_minor": {"type": "integer"}}})
    b = res.shape({"type": "object", "properties": {"total_minor": {"type": "number"}}})
    assert tool._diff(a, b)
