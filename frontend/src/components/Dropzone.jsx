import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { MAX_UPLOAD_MB } from "../lib/validate";

export default function Dropzone({ onFile, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-6 py-12 text-center transition-colors md:min-h-[440px] ${
        dragging ? "border-detect bg-detect/5" : "border-line"
      }`}
    >
      <ImagePlus className={`h-10 w-10 ${dragging ? "text-detect" : "text-muted"}`} aria-hidden />
      <div>
        <p className="text-lg font-semibold">Drop a photo here</p>
        <p className="mt-1 text-sm text-muted">
          JPG, PNG, BMP or WebP, up to {MAX_UPLOAD_MB} MB
        </p>
      </div>
      <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        Choose a photo
      </button>
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept="image/jpeg,image/png,image/bmp,image/webp,.jpg,.jpeg,.png,.bmp,.webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allows choosing the same file twice
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
