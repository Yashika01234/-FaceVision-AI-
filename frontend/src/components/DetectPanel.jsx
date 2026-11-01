import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, RotateCw } from "lucide-react";
import { api } from "../api/client";
import { validateImageFile } from "../lib/validate";
import Dropzone from "./Dropzone";
import ErrorBanner from "./ErrorBanner";
import Frame from "./Frame";
import DetectionSettings from "./DetectionSettings";
import ResultSummary from "./ResultSummary";

export default function DetectPanel({ settings, onSettingsChange, result, onResult, onSaved }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRunSettings, setLastRunSettings] = useState(null);
  const requestId = useRef(0); // ignores answers from outdated requests

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  async function run(imageFile, runSettings, { resetOnError = false } = {}) {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api.detect(imageFile, runSettings, "upload");
      if (id !== requestId.current) return;
      onResult(data);
      setLastRunSettings(JSON.stringify(runSettings));
      onSaved();
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message);
      if (resetOnError) {
        // Nothing useful to show (for example a corrupted file): go back to the dropzone.
        setFile(null);
        setPreviewUrl(null);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function handleFile(chosen) {
    const problem = validateImageFile(chosen);
    if (problem) {
      setError(problem);
      return;
    }
    setFile(chosen);
    setPreviewUrl(URL.createObjectURL(chosen));
    onResult(null);
    run(chosen, settings, { resetOnError: true });
  }

  function reset() {
    requestId.current++;
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setLoading(false);
    onResult(null);
  }

  const settingsChanged = file && lastRunSettings && JSON.stringify(settings) !== lastRunSettings;
  const shownImage = result ? result.image_url : previewUrl;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <ErrorBanner title="Couldn't process that image" message={error} onDismiss={() => setError(null)} />

        <Frame locked={Boolean(result && result.face_count > 0)}>
          {!shownImage ? (
            <Dropzone onFile={handleFile} disabled={loading} />
          ) : (
            <div className="relative grid min-h-[200px] place-items-center rounded-lg bg-ink/70">
              <img
                src={shownImage}
                alt={result ? `Photo with ${result.face_count} detected faces outlined` : "Selected photo"}
                data-testid="result-image"
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
              />
              {loading && (
                <div className="absolute inset-0 grid place-items-center rounded-lg bg-ink/70" role="status">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Loader2 className="h-5 w-5 animate-spin text-detect" aria-hidden /> Detecting faces…
                  </p>
                </div>
              )}
            </div>
          )}
        </Frame>

        {shownImage && (
          <div className="flex flex-wrap gap-3">
            {result && (
              <a href={result.download_url} download className="btn btn-primary" data-testid="download-btn">
                <Download className="h-4 w-4" aria-hidden /> Download processed image
              </a>
            )}
            {settingsChanged && !loading && (
              <button className="btn btn-secondary" onClick={() => run(file, settings)}>
                <RotateCw className="h-4 w-4" aria-hidden /> Run again with new settings
              </button>
            )}
            <button className="btn btn-ghost" onClick={reset} disabled={loading}>
              <ImagePlus className="h-4 w-4" aria-hidden /> Choose another photo
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {result && <ResultSummary result={result} />}
        <DetectionSettings settings={settings} onChange={onSettingsChange} disabled={loading} />
      </div>
    </div>
  );
}
