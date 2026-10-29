import ipaddress
import re
import secrets
import socket
from urllib.parse import urlparse
from fastapi import Header, HTTPException, status
from app.config import settings


def verify_internal_api_key(
    x_internal_api_key: str = Header(
        None,
        alias="X-Internal-API-Key",
        description="Shared secret internal API key"
    )
) -> str:
    """
    FastAPI dependency enforcing shared secret authentication for internal microservice calls.
    Protects microservice from unauthorized external requests.
    """
    if not x_internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required header 'X-Internal-API-Key'",
        )

    # Constant-time comparison to protect against timing attacks
    if not secrets.compare_digest(x_internal_api_key, settings.INTERNAL_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )

    return x_internal_api_key


def is_private_ip(ip_str: str) -> bool:
    """
    Checks if an IP address belongs to loopback, private, link-local, or multicast blocks.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
        )
    except ValueError:
        return False


def validate_safe_url(url: str) -> None:
    """
    Validates a URL to prevent Server-Side Request Forgery (SSRF) attacks.
    Ensures URL targets external, public resources (such as Cloudinary / AWS S3)
    and blocks internal metadata endpoints (169.254.169.254).
    """
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Disallowed URL scheme: '{parsed.scheme}'. Only HTTP and HTTPS are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: missing hostname.")

    # Strict block on AWS/GCP/Azure link-local metadata endpoints in all environments
    if hostname == "169.254.169.254" or hostname == "metadata.google.internal":
        raise ValueError("Targeting cloud metadata services is strictly prohibited.")

    # In production, disallow localhost and private LAN addresses
    if settings.ENVIRONMENT.lower() == "production":
        # Resolve hostname to check IP
        try:
            resolved_ips = socket.getaddrinfo(hostname, None)
            for item in resolved_ips:
                ip_addr = item[4][0]
                if is_private_ip(ip_addr):
                    raise ValueError(f"URL resolves to prohibited private network address: {ip_addr}")
        except socket.gaierror:
            raise ValueError(f"Could not resolve host: {hostname}")
    else:
        # In development, disallow only loopback if requested, but permit local testing if needed
        blocked_dev = ["169.254.169.254"]
        if hostname in blocked_dev:
            raise ValueError(f"Access to {hostname} is blocked for security.")
