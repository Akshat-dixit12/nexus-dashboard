import axios from "axios";
import { getAccessToken, refreshAccessToken, clearTokens } from "./auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        clearTokens();
        const publicPaths = ["/login", "/register", "/invite"];
        const isPublicPage = typeof window !== "undefined" && publicPaths.some(p => window.location.pathname.startsWith(p));
        if (typeof window !== "undefined" && !isPublicPage) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
