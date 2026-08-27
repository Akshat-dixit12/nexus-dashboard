import { useState, useEffect } from "react";
import { api } from "../api";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenant_id?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    created_at?: string;
  };
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await api.get("/me");
      setUser(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return { user, loading, error, refetch: fetchUser };
}
