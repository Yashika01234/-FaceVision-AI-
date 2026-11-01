"""FaceVision AI - Flask API.

Run with:  python app.py
"""
import time
import uuid
from pathlib import Path

import cv2
from flask import Blueprint, Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename

from config import Config
from database import HistoryStore
from detector import MODELS, FaceDetector, draw_faces
from validators import ValidationError, parse_detection_params, read_image_upload

SOURCES = {"upload", "webcam"}


def create_app(overrides=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    # Multipart overhead means the raw request is slightly bigger than the image.
    app.config["MAX_CONTENT_LENGTH"] = (app.config["MAX_UPLOAD_MB"] + 1) * 1024 * 1024
    CORS(app, resources={r"/api/*": {"origins": r"http://(localhost|127\.0\.0\.1):\d+"}})

    processed_dir = Path(app.config["PROCESSED_DIR"])
    processed_dir.mkdir(parents=True, exist_ok=True)
    Path(app.config["DATABASE_PATH"]).parent.mkdir(parents=True, exist_ok=True)

    store = HistoryStore(app.config["DATABASE_PATH"])
    detector = FaceDetector(max_detect_side=app.config["MAX_DETECT_SIDE"])
    api = Blueprint("api", __name__, url_prefix="/api")

    # ------------------------------------------------------------ helpers
    def error(code, message, status):
        return jsonify({"error": {"code": code, "message": message}}), status

    def face_summary(faces, width, height):
        """Add per-face area and overall statistics."""
        image_area = width * height
        enriched = []
        for face in faces:
            area = face["width"] * face["height"]
            enriched.append({**face, "area_pct": round(area / image_area * 100, 2)})
        total_area = sum(f["width"] * f["height"] for f in faces)
        stats = {
            "coverage_pct": round(total_area / image_area * 100, 2),
            "avg_face_px": round(sum(f["width"] for f in faces) / len(faces)) if faces else 0,
            "largest_face_px": max((f["width"] for f in faces), default=0),
        }
        return enriched, stats

    def encode_jpeg(image, quality):
        ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if not ok:
            raise RuntimeError("Could not encode the processed image.")
        return buffer.tobytes()

    def save_images(annotated):
        """Write the full-size result and a small thumbnail; return their file names."""
        stem = uuid.uuid4().hex
        image_file, thumb_file = f"{stem}.jpg", f"{stem}_thumb.jpg"
        (processed_dir / image_file).write_bytes(encode_jpeg(annotated, 92))

        height, width = annotated.shape[:2]
        scale = min(1.0, app.config["THUMBNAIL_SIDE"] / max(height, width))
        thumb = cv2.resize(annotated, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        (processed_dir / thumb_file).write_bytes(encode_jpeg(thumb, 80))
        return image_file, thumb_file

    def remove_files(records):
        for record in records:
            for key in ("image_file", "thumb_file"):
                (processed_dir / record[key]).unlink(missing_ok=True)

    def serialize(record):
        base = f"/api/history/{record['id']}"
        return {
            "id": record["id"],
            "filename": record["filename"],
            "source": record["source"],
            "face_count": record["face_count"],
            "processing_ms": record["processing_ms"],
            "image": {"width": record["width"], "height": record["height"]},
            "model": record["model"],
            "faces": record["faces"],
            "created_at": record["created_at"],
            "image_url": f"{base}/image",
            "thumbnail_url": f"{base}/thumbnail",
            "download_url": f"{base}/download",
        }

    # ------------------------------------------------------------- routes
    @api.get("/health")
    def health():
        return jsonify({"status": "ok", "models": list(MODELS), "max_upload_mb": app.config["MAX_UPLOAD_MB"]})

    @api.post("/detect")
    def detect_and_save():
        """Detect faces in an uploaded photo, draw boxes, save to history."""
        started = time.perf_counter()
        image, filename = read_image_upload(request.files.get("image"), app.config)
        params = parse_detection_params(request.form)
        source = request.form.get("source", "upload")
        if source not in SOURCES:
            source = "upload"

        faces, detect_ms = detector.detect(image, **params)
        annotated = draw_faces(image, faces)
        image_file, thumb_file = save_images(annotated)

        height, width = image.shape[:2]
        enriched, stats = face_summary(faces, width, height)
        record_id = store.add(
            filename=filename, source=source, face_count=len(faces), processing_ms=detect_ms,
            width=width, height=height, model=params["model"], faces=enriched,
            image_file=image_file, thumb_file=thumb_file,
        )
        remove_files(store.prune(app.config["MAX_HISTORY"]))

        result = serialize(store.get(record_id))
        result["stats"] = stats
        result["total_ms"] = round((time.perf_counter() - started) * 1000, 1)
        return jsonify(result), 201

    @api.post("/detect-frame")
    def detect_frame():
        """Lightweight endpoint for the webcam loop: boxes only, nothing is saved."""
        image, _ = read_image_upload(request.files.get("frame"), app.config)
        params = parse_detection_params(request.form)
        faces, detect_ms = detector.detect(image, **params)
        height, width = image.shape[:2]
        return jsonify({
            "face_count": len(faces),
            "faces": faces,
            "processing_ms": round(detect_ms, 2),
            "frame": {"width": width, "height": height},
        })

    @api.get("/history")
    def list_history():
        try:
            limit = max(1, min(int(request.args.get("limit", 20)), 100))
        except ValueError:
            raise ValidationError("invalid_setting", "'limit' must be a whole number.")
        return jsonify({"items": [serialize(r) for r in store.list(limit)]})

    def get_or_404(detection_id):
        record = store.get(detection_id)
        if record is None:
            raise ValidationError("not_found", "That detection no longer exists.", 404)
        return record

    @api.get("/history/<int:detection_id>/image")
    def history_image(detection_id):
        record = get_or_404(detection_id)
        return send_file(processed_dir / record["image_file"], mimetype="image/jpeg", max_age=3600)

    @api.get("/history/<int:detection_id>/thumbnail")
    def history_thumbnail(detection_id):
        record = get_or_404(detection_id)
        return send_file(processed_dir / record["thumb_file"], mimetype="image/jpeg", max_age=3600)

    @api.get("/history/<int:detection_id>/download")
    def history_download(detection_id):
        record = get_or_404(detection_id)
        stem = secure_filename(Path(record["filename"]).stem) or "image"
        return send_file(
            processed_dir / record["image_file"], mimetype="image/jpeg",
            as_attachment=True, download_name=f"{stem}_faces.jpg",
        )

    @api.delete("/history/<int:detection_id>")
    def delete_history_item(detection_id):
        get_or_404(detection_id)
        remove_files([store.delete(detection_id)])
        return jsonify({"deleted": detection_id})

    @api.delete("/history")
    def clear_history():
        removed = store.clear()
        remove_files(removed)
        return jsonify({"deleted": len(removed)})

    @api.get("/stats")
    def stats():
        return jsonify(store.stats())

    app.register_blueprint(api)

    # ---------------------------------------------------- error handling
    @app.errorhandler(ValidationError)
    def handle_validation_error(exc):
        return error(exc.code, exc.message, exc.status)

    @app.errorhandler(HTTPException)
    def handle_http_error(exc):
        if exc.code == 413:
            return error("too_large", f"Image is too large. The limit is {app.config['MAX_UPLOAD_MB']} MB.", 413)
        return error(exc.name.lower().replace(" ", "_"), exc.description, exc.code)

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc):
        app.logger.exception("Unhandled error")
        return error("server_error", "Something went wrong on the server. Please try again.", 500)

    # ----------------------------- optional: serve the built React app
    dist = Path(app.config["FRONTEND_DIST"])

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path):
        if path.startswith("api/"):
            return error("not_found", "Unknown API endpoint.", 404)
        if (dist / "index.html").exists():
            if path and (dist / path).is_file():
                return send_from_directory(dist, path)
            return send_from_directory(dist, "index.html")
        return jsonify({
            "message": "FaceVision AI API is running. Start the React app with 'npm run dev' "
                       "(frontend folder), or run 'npm run build' and reload this page.",
        })

    return app


if __name__ == "__main__":
    application = create_app()
    print(f"FaceVision AI API running at http://{Config.HOST}:{Config.PORT}")
    application.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG, threaded=True)
