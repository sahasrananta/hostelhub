import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "./api";

const API = API_BASE;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [pending, setPending] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [notice, setNotice] = useState("");

  const token = localStorage.getItem("hostelhub_token");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("hostelhub_user") || "null");
    } catch {
      return null;
    }
  })();

  const logout = () => {
    localStorage.removeItem("hostelhub_token");
    localStorage.removeItem("hostelhub_user");
    window.dispatchEvent(new Event("hostelhub-auth-change"));
    navigate("/login", { replace: true });
  };

  const loadData = async () => {
    if (!token || user?.role !== "admin") {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [usersList, overviewData] = await Promise.all([
        fetch(`${API}/auth/users`, { headers: authHeaders(token) }).then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.message || "Could not load users");
          return d;
        }),
        fetch(`${API}/auth/admin/overview`, { headers: authHeaders(token) }).then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.message || "Could not load admin metrics");
          return d;
        }),
      ]);

      setUsers(Array.isArray(usersList) ? usersList : []);
      setOverview(overviewData || null);
      setPending(Array.isArray(overviewData?.pendingHostels) ? overviewData.pendingHostels : []);
      setHostels(Array.isArray(overviewData?.allHostels) ? overviewData.allHostels : []);
      setComplaints(Array.isArray(overviewData?.complaints) ? overviewData.complaints : []);
      setAuditLogs(Array.isArray(overviewData?.auditLogs) ? overviewData.auditLogs : []);
    } catch (e) {
      setError(e.message || "Could not load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [navigate, token, user?.role]);

  const toggleUser = async (id, active) => {
    try {
      const r = await fetch(`${API}/auth/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ active: !active }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Could not update user");
      setUsers((current) => current.map((u) => (u.id === id ? { ...u, is_active: !active ? 1 : 0 } : u)));
      setNotice(`User ${!active ? "activated" : "deactivated"} successfully.`);
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const reviewHostel = async (id, decision) => {
    try {
      const r = await fetch(`${API}/auth/admin/hostels/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ decision }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Review failed");
      setPending((p) => p.filter((x) => x.id !== id));
      setHostels((h) => h.map((x) => (x.id === id ? { ...x, status: decision } : x)));
      setNotice(`Hostel listing ${decision}.`);
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  const updateComplaintStatus = async (id, status) => {
    try {
      const responseNote = replyText[id] || "";
      const r = await fetch(`${API}/complaints/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ status, response: responseNote }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || "Could not update complaint");
      setComplaints((current) =>
        current.map((c) => (c.id === id ? { ...c, status, response: responseNote || c.response } : c))
      );
      setNotice(`Complaint marked as ${status}.`);
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="empty">Loading admin dashboard…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container admin-page">
        <div className="page-title">
          <div>
            <div className="eyebrow">ADMIN PORTAL</div>
            <h1>HostelHub Administrator</h1>
            <p>Platform monitoring, hostel approval moderation, user controls and complaints management.</p>
          </div>
          <div className="admin-actions">
            <Link className="btn btn-outline" to="/account-settings">Security Settings</Link>
            <button className="btn btn-outline" onClick={logout}>Log out</button>
          </div>
        </div>

        {notice && <div className="account-alert success">{notice}</div>}
        {error && <div className="account-alert error">{error}</div>}

        <div className="stats">
          <div className="stat">
            <span>Registered users</span>
            <strong>{overview?.users?.total ?? users.length}</strong>
            <small>Students: {overview?.users?.students ?? 0} · Owners: {overview?.users?.owners ?? 0}</small>
          </div>
          <div className="stat">
            <span>Hostel Listings</span>
            <strong>{overview?.hostelStats?.total ?? hostels.length}</strong>
            <small>Approved: {overview?.hostelStats?.approved ?? 0} · Pending: {pending.length}</small>
          </div>
          <div className="stat">
            <span>Complaints</span>
            <strong>{complaints.length}</strong>
            <small>{complaints.filter((c) => c.status === "open").length} open complaints</small>
          </div>
          <div className="stat">
            <span>Audit Logins</span>
            <strong>{overview?.logins?.total_logins ?? 0}</strong>
            <small>{overview?.logins?.unique_users ?? 0} unique users logged in</small>
          </div>
        </div>

        {/* Pending Hostel Requests */}
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h2>Pending hostel approvals ({pending.length})</h2>
          </div>
          {pending.length ? (
            pending.map((h) => (
              <div className="list-row" key={h.id}>
                <div>
                  <strong>{h.name}</strong>
                  <small>{h.city} · Requested by {h.owner_name || "Owner"} ({h.owner_email || ""})</small>
                  <p>{h.description || "No description provided."}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn btn-primary small" onClick={() => reviewHostel(h.id, "approved")}>Approve</button>
                  <button className="btn btn-outline small" onClick={() => reviewHostel(h.id, "rejected")}>Reject</button>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">No pending hostel requests waiting for approval.</p>
          )}
        </section>

        {/* All Hostels Status Moderation */}
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h2>All hostel listings ({hostels.length})</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hostel Name</th>
                  <th>Location</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map((h) => (
                  <tr key={h.id}>
                    <td><strong>{h.name}</strong></td>
                    <td>{h.city}</td>
                    <td>{h.owner_name || h.owner_email || "Owner"}</td>
                    <td>
                      <span className={`status ${h.status === "approved" ? "green" : h.status === "rejected" ? "red" : ""}`}>
                        {h.status || "pending"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {h.status !== "approved" && (
                          <button className="btn btn-primary small" onClick={() => reviewHostel(h.id, "approved")}>
                            Approve
                          </button>
                        )}
                        {h.status !== "rejected" && (
                          <button className="btn btn-outline small" onClick={() => reviewHostel(h.id, "rejected")}>
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Complaints Moderation */}
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h2>Student complaints resolution ({complaints.length})</h2>
          </div>
          {complaints.length ? (
            complaints.map((c) => (
              <div className="list-row" key={c.id} style={{ alignItems: "flex-start", paddingBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <strong>{c.title}</strong>
                  <small>
                    Hostel: <em>{c.hostel_name}</em> · Student: <strong>{c.student_name}</strong> ({c.student_email}) · Category: {c.category}
                  </small>
                  <p style={{ marginTop: 6 }}>{c.description}</p>
                  {c.response && (
                    <div style={{ background: "rgba(0,0,0,0.03)", padding: 8, borderRadius: 6, marginTop: 6, fontSize: 13 }}>
                      <strong>Response / Resolution note:</strong> {c.response}
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      className="input"
                      placeholder="Add resolution note..."
                      style={{ maxWidth: 320, padding: "4px 8px", fontSize: 13 }}
                      value={replyText[c.id] ?? ""}
                      onChange={(e) => setReplyText({ ...replyText, [c.id]: e.target.value })}
                    />
                    <button className="btn btn-outline small" onClick={() => updateComplaintStatus(c.id, "reviewing")}>
                      In Review
                    </button>
                    <button className="btn btn-primary small" onClick={() => updateComplaintStatus(c.id, "resolved")}>
                      Resolve
                    </button>
                    <button className="btn btn-outline small" onClick={() => updateComplaintStatus(c.id, "closed")}>
                      Close
                    </button>
                  </div>
                </div>
                <span className={`status ${c.status === "resolved" ? "green" : c.status === "reviewing" ? "yellow" : ""}`}>
                  {c.status}
                </span>
              </div>
            ))
          ) : (
            <p className="muted">No student complaints recorded.</p>
          )}
        </section>

        {/* User Management */}
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h2>User account management ({users.length})</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="account-role">{u.role}</span></td>
                    <td>{u.is_active === 0 ? "Inactive" : "Active"}</td>
                    <td>
                      {u.id === user?.id ? (
                        <span className="muted-text">Current admin</span>
                      ) : (
                        <button className="btn btn-outline small" onClick={() => toggleUser(u.id, u.is_active !== 0)}>
                          {u.is_active === 0 ? "Reactivate" : "Deactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit Trail: Recent Login Events */}
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <h2>Audit trail: Recent login events</h2>
          </div>
          {auditLogs.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.email}</td>
                      <td><span className="account-role">{log.role}</span></td>
                      <td>{log.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No login events recorded yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
