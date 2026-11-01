"""End-to-end tests for the Flask API (run with: pytest)."""
import io

import cv2
import numpy as np


def upload(client, data, name="photo.jpg", url="/api/detect", field="image", **form):
    return client.post(url, data={field: (io.BytesIO(data), name), **form},
                       content_type="multipart/form-data")


# ---------------------------------------------------------------- detection
def test_health(client):
    body = client.get("/api/health").get_json()
    assert body["status"] == "ok" and "default" in body["models"]


def test_detects_single_face(client, one_face):
    res = upload(client, one_face)
    assert res.status_code == 201
    body = res.get_json()
    assert body["face_count"] == 1
    assert body["processing_ms"] > 0
    assert body["image"] == {"width": 512, "height": 512}
    assert 0 < body["stats"]["coverage_pct"] < 100
    assert body["faces"][0]["area_pct"] > 0


def test_counts_multiple_faces(client, two_faces):
    body = upload(client, two_faces).get_json()
    assert body["face_count"] == 2
    assert body["faces"][0]["x"] < body["faces"][1]["x"]  # ordered left to right


def test_alt2_model(client, one_face):
    body = upload(client, one_face, model="alt2").get_json()
    assert body["model"] == "alt2" and body["face_count"] == 1


def test_image_without_faces(client):
    blank = np.full((300, 300, 3), 128, np.uint8)
    ok, buf = cv2.imencode(".png", blank)
    body = upload(client, buf.tobytes(), "blank.png").get_json()
    assert body["face_count"] == 0 and body["faces"] == []


def test_processed_image_is_annotated_and_downloadable(client, one_face):
    body = upload(client, one_face, "My Photo.JPG").get_json()
    image = client.get(body["image_url"])
    assert image.status_code == 200 and image.mimetype == "image/jpeg"
    processed = cv2.imdecode(np.frombuffer(image.data, np.uint8), cv2.IMREAD_COLOR)
    original = cv2.imdecode(np.frombuffer(one_face, np.uint8), cv2.IMREAD_COLOR)
    assert processed.shape == original.shape
    assert np.abs(processed.astype(int) - original.astype(int)).mean() > 0.05  # boxes drawn

    download = client.get(body["download_url"])
    assert "attachment" in download.headers["Content-Disposition"]
    assert "My_Photo_faces.jpg" in download.headers["Content-Disposition"]
    assert client.get(body["thumbnail_url"]).status_code == 200


def test_out_of_range_settings_are_clamped(client, one_face):
    res = upload(client, one_face, scale_factor="9", min_neighbors="-4", min_size="1")
    assert res.status_code == 201


# --------------------------------------------------------------- validation
def test_rejects_missing_file(client):
    res = client.post("/api/detect", data={}, content_type="multipart/form-data")
    assert res.status_code == 400 and res.get_json()["error"]["code"] == "no_file"


def test_rejects_wrong_extension(client, one_face):
    res = upload(client, one_face, "notes.txt")
    assert res.status_code == 400 and res.get_json()["error"]["code"] == "unsupported_type"


def test_rejects_fake_image(client):
    res = upload(client, b"this is not an image", "fake.jpg")
    assert res.status_code == 400 and res.get_json()["error"]["code"] == "invalid_image"


def test_rejects_empty_file(client):
    assert upload(client, b"", "empty.jpg").get_json()["error"]["code"] == "empty_file"


def test_rejects_tiny_image(client):
    ok, buf = cv2.imencode(".png", np.zeros((10, 10, 3), np.uint8))
    assert upload(client, buf.tobytes(), "tiny.png").get_json()["error"]["code"] == "too_small"


def test_rejects_oversized_upload(client):
    res = upload(client, b"\0" * (3 * 1024 * 1024), "huge.jpg")  # limit is 1 MB in tests
    assert res.status_code == 413 and res.get_json()["error"]["code"] == "too_large"


def test_rejects_unknown_model(client, one_face):
    res = upload(client, one_face, model="magic")
    assert res.status_code == 400 and res.get_json()["error"]["code"] == "invalid_setting"


def test_unknown_api_route_is_json(client):
    res = client.get("/api/nope")
    assert res.status_code == 404 and res.get_json()["error"]["code"] == "not_found"


# ------------------------------------------------------------ webcam frames
def test_detect_frame_returns_boxes_without_saving(client, one_face):
    body = upload(client, one_face, "frame.jpg", url="/api/detect-frame", field="frame").get_json()
    assert body["face_count"] == 1 and body["frame"]["width"] == 512
    assert client.get("/api/history").get_json()["items"] == []


def test_detect_frame_validates(client):
    res = upload(client, b"junk", "frame.jpg", url="/api/detect-frame", field="frame")
    assert res.status_code == 400


# ------------------------------------------------------- history and stats
def test_history_stats_and_delete(client, one_face, two_faces):
    first = upload(client, one_face).get_json()
    upload(client, two_faces, source="webcam")

    items = client.get("/api/history").get_json()["items"]
    assert [i["face_count"] for i in items] == [2, 1]  # newest first
    assert items[0]["source"] == "webcam"

    stats = client.get("/api/stats").get_json()
    assert stats["total_scans"] == 2 and stats["total_faces"] == 3
    assert stats["max_faces"] == 2 and stats["webcam_scans"] == 1 and stats["upload_scans"] == 1

    assert client.delete(f"/api/history/{first['id']}").status_code == 200
    assert client.get(first["image_url"]).status_code == 404
    assert client.delete(f"/api/history/{first['id']}").status_code == 404

    assert client.delete("/api/history").get_json()["deleted"] == 1
    assert client.get("/api/stats").get_json()["total_scans"] == 0


def test_history_is_pruned_and_files_removed(client, app, one_face):
    for _ in range(5):
        upload(client, one_face)
    assert len(client.get("/api/history").get_json()["items"]) == 3  # MAX_HISTORY in tests
    files = list(app.config["PROCESSED_DIR"].glob("*.jpg"))
    assert len(files) == 6  # 3 records x (image + thumbnail)
