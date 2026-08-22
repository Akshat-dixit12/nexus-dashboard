'use client';

import React, { useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import { logout } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        Loading session...
      </div>
    );
  }

  if (error || !user) {
    return null;
  }

  const isOwnerOrAdmin = user.role === "owner" || user.role === "admin";

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Nexus Dashboard</h1>
            {user.tenant && (
              <span style={{ fontSize: '11px', backgroundColor: '#3b82f633', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                {user.tenant.name} ({user.tenant.plan.toUpperCase()})
              </span>
            )}

            <nav style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
              <Link href="/dashboard" style={{ color: '#e2e8f0', textDecoration: 'none' }}>Overview</Link>
              <Link href="/users" style={{ color: '#e2e8f0', textDecoration: 'none' }}>Team Users</Link>
              <Link href="/billing" style={{ color: '#e2e8f0', textDecoration: 'none' }}>Billing</Link>
              {user.role === "superadmin" && (
                <Link href="/admin/tenants" style={{ color: '#f87171', textDecoration: 'none', fontWeight: 'bold' }}>Admin</Link>
              )}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isOwnerOrAdmin && (
              <Link
                href="/users"
                style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
              >
                + Invite User
              </Link>
            )}

            <span style={{ fontSize: '14px', color: '#94a3b8' }}>
              {user.name || user.email} ({user.role})
            </span>

            <button
              onClick={logout}
              style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
