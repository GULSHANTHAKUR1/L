import re


def clean_ocr_text(raw_text: str) -> str:
    """
    Cleans and normalizes raw text output from Tesseract OCR:
    - Strips non-printable ASCII control characters.
    - Normalizes irregular whitespace while preserving line structure.
    - Fixes OCR line-break hyphenations (e.g. 'hyper-\\ntension' -> 'hypertension').
    - Consolidates redundant empty lines.
    - Preserves clinical numerical notations (e.g. 120/80 mmHg, 500mg).
    """
    if not raw_text:
        return ""

    # 1. Remove non-printable control characters, preserving newlines (\n) and carriage returns (\r)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", raw_text)

    # 2. Reconnect hyphenated words split across line breaks: e.g., 'prescrip-\ntion' -> 'prescription'
    cleaned = re.sub(r"(\b[a-zA-Z]{3,})-\s*\n\s*([a-zA-Z]{3,}\b)", r"\1\2", cleaned)

    # 3. Clean line by line
    lines = cleaned.splitlines()
    processed_lines = []

    for line in lines:
        # Collapse multiple horizontal spaces and tabs into a single space
        normalized_line = re.sub(r"[ \t]+", " ", line).strip()

        # Remove stray OCR noise characters
        normalized_line = re.sub(r"(?:^|\s)[~|°§©®`](?=\s|$)", "", normalized_line).strip()

        # Filter out standalone OCR noise glyphs (e.g. single non-alphanumeric punctuation marks like ~ or |)
        if normalized_line in ("~", "|", "_", "-", "`", "°", "§", "©", "®"):
            continue

        processed_lines.append(normalized_line)

    # 4. Rejoin lines and collapse 3 or more consecutive empty lines into max 2
    joined = "\n".join(processed_lines)
    result = re.sub(r"\n{3,}", "\n\n", joined).strip()

    return result
