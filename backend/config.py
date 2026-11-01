"""Central configuration for the FaceVision AI backend.

Every value can be overridden with an environment variable, so you never
have to edit code to change the port or the upload limit.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent


class Config:
    # Server
    HOST = os.environ.get("FACEVISION_HOST", "127.0.0.1")
    # 5001 (not 5000) because macOS reserves port 5000 for AirPlay Receiver.
    PORT = int(os.environ.get("FACEVISION_PORT", "5001"))
    DEBUG = os.environ.get("FACEVISION_DEBUG", "0") == "1"

    # Storage (SQLite database + processed images live in backend/data)
    DATA_DIR = Path(os.environ.get("FACEVISION_DATA_DIR", BASE_DIR / "data"))
    DATABASE_PATH = DATA_DIR / "facevision.db"
    PROCESSED_DIR = DATA_DIR / "processed"
    MAX_HISTORY = int(os.environ.get("FACEVISION_MAX_HISTORY", "50"))

    # Upload validation
    MAX_UPLOAD_MB = int(os.environ.get("FACEVISION_MAX_UPLOAD_MB", "10"))
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "webp"}
    MIN_IMAGE_SIDE = 32            # pixels - smaller images cannot hold a usable face
    MAX_IMAGE_PIXELS = 50_000_000  # protects the server from decompression bombs

    # Detection
    MAX_DETECT_SIDE = 1600         # larger images are shrunk for detection only
    THUMBNAIL_SIDE = 360

    # Optional: serve the built React app (frontend/dist) from Flask
    FRONTEND_DIST = PROJECT_DIR / "frontend" / "dist"
