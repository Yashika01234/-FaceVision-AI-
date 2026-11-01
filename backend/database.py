"""SQLite storage for detection history (standard library only)."""
import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS detections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    filename      TEXT    NOT NULL,
    source        TEXT    NOT NULL DEFAULT 'upload',
    face_count    INTEGER NOT NULL,
    processing_ms REAL    NOT NULL,
    width         INTEGER NOT NULL,
    height        INTEGER NOT NULL,
    model         TEXT    NOT NULL,
    faces_json    TEXT    NOT NULL,
    image_file    TEXT    NOT NULL,
    thumb_file    TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
);
"""


class HistoryStore:
    def __init__(self, db_path):
        self.db_path = str(db_path)
        with closing(self._connect()) as conn, conn:
            conn.executescript(SCHEMA)

    def _connect(self):
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def _to_dict(row):
        item = dict(row)
        item["faces"] = json.loads(item.pop("faces_json"))
        return item

    def add(self, *, filename, source, face_count, processing_ms, width, height,
            model, faces, image_file, thumb_file):
        created_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        with closing(self._connect()) as conn, conn:
            cursor = conn.execute(
                """INSERT INTO detections
                   (filename, source, face_count, processing_ms, width, height,
                    model, faces_json, image_file, thumb_file, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (filename, source, face_count, round(processing_ms, 2), width, height,
                 model, json.dumps(faces), image_file, thumb_file, created_at),
            )
            return cursor.lastrowid

    def get(self, detection_id):
        with closing(self._connect()) as conn:
            row = conn.execute("SELECT * FROM detections WHERE id = ?", (detection_id,)).fetchone()
        return self._to_dict(row) if row else None

    def list(self, limit=20):
        with closing(self._connect()) as conn:
            rows = conn.execute("SELECT * FROM detections ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [self._to_dict(r) for r in rows]

    def delete(self, detection_id):
        """Delete one record; returns it so the caller can remove its files."""
        item = self.get(detection_id)
        if item:
            with closing(self._connect()) as conn, conn:
                conn.execute("DELETE FROM detections WHERE id = ?", (detection_id,))
        return item

    def clear(self):
        items = self.list(limit=1_000_000)
        with closing(self._connect()) as conn, conn:
            conn.execute("DELETE FROM detections")
        return items

    def prune(self, keep):
        """Keep only the newest ``keep`` records; returns the removed ones."""
        with closing(self._connect()) as conn:
            rows = conn.execute(
                "SELECT * FROM detections ORDER BY id DESC LIMIT -1 OFFSET ?", (keep,)
            ).fetchall()
        removed = [self._to_dict(r) for r in rows]
        if removed:
            with closing(self._connect()) as conn, conn:
                conn.executemany("DELETE FROM detections WHERE id = ?", [(r["id"],) for r in removed])
        return removed

    def stats(self):
        with closing(self._connect()) as conn:
            row = conn.execute(
                """SELECT COUNT(*)                       AS total_scans,
                          COALESCE(SUM(face_count), 0)   AS total_faces,
                          COALESCE(AVG(processing_ms),0) AS avg_processing_ms,
                          COALESCE(MAX(face_count), 0)   AS max_faces,
                          COALESCE(SUM(source='webcam'), 0) AS webcam_scans
                   FROM detections"""
            ).fetchone()
        stats = dict(row)
        stats["avg_processing_ms"] = round(stats["avg_processing_ms"], 1)
        stats["upload_scans"] = stats["total_scans"] - stats["webcam_scans"]
        return stats
