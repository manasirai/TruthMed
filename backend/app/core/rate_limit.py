from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Keyed by client IP. Behind a reverse proxy, run uvicorn with --proxy-headers so the real IP is used.
limiter = Limiter(key_func=get_remote_address)
