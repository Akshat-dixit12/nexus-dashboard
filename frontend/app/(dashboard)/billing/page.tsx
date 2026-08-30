'use client';

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useUser } from "@/lib/hooks/useUser";

interface BillingStatus {
  plan: string;
  renewal_date?: string;
}

function BillingContent() {
  const { user, refetch } = useUser();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      if (isSuccess || sessionId) {
        await api.post("/billing/sync", { session_id: sessionId, success: true });
        refetch();
      }
      const res = await api.get("/billing/status");
      setStatus(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [isSuccess, sessionId]);

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      const res = await api.post("/billing/checkout");
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Upgrade checkout failed");
      setUpgrading(false);
    }
  };

  const isOwner = user?.role === "owner";
  const isPro = status?.plan === "pro" || user?.tenant?.plan === "pro";

  return (
    <div style={{ maxWidth: '900px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Billing & Subscription</h2>

      {isSuccess && (
        <div style={{ backgroundColor: '#22c55e22', border: '1px solid #22c55e', color: '#4ade80', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          🎉 Thank you for upgrading! Your subscription is processing and active.
        </div>
      )}

      {/* Current Plan Card */}
      <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '32px' }}>
        <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px' }}>Current Plan</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', textTransform: 'capitalize' }}>
          {loading ? "..." : (isPro ? "Pro" : (status?.plan || "Free"))} Plan
        </div>
        {isPro && (
          <div style={{ fontSize: '14px', color: '#38bdf8', marginTop: '8px' }}>
            Renews on: {status?.renewal_date || "2026-10-09"}
          </div>
        )}
      </div>

      {/* Feature Comparison Table */}
      <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Plan Features</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: 0 }}>Free Plan</h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '12px 0' }}>$0 <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ mo</span></div>
            <ul style={{ paddingLeft: '20px', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.8' }}>
              <li>Up to 5 team members</li>
              <li>Basic activity logging</li>
              <li>Community support</li>
            </ul>
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #3b82f6' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: 0, color: '#60a5fa' }}>Pro Plan</h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '12px 0' }}>$29 <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ mo</span></div>
            <ul style={{ paddingLeft: '20px', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.8' }}>
              <li>Unlimited team members</li>
              <li>Full 30-day activity analytics</li>
              <li>Priority support & audit logs</li>
            </ul>
            
            {!isPro && isOwner && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '4px', backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {upgrading ? "Redirecting to Stripe..." : "Upgrade to Pro"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: '#94a3b8' }}>Loading billing details...</div>}>
      <BillingContent />
    </Suspense>
  );
}
