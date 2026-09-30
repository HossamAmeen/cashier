#!/usr/bin/env python
"""Contract diff (ADR-0008): docs/api/openapi.yaml (hand-written) vs the drf-spectacular schema of the code.

Usage (from backend/):  DJANGO_SETTINGS_MODULE=config.settings.test python scripts/contract_check.py [--strict]

Fails (exit 1) when:
  * the contract is not a valid OpenAPI 3.0 document;
  * the code exposes an operation that the contract does not define;
  * an implemented operation differs in operationId, parameters, JSON request body shape or 2xx response shape;
  * --strict and a contract operation is not implemented yet.
Differences in 4xx status sets are printed as warnings.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
CONTRACT = REPO_ROOT / "docs" / "api" / "openapi.yaml"
METHODS = ("get", "post", "put", "patch", "delete")
EXCLUDED_PREFIXES = ("/api/schema", "/api/docs", "/api/redoc")

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")


def _generated_schema() -> dict[str, Any]:
    import django

    django.setup()
    import yaml
    from drf_spectacular.generators import SchemaGenerator
    from drf_spectacular.renderers import OpenApiYamlRenderer

    schema = SchemaGenerator().get_schema(request=None, public=True)  # type: ignore[no-untyped-call]
    rendered = OpenApiYamlRenderer().render(schema, renderer_context={})  # type: ignore[no-untyped-call]
    loaded: dict[str, Any] = yaml.safe_load(rendered)
    return loaded


def _norm_path(path: str) -> str:
    return path.rstrip("/") or "/"


class Resolver:
    def __init__(self, doc: dict[str, Any]) -> None:
        self.doc = doc

    def deref(self, node: Any) -> Any:
        seen = 0
        while isinstance(node, dict) and "$ref" in node:
            ref = node["$ref"]
            if not ref.startswith("#/"):
                raise ValueError(f"external $ref not supported: {ref}")
            target: Any = self.doc
            for part in ref[2:].split("/"):
                target = target[part]
            node = target
            seen += 1
            if seen > 50:
                raise ValueError(f"$ref loop at {ref}")
        return node

    def shape(self, node: Any, depth: int = 0) -> Any:
        """Normalised structural signature of a schema (ADR-0008 §4)."""
        if depth > 25:
            return "<deep>"
        node = self.deref(node)
        if not isinstance(node, dict):
            return node
        nullable = bool(node.get("nullable", False))
        # allOf with a single member (spectacular wraps enums/refs this way)
        if "allOf" in node and len(node["allOf"]) == 1:
            inner = self.shape(node["allOf"][0], depth + 1)
            return _with_nullable(inner, nullable)
        for key in ("oneOf", "anyOf"):
            if key in node:
                members = [self.deref(m) for m in node[key]]
                non_null = [m for m in members if not _is_null_schema(m)]
                has_null = len(non_null) != len(members)
                if len(non_null) == 1:
                    return _with_nullable(self.shape(non_null[0], depth + 1), nullable or has_null)
                variants = sorted(repr(self.shape(m, depth + 1)) for m in non_null)
                return {key: variants, "nullable": nullable or has_null}
        if "allOf" in node:
            merged: dict[str, Any] = {"type": "object", "properties": {}, "required": []}
            for member in node["allOf"]:
                member = self.deref(member)
                merged["properties"].update(member.get("properties", {}))
                merged["required"] += member.get("required", [])
            return _with_nullable(self.shape(merged, depth + 1), nullable)
        typ = node.get("type")
        if typ is None and "properties" in node:
            typ = "object"
        sig: dict[str, Any] = {"type": typ}
        if nullable:
            sig["nullable"] = True
        if "enum" in node:
            sig["enum"] = sorted(str(v) for v in node["enum"] if v is not None)
            if None in node["enum"]:
                sig["nullable"] = True
        if typ == "object":
            props = node.get("properties", {})
            sig["properties"] = {name: self.shape(sub, depth + 1) for name, sub in sorted(props.items())}
            sig["required"] = sorted(set(node.get("required", [])))
            if "additionalProperties" in node and isinstance(node["additionalProperties"], dict):
                sig["additionalProperties"] = self.shape(node["additionalProperties"], depth + 1)
        if typ == "array":
            sig["items"] = self.shape(node.get("items", {}), depth + 1)
        return sig


def _is_null_schema(node: Any) -> bool:
    return isinstance(node, dict) and (node.get("enum") == [None] or node.get("type") == "null")


def _with_nullable(sig: Any, nullable: bool) -> Any:
    if nullable and isinstance(sig, dict):
        return {**sig, "nullable": True}
    return sig


def _operations(doc: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    ops: dict[tuple[str, str], dict[str, Any]] = {}
    for path, item in (doc.get("paths") or {}).items():
        if _norm_path(path).startswith(EXCLUDED_PREFIXES):
            continue
        shared_params = item.get("parameters", [])
        for method in METHODS:
            if method in item:
                op = dict(item[method])
                op["_parameters"] = shared_params + op.get("parameters", [])
                ops[(method.upper(), _norm_path(path))] = op
    return ops


def _params(res: Resolver, op: dict[str, Any]) -> set[tuple[str, str, bool]]:
    out = set()
    for p in op["_parameters"]:
        p = res.deref(p)
        if p.get("in") == "cookie":
            continue
        out.add((p["in"], p["name"].lower() if p["in"] == "header" else p["name"], bool(p.get("required", False))))
    return out


def _json_schema(res: Resolver, container: dict[str, Any] | None) -> Any:
    if not container:
        return None
    container = res.deref(container)
    content = container.get("content", {}).get("application/json")
    if not content or "schema" not in content:
        return None
    return res.shape(content["schema"])


def _diff(a: Any, b: Any, path: str = "") -> list[str]:
    if a == b:
        return []
    if isinstance(a, dict) and isinstance(b, dict):
        out: list[str] = []
        for key in sorted(set(a) | set(b)):
            if key not in a:
                out.append(f"{path}.{key}: only in code")
            elif key not in b:
                out.append(f"{path}.{key}: only in contract")
            else:
                out += _diff(a[key], b[key], f"{path}.{key}")
        return out
    return [f"{path}: contract={a!r} code={b!r}"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="every contract operation must be implemented")
    args = parser.parse_args()

    import yaml

    contract = yaml.safe_load(CONTRACT.read_text(encoding="utf-8"))
    errors: list[str] = []
    warnings: list[str] = []

    from drf_spectacular.validation import validate_schema

    try:
        validate_schema(contract)  # type: ignore[no-untyped-call]
    except Exception as exc:  # jsonschema.ValidationError
        errors.append(f"contract is not valid OpenAPI 3.0: {str(exc).splitlines()[0]}")

    generated = _generated_schema()
    c_res, g_res = Resolver(contract), Resolver(generated)
    c_ops, g_ops = _operations(contract), _operations(generated)

    for key in sorted(g_ops):
        method, path = key
        label = f"{method} {path}"
        if key not in c_ops:
            errors.append(f"{label}: implemented but not in the contract")
            continue
        c_op, g_op = c_ops[key], g_ops[key]
        if c_op.get("operationId") != g_op.get("operationId"):
            errors.append(f"{label}: operationId contract={c_op.get('operationId')} code={g_op.get('operationId')}")
        c_params, g_params = _params(c_res, c_op), _params(g_res, g_op)
        if c_params != g_params:
            errors.append(
                f"{label}: parameters differ; only in contract={sorted(c_params - g_params)} "
                f"only in code={sorted(g_params - c_params)}"
            )
        for diff in _diff(_json_schema(c_res, c_op.get("requestBody")), _json_schema(g_res, g_op.get("requestBody"))):
            errors.append(f"{label}: request body {diff}")
        c_resp, g_resp = c_op.get("responses", {}), g_op.get("responses", {})
        c_2xx = {str(s) for s in c_resp if str(s).startswith("2")}
        g_2xx = {str(s) for s in g_resp if str(s).startswith("2")}
        if c_2xx != g_2xx:
            errors.append(f"{label}: 2xx statuses contract={sorted(c_2xx)} code={sorted(g_2xx)}")
        for status in sorted(c_2xx & g_2xx):
            c_key = status if status in c_resp else int(status)
            g_key = status if status in g_resp else int(status)
            for diff in _diff(_json_schema(c_res, c_resp[c_key]), _json_schema(g_res, g_resp[g_key])):
                errors.append(f"{label}: response {status} {diff}")
        c_err = {str(s) for s in c_resp if not str(s).startswith("2")}
        g_err = {str(s) for s in g_resp if not str(s).startswith("2")}
        if g_err and c_err != g_err:
            warnings.append(f"{label}: error statuses contract={sorted(c_err)} code={sorted(g_err)}")

    pending = sorted(set(c_ops) - set(g_ops))
    implemented = len(set(c_ops) & set(g_ops))
    print(f"contract operations: {len(c_ops)}  implemented: {implemented}  pending: {len(pending)}")
    for method, path in pending:
        print(f"  PENDING {method} {path}")
        if args.strict:
            errors.append(f"{method} {path}: in the contract but not implemented (--strict)")
    for w in warnings:
        print(f"  WARN  {w}")
    for e in errors:
        print(f"  ERROR {e}")
    print("contract check: " + ("FAILED" if errors else "OK"))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
