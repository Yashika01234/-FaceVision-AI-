import { Camera, Download, ImagePlus, Trash2, Upload } from "lucide-react";
import { formatMs, pluralize, timeAgo } from "../lib/format";

export default function HistoryPanel({ items, loading, onOpen, onDelete, onClear, onGoUpload }) {
  if (!loading && items.length === 0) {
    return (
      <div className="panel grid min-h-[320px] place-items-center p-8 text-center">
        <div className="max-w-sm space-y-4">
          <ImagePlus className="mx-auto h-10 w-10 text-muted" aria-hidden />
          <div>
            <p className="text-lg font-semibold">No detections yet</p>
            <p className="mt-1 text-sm text-muted">Upload a photo or take a snapshot with the camera. Your most recent scans will appear here.</p>
          </div>
          <button className="btn btn-primary" onClick={onGoUpload}>Upload a photo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{pluralize(items.length, "saved scan")}, newest first</p>
        <button className="btn btn-danger px-3 py-2" onClick={onClear} data-testid="clear-history">
          <Trash2 className="h-4 w-4" aria-hidden /> Clear all
        </button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" data-testid="history-list">
        {items.map((item) => (
          <li key={item.id} className="panel overflow-hidden" data-testid="history-item">
            <button onClick={() => onOpen(item)} className="group relative block w-full bg-ink" aria-label={`Open ${item.filename}`}>
              <img src={item.thumbnail_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-md bg-ink/85 px-2 py-1 text-xs font-bold tabular-nums text-detect">
                {pluralize(item.face_count, "face")}
              </span>
            </button>
            <div className="space-y-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={item.filename}>{item.filename}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  {item.source === "webcam" ? <Camera className="h-3.5 w-3.5" aria-label="Camera" /> : <Upload className="h-3.5 w-3.5" aria-label="Upload" />}
                  {timeAgo(item.created_at)}, {formatMs(item.processing_ms)}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1 px-3 py-2" onClick={() => onOpen(item)}>Open</button>
                <a href={item.download_url} download className="btn btn-ghost px-3 py-2" aria-label={`Download ${item.filename}`}>
                  <Download className="h-4 w-4" />
                </a>
                <button className="btn btn-ghost px-3 py-2 hover:text-danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.filename}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
