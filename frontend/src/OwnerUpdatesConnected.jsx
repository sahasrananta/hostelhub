import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Plus, Trash2, Building2, BedDouble, Utensils } from "lucide-react";
import { API_BASE, authHeaders } from "./api";

const API = API_BASE;

export default function OwnerUpdatesConnected({ notify }) {
  const [hostelId, setHostelId] = useState("");
  const [updates, setUpdates] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      setError("");

      const hostelRes = await fetch(`${API}/hostels/mine`, {
        headers: authHeaders(token)
      });
      const hostelData = await hostelRes.json();
      if (!hostelRes.ok) throw new Error(hostelData.message || "Could not load hostel");
      if (!Array.isArray(hostelData) || !hostelData.length) {
        throw new Error("Please add your hostel before posting announcements.");
      }

      const hId = hostelData[0].id;
      setHostelId(hId);

      const updatesRes = await fetch(`${API}/updates/hostel/${hId}`);
      const updatesData = await updatesRes.json();
      setUpdates(Array.isArray(updatesData) ? updatesData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      notify("Please provide both title and content for the update.");
      return;
    }

    try {
      setPosting(true);
      const res = await fetch(`${API}/updates/hostel/${hostelId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token)
        },
        body: JSON.stringify({ title: title.trim(), content: content.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post update");

      setUpdates([data, ...updates]);
      setTitle("");
      setContent("");
      notify("Announcement posted successfully.");
    } catch (err) {
      notify(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      const res = await fetch(`${API}/updates/${id}`, {
        method: "DELETE",
        headers: authHeaders(token)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete update");
      setUpdates(updates.filter((u) => u.id !== id));
      notify("Announcement deleted.");
    } catch (err) {
      notify(err.message);
    }
  };

  if (loading) {
    return (
      <main className="portal">
        <div className="container">
          <div className="empty">Loading hostel announcements...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="portal">
      <div className="container portal-layout">
        <aside className="portal-side">
          <div className="brand"><span className="brand-mark">H</span>HostelHub</div>
          <div className="portal-role">OWNER</div>
          <nav>
            <Link to="/owner"><Building2 />Overview</Link>
            <Link to="/owner/hostel"><Building2 />My Hostel</Link>
            <Link to="/owner/rooms"><BedDouble />Rooms & Vacancies</Link>
            <Link to="/owner/menu"><Utensils />Food Menu</Link>
            <Link to="/owner/updates"><Bell />Updates</Link>
          </nav>
        </aside>

        <section className="portal-main">
          <div className="portal-top">
            <div>
              <div className="eyebrow">OWNER</div>
              <h1>Hostel Updates</h1>
            </div>
            <span className="user-avatar">O</span>
          </div>

          {error ? (
            <div className="empty">
              <p>{error}</p>
              <Link to="/owner/hostel" className="btn btn-primary">Go to My Hostel</Link>
            </div>
          ) : (
            <>
              <form className="panel" onSubmit={handlePost}>
                <div className="panel-head">
                  <h2>Post an announcement</h2>
                  <small className="muted">Notices are broadcasted directly to residents of this hostel.</small>
                </div>
                <label>
                  Announcement Title
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Example: Water tank maintenance on Saturday"
                    required
                  />
                </label>
                <label>
                  Details
                  <textarea
                    className="input textarea"
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write details about the timing, instructions or rules..."
                    required
                  />
                </label>
                <button className="btn btn-primary" type="submit" disabled={posting}>
                  <Plus size={16} /> {posting ? "Posting..." : "Post Announcement"}
                </button>
              </form>

              <div className="panel" style={{ marginTop: 24 }}>
                <div className="panel-head">
                  <h2>Published notices ({updates.length})</h2>
                </div>
                {updates.length ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {updates.map((u) => (
                      <div className="update-row" key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: 12 }}>
                          <Bell size={20} style={{ color: "#2563eb", marginTop: 2 }} />
                          <div>
                            <strong>{u.title}</strong>
                            <p style={{ margin: "4px 0", color: "#334155" }}>{u.content}</p>
                            <small className="muted">{u.created_at || "Recent"}</small>
                          </div>
                        </div>
                        <button
                          className="text-btn"
                          style={{ color: "#dc2626", cursor: "pointer" }}
                          onClick={() => handleDelete(u.id)}
                          title="Delete update"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty">No updates posted yet.</div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
