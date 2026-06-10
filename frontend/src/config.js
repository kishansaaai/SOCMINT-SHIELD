export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function formatApiError(err, apiBase = API_BASE) {
  const msg = err?.message || String(err);
  if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("fetch")) {
    return `Cannot reach backend at ${apiBase}. Start it with: cd backend && python -m uvicorn main:app --port 8000`;
  }
  return msg;
}
