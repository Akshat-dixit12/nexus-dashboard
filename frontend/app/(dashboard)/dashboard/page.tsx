'use client';

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/hooks/useUser";

interface DailyAnalytics {
  date: string;
  count: number;
}

interface ActivityItem {
  id: string;
  action: string;
  metadata?: any;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [usersRes, analyticsRes, activityRes] = await Promise.all([
          api.get("/users"),
          api.get("/analytics/activity"),
          api.get("/activity"),
        ]);
        setTotalUsers(usersRes.data.length);
        setAnalytics(analyticsRes.data);
        setActivities(activityRes.data);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatActivityMessage = (act: ActivityItem) => {
    switch (act.action) {
      case "user.login":
        return `User logged in`;
      case "user.invited":
        return `Invited ${act.metadata?.invited_email || "a new user"} as ${act.metadata?.role || "member"}`;
      case "plan.upgraded":
        return `Subscription upgraded to ${act.metadata?.new_plan?.toUpperCase() || "PRO"}`;
      case "role.updated":
        return `User role updated`;
      default:
        return act.action;
    }
  };

  const maxCount = Math.max(...analytics.map((a) => a.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Dashboard Overview</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>Welcome back, {user?.name || user?.email}</p>
      </div>

      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Total Team Members</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>{loading ? "..." : totalUsers}</div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Subscription Plan</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#38bdf8', textTransform: 'capitalize' }}>
            {user?.tenant?.plan || "Free"}
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Member Since</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }} suppressHydrationWarning>
            {user?.tenant?.created_at ? new Date(user.tenant.created_at).toLocaleDateString() : "-"}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        {/* 30-Day Activity Chart */}
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Activity (Last 30 Days)</h3>
          {loading ? (
            <div>Loading analytics chart...</div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px', paddingBottom: '8px', borderBottom: '1px solid #334155' }}>
                {analytics.map((item, idx) => {
                  const heightPct = (item.count / maxCount) * 100;
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} title={`${item.date}: ${item.count} events`}>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(heightPct, 4)}%`,
                          backgroundColor: item.count > 0 ? '#3b82f6' : '#334155',
                          borderRadius: '2px 2px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                <span>{analytics[0]?.date}</span>
                <span>{analytics[analytics.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity Log */}
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Recent Activity Log</h3>
          {loading ? (
            <div>Loading activity log...</div>
          ) : activities.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>No recent activity recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.map((act) => (
                <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '14px', color: '#f8fafc' }}>
                    {formatActivityMessage(act)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }} suppressHydrationWarning>
                    {new Date(act.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
