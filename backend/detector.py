"""Face detection with OpenCV Haar cascades.

Haar cascades ship inside the opencv-python package, so there is nothing to
download. Two trained models are exposed:

* "default" - haarcascade_frontalface_default (fast, finds more faces)
* "alt2"    - haarcascade_frontalface_alt2    (stricter, fewer false alarms)
"""
import threading
import time

import cv2

MODELS = {
    "default": "haarcascade_frontalface_default.xml",
    "alt2": "haarcascade_frontalface_alt2.xml",
}

# Bounding-box colour in BGR (OpenCV order). This is amber: #FFB547.
BOX_COLOR = (71, 181, 255)
LABEL_TEXT_COLOR = (20, 16, 12)


class FaceDetector:
    """Loads the cascades once and detects faces in BGR images."""

    def __init__(self, max_detect_side=1600):
        self.max_detect_side = max_detect_side
        self._lock = threading.Lock()  # CascadeClassifier is not thread-safe
        self._cascades = {}
        for key, filename in MODELS.items():
            cascade = cv2.CascadeClassifier(cv2.data.haarcascades + filename)
            if cascade.empty():
                raise RuntimeError(f"Could not load OpenCV cascade '{filename}'")
            self._cascades[key] = cascade

    def detect(self, image, model="default", scale_factor=1.1, min_neighbors=5, min_size=30):
        """Return ``(faces, milliseconds)``.

        ``faces`` is a list of dicts with x, y, width, height in the
        coordinates of the *original* image, ordered left to right.
        """
        started = time.perf_counter()
        height, width = image.shape[:2]

        # Big photos are shrunk before detection; boxes are scaled back after.
        scale = 1.0
        longest = max(height, width)
        working = image
        if longest > self.max_detect_side:
            scale = self.max_detect_side / longest
            working = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

        gray = cv2.cvtColor(working, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)  # evens out lighting, helps in dim rooms

        min_px = max(1, int(round(min_size * scale)))
        with self._lock:
            rects = self._cascades[model].detectMultiScale(
                gray,
                scaleFactor=scale_factor,
                minNeighbors=min_neighbors,
                minSize=(min_px, min_px),
            )

        faces = []
        for x, y, w, h in rects:
            x0 = max(0, int(round(x / scale)))
            y0 = max(0, int(round(y / scale)))
            x1 = min(width, int(round((x + w) / scale)))
            y1 = min(height, int(round((y + h) / scale)))
            faces.append({"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0})
        faces.sort(key=lambda f: f["x"])

        elapsed_ms = (time.perf_counter() - started) * 1000
        return faces, elapsed_ms


def draw_faces(image, faces):
    """Return a copy of ``image`` with a bracketed box and number on each face."""
    out = image.copy()
    height, width = out.shape[:2]
    thickness = max(2, round(max(height, width) / 400))
    font_scale = max(0.5, max(height, width) / 1400)

    for index, face in enumerate(faces, start=1):
        x, y, w, h = face["x"], face["y"], face["width"], face["height"]
        arm = max(8, int(min(w, h) * 0.25))

        # Thin full outline + thick corner brackets
        cv2.rectangle(out, (x, y), (x + w, y + h), BOX_COLOR, max(1, thickness // 2))
        for cx, cy, dx, dy in (
            (x, y, 1, 1), (x + w, y, -1, 1), (x, y + h, 1, -1), (x + w, y + h, -1, -1)
        ):
            cv2.line(out, (cx, cy), (cx + dx * arm, cy), BOX_COLOR, thickness + 1, cv2.LINE_AA)
            cv2.line(out, (cx, cy), (cx, cy + dy * arm), BOX_COLOR, thickness + 1, cv2.LINE_AA)

        # Numbered tag above the box (or inside it when the box touches the top edge)
        label = str(index)
        (tw, th), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
        pad = max(4, th // 3)
        tag_w, tag_h = tw + pad * 2, th + baseline + pad
        tag_y0 = y - tag_h if y - tag_h >= 0 else y
        cv2.rectangle(out, (x, tag_y0), (x + tag_w, tag_y0 + tag_h), BOX_COLOR, -1)
        cv2.putText(
            out, label, (x + pad, tag_y0 + th + pad // 2),
            cv2.FONT_HERSHEY_SIMPLEX, font_scale, LABEL_TEXT_COLOR, thickness, cv2.LINE_AA,
        )
    return out
