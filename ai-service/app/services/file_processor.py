import httpx
from app.config import settings


async def download_document_file(file_url: str) -> bytes:
    """
    Safely downloads a document from a controlled URL with:
    - Pre-download Content-Length validation against MAX_FILE_SIZE_MB (10 MB).
    - Streaming byte accumulation to strictly enforce memory and disk limits.
    - Configured network timeout to prevent hung worker processes.
    """
    timeout = httpx.Timeout(settings.DOWNLOAD_TIMEOUT_SECONDS, connect=10.0)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        try:
            async with client.stream("GET", file_url) as response:
                if response.status_code != 200:
                    raise ValueError(
                        f"Failed to retrieve file from URL. Server returned HTTP {response.status_code}"
                    )

                # Check Content-Length if reported by the remote server
                content_length = response.headers.get("content-length")
                if content_length:
                    try:
                        expected_bytes = int(content_length)
                        if expected_bytes > settings.max_file_size_bytes:
                            raise ValueError(
                                f"File size ({expected_bytes / (1024 * 1024):.2f} MB) exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB} MB"
                            )
                    except ValueError as ve:
                        if "exceeds maximum allowed limit" in str(ve):
                            raise ve

                # Stream and accumulate with byte cap
                content_chunks = []
                total_downloaded = 0

                async for chunk in response.aiter_bytes(chunk_size=65536):
                    total_downloaded += len(chunk)
                    if total_downloaded > settings.max_file_size_bytes:
                        raise ValueError(
                            f"Downloaded content exceeded {settings.MAX_FILE_SIZE_MB} MB limit during streaming"
                        )
                    content_chunks.append(chunk)

                return b"".join(content_chunks)

        except httpx.TimeoutException:
            raise TimeoutError(
                f"Download timed out after {settings.DOWNLOAD_TIMEOUT_SECONDS} seconds while fetching document"
            )
        except httpx.RequestError as exc:
            raise ConnectionError(f"Network error while fetching document: {str(exc)}")
