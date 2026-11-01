// All communication with the Flask backend lives here.
// In development Vite proxies /api to Flask (see vite.config.js).
const BASE = "/api";

export class ApiError extends Error {
  constructor(message, code = "unknown", status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(BASE + path, options);
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(
      "Can't reach the FaceVision server. Make sure the backend is running (python app.py).",
      "network"
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    let code = "http_error";
    try {
      const body = await response.json();
      if (body?.error) {
        message = body.error.message || message;
        code = body.error.code || code;
      }
    } catch {
      /* the server did not send JSON; keep the generic message */
    }
    throw new ApiError(message, code, response.status);
  }
  return response.json();
}

function settingsToForm(form, settings) {
  form.append("model", settings.model);
  form.append("min_neighbors", String(settings.minNeighbors));
  form.append("min_size", String(settings.minSize));
  return form;
}

export const api = {
  health: () => request("/health"),
  stats: () => request("/stats"),
  history: (limit = 30) => request(`/history?limit=${limit}`),

  detect(file, settings, source = "upload") {
    const form = settingsToForm(new FormData(), settings);
    form.append("image", file, file.name);
    form.append("source", source);
    return request("/detect", { method: "POST", body: form });
  },

  detectFrame(blob, settings, signal) {
    const form = settingsToForm(new FormData(), settings);
    form.append("frame", blob, "frame.jpg");
    return request("/detect-frame", { method: "POST", body: form, signal });
  },

  deleteItem: (id) => request(`/history/${id}`, { method: "DELETE" }),
  clearHistory: () => request("/history", { method: "DELETE" }),
};
