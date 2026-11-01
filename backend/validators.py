"""Input validation for uploaded images and detection settings."""
import cv2
import numpy as np

from detector import MODELS


class ValidationError(Exception):
    """Raised when the request is wrong; becomes a clean JSON error."""

    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def read_image_upload(file_storage, config):
    """Validate an uploaded file and return ``(image_bgr, filename)``."""
    if file_storage is None or not file_storage.filename:
        raise ValidationError("no_file", "No image was uploaded. Choose a JPG, PNG, BMP or WebP file.")

    filename = file_storage.filename
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in config["ALLOWED_EXTENSIONS"]:
        allowed = ", ".join(sorted(e.upper() for e in config["ALLOWED_EXTENSIONS"]))
        raise ValidationError("unsupported_type", f"'.{extension or '?'}' files are not supported. Use one of: {allowed}.")

    data = file_storage.read()
    if not data:
        raise ValidationError("empty_file", "The uploaded file is empty.")
    max_bytes = config["MAX_UPLOAD_MB"] * 1024 * 1024
    if len(data) > max_bytes:
        raise ValidationError("too_large", f"Image is too large. The limit is {config['MAX_UPLOAD_MB']} MB.", 413)

    # Decoding is the real test: a renamed .txt file will fail here.
    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValidationError("invalid_image", "This file could not be read as an image. It may be corrupted or not a real picture.")

    height, width = image.shape[:2]
    if min(height, width) < config["MIN_IMAGE_SIDE"]:
        raise ValidationError("too_small", f"Image is too small ({width}x{height}). Use at least {config['MIN_IMAGE_SIDE']} px on each side.")
    if height * width > config["MAX_IMAGE_PIXELS"]:
        raise ValidationError("too_many_pixels", "Image resolution is too high to process. Resize it and try again.", 413)

    return image, filename


def _number(form, key, default, low, high, cast):
    raw = form.get(key)
    if raw in (None, ""):
        return default
    try:
        value = cast(raw)
    except (TypeError, ValueError):
        raise ValidationError("invalid_setting", f"'{key}' must be a number.")
    return max(low, min(high, value))


def parse_detection_params(form):
    """Read detection settings from form fields, clamping them to safe ranges."""
    model = form.get("model", "default")
    if model not in MODELS:
        raise ValidationError("invalid_setting", f"Unknown model '{model}'. Choose one of: {', '.join(MODELS)}.")
    return {
        "model": model,
        "scale_factor": _number(form, "scale_factor", 1.1, 1.05, 1.5, float),
        "min_neighbors": _number(form, "min_neighbors", 5, 1, 12, int),
        "min_size": _number(form, "min_size", 30, 20, 400, int),
    }
