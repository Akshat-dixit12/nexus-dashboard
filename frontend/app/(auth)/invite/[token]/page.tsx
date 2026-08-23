'use client';

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface InviteDetail {
  token: string;
  email: string;
  role: string;
  tenant_name: string;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get(`/invites/${token}`)
      .then((res) => {
        setInvite(res.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Invite token is invalid or expired");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/invites/${token}/accept`, { password });
      alert("Account created successfully! Please sign in.");
      router.push("/login");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to accept invite");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '32px', backgroundColor: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>Validating invite token...</div>
        ) : error ? (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171', marginBottom: '12px' }}>Invalid Invite</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
            <a href="/login" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '14px' }}>Go to Login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>Accept Invitation</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
              You've been invited to join <strong style={{ color: '#60a5fa' }}>{invite?.tenant_name}</strong> as an <strong style={{ color: '#60a5fa' }}>{invite?.role}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                disabled
                value={invite?.email || ""}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#64748b', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px' }}>Choose Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '12px', borderRadius: '4px', backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {submitting ? "Joining..." : "Create Account & Join"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
