'use client';

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/hooks/useUser";

interface UserItem {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load team users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update user role");
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from your organization?`)) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove user");
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSubmitting(true);
    try {
      const res = await api.post("/users/invite", { email: inviteEmail, role: inviteRole });
      const fullUrl = `${window.location.origin}${res.data.invite_url}`;
      setInviteLink(fullUrl);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to generate invite");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const isOwner = currentUser?.role === "owner";
  const isOwnerOrAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Team Members</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>Manage user access and roles for your organization</p>
        </div>

        {isOwnerOrAdmin && (
          <button
            onClick={() => {
              setIsInviteOpen(true);
              setInviteLink(null);
              setInviteEmail("");
            }}
            style={{ padding: '10px 16px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + Invite New User
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading users...</div>
      ) : error ? (
        <div style={{ padding: '16px', backgroundColor: '#ef444422', border: '1px solid #ef4444', color: '#f87171', borderRadius: '6px' }}>{error}</div>
      ) : (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px 16px' }}>Email</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Joined Date</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px 16px' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {isOwner && u.id !== currentUser?.id ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', padding: '4px 8px' }}
                      >
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                        <option value="viewer">viewer</option>
                      </select>
                    ) : (
                      <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }} suppressHydrationWarning>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {isOwner && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#ef444422', color: '#f87171', border: '1px solid #ef4444', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '8px', color: '#fff' }}>
            <h3 style={{ marginTop: 0, fontSize: '18px' }}>Invite Team Member</h3>
            
            {inviteLink ? (
              <div>
                <p style={{ color: '#4ade80', fontSize: '14px' }}>Invite created successfully!</p>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Shareable Invite Link:</label>
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#fff', fontSize: '12px', marginTop: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    alert("Invite link copied to clipboard!");
                  }}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '8px' }}
                >
                  Copy Link
                </button>
                <button
                  onClick={() => setIsInviteOpen(false)}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                    placeholder="colleague@company.com"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px' }}>Assign Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="viewer">viewer</option>
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {inviteSubmitting ? "Generating..." : "Generate Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
