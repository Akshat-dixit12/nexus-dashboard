import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface JWTPayload {
  sub: string;
  user_id: string;
  tenant_id: string | null;
  role: string;
  exp: number;
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    document.cookie = `access_token=${accessToken}; path=/; max-age=1800; SameSite=Lax`;
  }
}

export function setAccessToken(accessToken: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", accessToken);
    document.cookie = `access_token=${accessToken}; path=/; max-age=1800; SameSite=Lax`;
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token");
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refresh_token");
  }
  return null;
}

export function clearTokens() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: new_refresh_token } = response.data;
    setTokens(access_token, new_refresh_token);
    return access_token;
  } catch (error) {
    clearTokens();
    return null;
  }
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await axios.post(`${API_URL}/auth/logout`, {
        refresh_token: refreshToken,
      });
    } catch (error) { }
  }
  clearTokens();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
