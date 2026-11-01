export function formatMs(ms) {
  if (ms == null) return "–";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function timeAgo(isoString) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(isoString).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function summarizeFaces(faces) {
  const count = faces.length;
  return {
    coverage: Math.round(faces.reduce((sum, f) => sum + f.area_pct, 0) * 10) / 10,
    avgSize: count ? Math.round(faces.reduce((sum, f) => sum + f.width, 0) / count) : 0,
  };
}
