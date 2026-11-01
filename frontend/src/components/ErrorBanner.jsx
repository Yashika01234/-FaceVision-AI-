import { AlertTriangle, X } from "lucide-react";

export default function ErrorBanner({ title, message, onDismiss }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-fg">{title}</p>}
        <p className="text-fg/80">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="btn-ghost rounded-md p-1" aria-label="Dismiss message">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
