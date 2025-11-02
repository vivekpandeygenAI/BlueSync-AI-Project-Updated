

def _safe_parse_by_bytes_or_tempfile(parse_fn, filename: str, file_bytes: bytes):
    """
    Try to call parse_fn with bytes first (if parse_fn supports it).
    If that errors, create a NamedTemporaryFile, write bytes, and call parse_fn with the temp path.
    Returns whatever parse_fn returns.
    """
    # Prefer bytes-capable signature: try calling with bytes
    try:
        # many of your parse functions may accept (file_path, file_bytes) or file_bytes only
        try:
            # try signature parse_fn(file_bytes=...)
            return parse_fn(file_bytes=file_bytes)
        except TypeError:
            pass

        try:
            # try signature parse_fn(filename, file_bytes)
            return parse_fn(filename, file_bytes)
        except TypeError:
            pass

        try:
            # try signature parse_fn(file_bytes)
            return parse_fn(file_bytes)
        except TypeError:
            pass

        # Fallback: create temp file then call parse_fn(temp_path)
        with tempfile.NamedTemporaryFile(delete=True, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(file_bytes)
            tmp.flush()
            return parse_fn(tmp.name)
    except Exception:
        # Re-raise to let callers decide how to handle
        raise

def gemini_extract_text_from_bytes(filename: str, file_bytes: bytes) -> str:
    """
    Extracts and flattens text from an uploaded file (in-memory bytes).
    Tries to parse using document_parser functions without permanently saving files.
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        parsed = _safe_parse_by_bytes_or_tempfile(parse_pdf, filename, file_bytes)
    elif ext == ".docx":
        parsed = _safe_parse_by_bytes_or_tempfile(parse_word, filename, file_bytes)
    elif ext == ".xml":
        parsed = _safe_parse_by_bytes_or_tempfile(parse_xml, filename, file_bytes)
    elif ext in (".html", ".htm", ".md", ".txt"):
        parsed = _safe_parse_by_bytes_or_tempfile(parse_markup, filename, file_bytes)
    else:
        # If file type unknown, attempt markup/text parse, otherwise fail
        try:
            parsed = _safe_parse_by_bytes_or_tempfile(parse_markup, filename, file_bytes)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Unsupported or unparseable file type: {ext}")

    flattened = flatten_json(parsed)
    return flattened
