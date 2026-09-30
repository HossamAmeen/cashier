"""Client IP resolution behind exactly NUM_PROXIES trusted proxies (ADR-0002, ADR-0009)."""

from django.conf import settings
from django.http import HttpRequest


def client_ip(request: HttpRequest) -> str:
    """Return the client IP as seen by the outermost trusted proxy (nginx).

    nginx uses ``proxy_add_x_forwarded_for``, so the right-most NUM_PROXIES entries were added by trusted proxies.
    Entries further left are client-controlled and ignored.
    """
    num_proxies: int = settings.REST_FRAMEWORK.get("NUM_PROXIES") or 0
    remote = str(request.META.get("REMOTE_ADDR", "") or "")
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if num_proxies and xff:
        hops = [h.strip() for h in xff.split(",") if h.strip()]
        if hops:
            return str(hops[-min(num_proxies, len(hops))])
    return remote
