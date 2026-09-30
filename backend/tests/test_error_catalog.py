"""BR-GEN-06 / BR §9: the backend catalogue equals BUSINESS_RULES.md §9 and the contract's ErrorCode enum."""

import re
from pathlib import Path

import pytest
import yaml

from common.error_codes import BUSINESS_CODES, ERROR_CATALOG, ErrorCode


def _br_section_9(repo_root: Path) -> dict[str, tuple[int, str]]:
    text = (repo_root / "docs/business/BUSINESS_RULES.md").read_text(encoding="utf-8")
    section = text.split("## 9. Error codes", 1)[1].split("\n## ", 1)[0]
    rows = re.findall(r"^\|\s*([A-Z_]+)\s*\|\s*(\d{3})\s*\|\s*(.+?)\s*\|\s*$", section, flags=re.M)
    return {code: (int(status), msg) for code, status, msg in rows}


def test_br_gen_06_catalog_matches_business_rules_section_9(repo_root: Path) -> None:
    br = _br_section_9(repo_root)
    # 24 business codes (v1.2) plus INTERNAL_ERROR once BR v1.3 lands (GATE B D3).
    assert {c.value for c in BUSINESS_CODES} <= set(br)
    assert set(br) <= {c.value for c in ErrorCode}
    assert {code: ERROR_CATALOG[ErrorCode(code)] for code in br} == br


def test_br_gen_06_contract_error_enum_matches_catalog(repo_root: Path) -> None:
    contract_path = repo_root / "docs/api/openapi.yaml"
    if not contract_path.exists():
        pytest.skip("contract not present")
    contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
    enum = contract["components"]["schemas"]["ErrorCode"]["enum"]
    assert sorted(enum) == sorted(c.value for c in ErrorCode)


def test_every_code_has_status_and_arabic_message() -> None:
    for code in ErrorCode:
        status, msg = ERROR_CATALOG[code]
        assert 400 <= status < 600
        assert re.search(r"[؀-ۿ]", msg), code
