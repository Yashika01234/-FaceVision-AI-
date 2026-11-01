const MODELS = [
  { value: "default", label: "Balanced", hint: "Finds more faces" },
  { value: "alt2", label: "Strict", hint: "Fewer false alarms" },
];

export const DEFAULT_SETTINGS = { model: "default", minNeighbors: 5, minSize: 30 };

export default function DetectionSettings({ settings, onChange, disabled = false }) {
  const set = (patch) => onChange({ ...settings, ...patch });

  return (
    <section className="panel space-y-5 p-4" aria-label="Detection settings">
      <h3 className="text-sm font-semibold">Detection settings</h3>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="mb-2 text-sm text-muted">Model</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-ink p-1">
          {MODELS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => set({ model: m.value })}
              aria-pressed={settings.model === m.value}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                settings.model === m.value ? "bg-raised text-fg" : "text-muted hover:text-fg"
              }`}
            >
              <span className="block font-semibold">{m.label}</span>
              <span className="block text-xs text-muted">{m.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <label htmlFor="strictness" className="text-muted">Strictness</label>
          <span className="tabular-nums">{settings.minNeighbors}</span>
        </div>
        <input
          id="strictness" type="range" min="1" max="10" step="1" disabled={disabled}
          value={settings.minNeighbors}
          onChange={(e) => set({ minNeighbors: Number(e.target.value) })}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted">Lower finds more faces but may mark things that aren't faces.</p>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <label htmlFor="min-size" className="text-muted">Smallest face</label>
          <span className="tabular-nums">{settings.minSize} px</span>
        </div>
        <input
          id="min-size" type="range" min="20" max="200" step="5" disabled={disabled}
          value={settings.minSize}
          onChange={(e) => set({ minSize: Number(e.target.value) })}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted">Ignore faces narrower than this. Raise it to skip tiny background faces.</p>
      </div>
    </section>
  );
}
