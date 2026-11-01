import { useCallback, useEffect, useRef, useState } from "react";

// Turns the browser's cryptic camera errors into messages people can act on.
function describeCameraError(err) {
  switch (err?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        title: "Camera access was blocked",
        message: "Click the camera icon in your browser's address bar, allow access for this site, then try again.",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return { title: "No camera found", message: "Connect a webcam or check that your device has one, then try again." };
    case "NotReadableError":
    case "TrackStartError":
      return {
        title: "Your camera is busy",
        message: "Another app or browser tab is using the camera. Close it and try again.",
      };
    case "NotSupportedError":
      return { title: "Camera isn't supported", message: "This browser can't access a camera here. Try a current version of Chrome, Edge, Firefox or Safari." };
    case "OverconstrainedError":
      return { title: "Camera not compatible", message: "This camera can't provide the requested video size." };
    case "SecurityError":
      return { title: "Camera blocked by browser security", message: "Open the app at http://localhost:5173 or over HTTPS." };
    default:
      return { title: "Couldn't start the camera", message: err?.message || "Something went wrong. Try again." };
  }
}

/**
 * status: "idle" | "requesting" | "active" | "error"
 * Attach `videoRef` to a <video> element.
 */
export function useWebcam() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({
        title: "Camera isn't available here",
        message: "Browsers only allow camera access on localhost or HTTPS pages. Open http://localhost:5173.",
      });
      setStatus("error");
      return;
    }

    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        streamRef.current = null;
        setError({ title: "Camera disconnected", message: "The camera stopped sending video. Reconnect it and start again." });
        setStatus("error");
      });
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {}); // autoplay can be interrupted harmlessly
      setStatus("active");
    } catch (err) {
      setError(describeCameraError(err));
      setStatus("error");
    }
  }, []);

  // Always release the camera when the component goes away.
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { videoRef, status, error, start, stop };
}
