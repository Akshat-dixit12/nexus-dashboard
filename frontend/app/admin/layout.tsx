'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/tenants")
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        // If 403 or unauthorized, block access and redirect away
        router.push("/dashboard");
      });
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        Verifying Superadmin Privileges...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: '#1e293b', borderBottom: '1px solid #ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#f87171' }}>Nexus Superadmin Panel</h1>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#334155', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px' }}
        >
          Exit Admin
        </button>
      </header>

      <main style={{ padding: '32px' }}>
        {children}
      </main>
    </div>
  );
}
