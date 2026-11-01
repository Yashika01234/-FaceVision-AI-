// Quick checks in the browser so people get instant feedback.
// The server repeats every check, so these are a convenience, not security.
export const MAX_UPLOAD_MB = 10;
const ALLOWED = ["jpg", "jpeg", "png", "bmp", "webp"];

export function validateImageFile(file) {
  if (!file) return "No file selected.";
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  if (!ALLOWED.includes(extension) || (file.type && !file.type.startsWith("image/"))) {
    return "That file type isn't supported. Choose a JPG, PNG, BMP or WebP image.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `That image is larger than ${MAX_UPLOAD_MB} MB. Choose a smaller one.`;
  }
  return null;
}
