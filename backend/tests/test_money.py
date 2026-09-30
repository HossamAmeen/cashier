"""BR-GEN-01 integer money helpers (ADR-0005)."""

import pytest

from common.money import MoneyFormatError, format_minor, percent_of, to_minor


@pytest.mark.parametrize(
    ("text", "expected"),
    [("45", 4500), ("45.5", 4550), ("45.50", 4550), ("0", 0), ("0.01", 1), ("3620.00", 362000)],
)
def test_br_gen_01_br_item_02_to_minor_parses_up_to_two_decimals(text: str, expected: int) -> None:
    assert to_minor(text) == expected
    assert isinstance(to_minor(text), int)


@pytest.mark.parametrize("text", ["45.505", "-1", "abc", "", "1,000", "1e3", " . "])
def test_br_item_02_to_minor_rejects_bad_input(text: str) -> None:
    with pytest.raises(MoneyFormatError):
        to_minor(text)


def test_br_gen_01_format_minor() -> None:
    assert format_minor(485000) == "4,850.00"
    assert format_minor(-2000) == "-20.00"
    assert format_minor(5) == "0.05"


def test_br_gen_01_format_minor_refuses_floats() -> None:
    with pytest.raises(TypeError):
        format_minor(10.5)  # type: ignore[arg-type]


def test_br_ord_07_percent_rounds_half_up_to_whole_minor_unit() -> None:
    assert percent_of(31500, 10) == 3150  # US-11.8
    assert percent_of(105, 10) == 11  # 10.5 → 11 (half-up)
    assert percent_of(104, 10) == 10
