import { formatMs, pluralize, summarizeFaces } from "../lib/format";

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export default function ResultSummary({ result }) {
  const { faces } = result;
  const { coverage, avgSize } = summarizeFaces(faces);
  const count = result.face_count;

  return (
    <section className="panel p-4" aria-label="Detection results" data-testid="result-summary">
      <div className="flex items-end gap-3">
        <span className="text-5xl font-semibold leading-none tabular-nums" data-testid="face-count">{count}</span>
        <span className="pb-1 text-sm text-muted">{count === 1 ? "face found" : "faces found"}</span>
      </div>
      {count === 0 && (
        <p className="mt-3 text-sm text-muted">
          No faces detected. Try lowering Strictness or the Smallest face size, or use a photo where faces look straight at the camera.
        </p>
      )}

      <dl className="mt-4 divide-y divide-line border-t border-line">
        <Row label="Detection time" value={formatMs(result.processing_ms)} />
        <Row label="Image size" value={`${result.image.width} × ${result.image.height}`} />
        <Row label="Model" value={result.model === "alt2" ? "Strict" : "Balanced"} />
        {count > 0 && <Row label="Average face width" value={`${avgSize} px`} />}
        {count > 0 && <Row label="Area covered by faces" value={`${coverage}%`} />}
      </dl>

      {count > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold">{pluralize(count, "face")}, left to right</h4>
          <ul className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {faces.map((f, i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg bg-ink px-3 py-2 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-detect text-xs font-bold text-[#14100c]">{i + 1}</span>
                <span className="tabular-nums">{f.width} × {f.height} px</span>
                <span className="ml-auto text-xs text-muted tabular-nums">at {f.x}, {f.y}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
