import { useEffect, useRef, useState } from "react";
import { Camera, Download, Loader2, Video, VideoOff } from "lucide-react";
import { api } from "../api/client";
import { useWebcam } from "../hooks/useWebcam";
import { drawFaces } from "../lib/draw";
import { formatMs } from "../lib/format";
import DetectionSettings from "./DetectionSettings";
import ErrorBanner from "./ErrorBanner";
import Frame from "./Frame";

const EMPTY_METRICS = { faces: 0, detectMs: null, latencyMs: null, fps: 0, peak: 0, frames: 0 };

function Metric({ label, value, testId, wide = false }) {
  return (
    <div className={`px-4 py-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums" data-testid={testId}>{value}</dd>
    </div>
  );
}

export default function WebcamPanel({ settings, onSettingsChange, onSaved, onOpenResult }) {
  const { videoRef, status, error, start, stop } = useWebcam();
  const overlayRef = useRef(null);
  const lastResult = useRef(null);
  const settingsRef = useRef(settings);
  const [aspect, setAspect] = useState(16 / 9);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [liveError, setLiveError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snapError, setSnapError] = useState(null);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Paint the latest detection over the (mirrored) video.
  function paintOverlay() {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const width = video.clientWidth;
    const height = video.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const result = lastResult.current;
    if (!result) return;
    const sx = width / result.frame.width;
    const sy = height / result.frame.height;
    const rects = result.faces
      .map((f) => ({ x: width - (f.x + f.width) * sx, y: f.y * sy, width: f.width * sx, height: f.height * sy })) // mirrored
      .sort((a, b) => a.x - b.x);
    drawFaces(ctx, rects);
  }

  // Redraw when the window size changes.
  useEffect(() => {
    window.addEventListener("resize", paintOverlay);
    return () => window.removeEventListener("resize", paintOverlay);
  });

  // The detection loop: grab a frame, ask the server, draw, repeat.
  useEffect(() => {
    if (status !== "active") return undefined;

    let stopped = false;
    let timer;
    let failures = 0;
    const controller = new AbortController();
    const scratch = document.createElement("canvas");
    const finishTimes = [];
    setMetrics(EMPTY_METRICS);
    lastResult.current = null;

    const loop = async () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth) {
        const scale = Math.min(1, 640 / video.videoWidth); // small frames = fast round trips
        scratch.width = Math.round(video.videoWidth * scale);
        scratch.height = Math.round(video.videoHeight * scale);
        scratch.getContext("2d").drawImage(video, 0, 0, scratch.width, scratch.height);
        const blob = await new Promise((resolve) => scratch.toBlob(resolve, "image/jpeg", 0.7));
        if (stopped || !blob) return;

        const sentAt = performance.now();
        try {
          const result = await api.detectFrame(blob, settingsRef.current, controller.signal);
          if (stopped) return;
          const now = performance.now();
          finishTimes.push(now);
          if (finishTimes.length > 10) finishTimes.shift();
          const span = finishTimes[finishTimes.length - 1] - finishTimes[0];
          const fps = finishTimes.length > 1 ? ((finishTimes.length - 1) / span) * 1000 : 0;

          lastResult.current = result;
          paintOverlay();
          failures = 0;
          setLiveError(null);
          setMetrics((m) => ({
            faces: result.face_count,
            detectMs: result.processing_ms,
            latencyMs: now - sentAt,
            fps,
            peak: Math.max(m.peak, result.face_count),
            frames: m.frames + 1,
          }));
        } catch (err) {
          if (stopped || err.name === "AbortError") return;
          failures += 1;
          setLiveError(err.message);
          await new Promise((resolve) => setTimeout(resolve, Math.min(3000, 500 * failures)));
        }
      }
      if (!stopped) timer = setTimeout(loop, 30);
    };
    loop();

    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      lastResult.current = null;
      paintOverlay();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function takeSnapshot() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    setSaving(true);
    setSnapError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      const file = new File([blob], "webcam-snapshot.jpg", { type: "image/jpeg" });
      setSnapshot(await api.detect(file, settingsRef.current, "webcam"));
      onSaved();
    } catch (err) {
      setSnapError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const active = status === "active";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {status === "error" && <ErrorBanner title={error.title} message={error.message} />}
        {liveError && active && <ErrorBanner title="Lost contact with the server" message={liveError} />}
        <ErrorBanner title="Couldn't save the snapshot" message={snapError} onDismiss={() => setSnapError(null)} />

        <Frame locked={active && metrics.faces > 0}>
          <div
            className="relative mx-auto overflow-hidden rounded-lg bg-ink"
            style={{ aspectRatio: aspect, width: `min(100%, ${70 * aspect}vh)` }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              data-testid="webcam-video"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
              }}
              className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
            />
            <canvas ref={overlayRef} data-testid="webcam-overlay" className="pointer-events-none absolute inset-0 h-full w-full" />

            {!active && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <div className="max-w-sm space-y-4">
                  {status === "requesting" ? (
                    <>
                      <Loader2 className="mx-auto h-9 w-9 animate-spin text-accent" aria-hidden />
                      <p className="font-semibold">Waiting for camera permission…</p>
                      <p className="text-sm text-muted">Choose “Allow” in your browser's prompt.</p>
                    </>
                  ) : (
                    <>
                      <VideoOff className="mx-auto h-10 w-10 text-muted" aria-hidden />
                      <div>
                        <p className="text-lg font-semibold">Camera is off</p>
                        <p className="mt-1 text-sm text-muted">
                          Video is analysed by your own server and is never saved unless you take a snapshot.
                        </p>
                      </div>
                      <button className="btn btn-primary" onClick={start} data-testid="start-camera">
                        <Video className="h-4 w-4" aria-hidden /> Start camera
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </Frame>

        {active && (
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={takeSnapshot} disabled={saving} data-testid="snapshot-btn">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
              Take snapshot
            </button>
            <button className="btn btn-secondary" onClick={stop} data-testid="stop-camera">
              <VideoOff className="h-4 w-4" aria-hidden /> Stop camera
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <section className="panel" aria-label="Live statistics">
          <div className="flex items-end gap-3 p-4 pb-3">
            <span className="text-5xl font-semibold leading-none tabular-nums" data-testid="live-faces">{active ? metrics.faces : 0}</span>
            <span className="pb-1 text-sm text-muted">{metrics.faces === 1 ? "face in view" : "faces in view"}</span>
          </div>
          <dl className="grid grid-cols-2 border-t border-line [&>div]:border-b [&>div]:border-line [&>div:nth-child(even)]:border-l [&>div:last-child]:border-b-0">
            <Metric label="Detection time" value={formatMs(metrics.detectMs)} testId="live-detect-ms" />
            <Metric label="Round trip" value={formatMs(metrics.latencyMs)} />
            <Metric label="Frames per second" value={metrics.fps ? metrics.fps.toFixed(1) : "–"} />
            <Metric label="Most at once" value={metrics.peak} />
            <Metric label="Frames analysed" value={metrics.frames} testId="live-frames" wide />
          </dl>
        </section>

        {snapshot && (
          <section className="panel p-4" aria-label="Latest snapshot" data-testid="snapshot-card">
            <img src={snapshot.thumbnail_url} alt="Latest snapshot with faces outlined" className="w-full rounded-lg" />
            <p className="mt-3 text-sm">
              Saved with <strong className="tabular-nums">{snapshot.face_count}</strong> {snapshot.face_count === 1 ? "face" : "faces"} found.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={snapshot.download_url} download className="btn btn-secondary px-3 py-2">
                <Download className="h-4 w-4" aria-hidden /> Download
              </a>
              <button className="btn btn-ghost px-3 py-2" onClick={() => onOpenResult(snapshot)}>Open in viewer</button>
            </div>
          </section>
        )}

        <DetectionSettings settings={settings} onChange={onSettingsChange} />
      </div>
    </div>
  );
}
