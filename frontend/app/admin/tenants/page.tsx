'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  stripe_customer_id?: string;
  created_at: string;
}

export default function SuperadminTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/tenants");
      setTenants(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load system tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handlePlanChange = async (tenantId: string, newPlan: string) => {
    try {
      await api.patch(`/admin/tenants/${tenantId}/plan`, { plan: newPlan });
      fetchTenants();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update tenant plan");
    }
  };

  const handleImpersonate = async (tenantId: string) => {
    try {
      const res = await api.get(`/admin/tenants/${tenantId}/impersonate`);
      if (res.data.access_token) {
        setAccessToken(res.data.access_token);
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to view tenant dashboard");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171', margin: 0 }}>Superadmin Console</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>System-wide multi-tenant management and control panel</p>
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading all system tenants...</div>
      ) : error ? (
        <div style={{ padding: '16px', backgroundColor: '#ef444422', border: '1px solid #ef4444', color: '#f87171', borderRadius: '6px' }}>{error}</div>
      ) : (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px 16px' }}>Tenant Name</th>
                <th style={{ padding: '12px 16px' }}>Slug</th>
                <th style={{ padding: '12px 16px' }}>Plan</th>
                <th style={{ padding: '12px 16px' }}>Created At</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{t.name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{t.slug}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={t.plan}
                      onChange={(e) => handlePlanChange(t.id, e.target.value)}
                      style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', padding: '4px 8px' }}
                    >
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }} suppressHydrationWarning>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleImpersonate(t.id)}
                      style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#3b82f622', color: '#60a5fa', border: '1px solid #3b82f6', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      View Dashboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
