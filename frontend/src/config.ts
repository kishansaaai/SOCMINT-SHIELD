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


import { OfficerProfile } from "./types";

export const getOfficerProfile = (): OfficerProfile => {
  try {
    const data = localStorage.getItem("officer_profile");
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to parse officer profile from localStorage", e);
  }
  return { name: "", badge: "", station: "", saved: false };
};

export const saveOfficerProfile = (profile: OfficerProfile): void => {
  try {
    localStorage.setItem("officer_profile", JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save officer profile to localStorage", e);
  }
};

export function formatApiError(err: any, apiBase: string = API_BASE): string {
  const msg = err?.message || String(err);
  if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("fetch")) {
    return `Cannot reach backend at ${apiBase}. Start it with: cd backend && python -m uvicorn main:app --port 8000`;
  }
  return msg;
}

