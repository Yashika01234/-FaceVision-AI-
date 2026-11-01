import { formatMs } from "../lib/format";

export default function StatsStrip({ stats }) {
  const items = [
    { label: "Saved scans", value: stats ? stats.total_scans : "–" },
    { label: "Faces found", value: stats ? stats.total_faces : "–" },
    { label: "Average detection time", value: stats ? formatMs(stats.avg_processing_ms) : "–" },
    { label: "Most faces in one scan", value: stats ? stats.max_faces : "–" },
  ];
  return (
    <dl className="panel grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
      {items.map((item, i) => (
        <div key={item.label} className={`px-5 py-4 ${i > 1 ? "border-t border-line md:border-t-0" : ""} ${i % 2 === 1 ? "border-l border-line md:border-l-0" : ""}`}>
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
