/**
 * lib/api.ts
 *
 * Axios instance za API pozive sa klijenta.
 *
 * `api`       — zahteva Authorization header (čita token iz localStorage)
 * `publicApi` — bez autentifikacije (public rute)
 *
 * Oba instance automatski postavljaju base URL na /api.
 * Interceptor na `api` automatski dodaje Bearer token.
 */
import axios from "axios";

const BASE = "/api";

// ─── Public (bez auth) ────────────────────────────────────────────────────────
export const publicApi = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ─── Protected (sa auth token) ────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Request interceptor — automatski dodaje Bearer token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — osvežava token ako dobijemo x-new-token header
api.interceptors.response.use(
  (response) => {
    const newToken = response.headers["x-new-token"];
    if (newToken && typeof window !== "undefined") {
      localStorage.setItem("token", newToken);
    }
    return response;
  },
  async (error) => {
    // Ako dobijemo 401, pokušaj refresh tokena jednom
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined"
    ) {
      originalRequest._retry = true;
      try {
        const res = await publicApi.post<{ token: string }>("/auth/refresh");
        const newToken = res.data.token;
        localStorage.setItem("token", newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh nije uspeo — odjavi korisnika
        localStorage.removeItem("token");
        const baseDomain =
          process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
        const host = window.location.hostname;
        const isProd = host !== "localhost" && !host.startsWith("127.");
        window.location.href = isProd
          ? `https://${baseDomain}/login`
          : "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
