"""ADR-0009 client IP behind nginx (used by BR-AUTH-03)."""

from django.test import RequestFactory

from common.net import client_ip


def test_client_ip_uses_rightmost_forwarded_hop() -> None:
    req = RequestFactory().get("/", HTTP_X_FORWARDED_FOR="6.6.6.6, 203.0.113.9", REMOTE_ADDR="172.18.0.1")
    assert client_ip(req) == "203.0.113.9"  # the left entry is client-controlled


def test_client_ip_falls_back_to_remote_addr() -> None:
    req = RequestFactory().get("/", REMOTE_ADDR="198.51.100.7")
    assert client_ip(req) == "198.51.100.7"
