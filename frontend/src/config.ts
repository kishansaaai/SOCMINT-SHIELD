export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_KEY = import.meta.env.VITE_API_KEY || "";

export const getHeaders = (headers: Record<string, string> = {}) => {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (API_KEY) {
    h["Authorization"] = `Bearer ${API_KEY}`;
  }
  return h;
};


export function formatApiError(err: any, apiBase: string = API_BASE): string {
  const msg = err?.message || String(err);
  if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("fetch")) {
    return `Cannot reach backend at ${apiBase}. Start it with: cd backend && python -m uvicorn main:app --port 8000`;
  }
  return msg;
}

