import { Camera, History, ScanFace } from "lucide-react";

export const TABS = [
  { id: "detect", label: "Photo detection", icon: ScanFace },
  { id: "live", label: "Live camera", icon: Camera },
  { id: "history", label: "History", icon: History },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#1a2247" />
        <path d="M6 12V8a2 2 0 0 1 2-2h4M20 6h4a2 2 0 0 1 2 2v4M26 20v4a2 2 0 0 1-2 2h-4M12 26H8a2 2 0 0 1-2-2v-4"
          fill="none" stroke="#ffb547" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3.2" fill="#7b8cff" />
      </svg>
      <span className="text-lg font-bold tracking-tight">FaceVision AI</span>
    </div>
  );
}

function ServerStatus({ online }) {
  const color = online === null ? "bg-muted" : online ? "bg-ok" : "bg-danger";
  const text = online === null ? "Checking server" : online ? "Server connected" : "Server offline";
  return (
    <p className="flex items-center gap-2 text-xs text-muted" role="status">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden />
      {text}
    </p>
  );
}

export default function Sidebar({ tab, onTabChange, online }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-panel/60 p-5 lg:flex">
        <Brand />
        <nav className="mt-10 flex flex-col gap-1" aria-label="Main">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                tab === id ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg"
              }`}
            >
              <Icon className={`h-5 w-5 ${tab === id ? "text-accent" : ""}`} aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-line pt-4">
          <ServerStatus online={online} />
          <p className="text-xs text-muted">OpenCV Haar cascades. Images stay on your machine.</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <ServerStatus online={online} />
      </header>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-panel/95 backdrop-blur lg:hidden" aria-label="Main">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${tab === id ? "text-accent" : "text-muted"}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label.replace("Photo detection", "Photo")}
          </button>
        ))}
      </nav>
    </>
  );
}
