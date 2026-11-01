import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture()
def app(tmp_path):
    return create_app({
        "TESTING": True,
        "DATABASE_PATH": tmp_path / "test.db",
        "PROCESSED_DIR": tmp_path / "processed",
        "FRONTEND_DIST": tmp_path / "no-dist",
        "MAX_HISTORY": 3,
        "MAX_UPLOAD_MB": 1,
    })


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def one_face():
    return (FIXTURES / "astronaut.jpg").read_bytes()


@pytest.fixture()
def two_faces():
    return (FIXTURES / "two-faces.jpg").read_bytes()
