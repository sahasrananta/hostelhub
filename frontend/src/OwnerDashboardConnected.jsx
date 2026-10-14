import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  BedDouble,
  Utensils,
  Bell,
  Users,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Star,
  Clock,
  Settings,
  CalendarDays
} from "lucide-react";
import { API_BASE, authHeaders } from "./api";

const API = API_BASE;

export default function OwnerDashboardConnected() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [residents, setResidents] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [replyText, setReplyText] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const token = localStorage.getItem("hostelhub_token");
  const savedUser = localStorage.getItem("hostelhub_user");

  useEffect(() => {
    if (!token || !savedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(savedUser);
      if (user.role !== "owner") {
        setError("This account is not registered as an owner account.");
        setLoading(false);
        return;
      }
    } catch {
      localStorage.removeItem("hostelhub_token");
      localStorage.removeItem("hostelhub_user");
      navigate("/login", { replace: true });
      return;
    }

    loadDashboard();
  }, [navigate, token]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = authHeaders(token);

      const [hostelsRes, bookingsRes, residentsRes, complaintsRes, reviewsRes] = await Promise.all([
        fetch(`${API}/hostels/mine`, { headers }),
        fetch(`${API}/bookings/owner`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API}/bookings/residents`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API}/complaints/owner`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API}/reviews/owner`, { headers }).catch(() => ({ ok: false })),
      ]);

      if (hostelsRes.status === 401) {
        localStorage.removeItem("hostelhub_token");
        localStorage.removeItem("hostelhub_user");
        window.dispatchEvent(new Event("hostelhub-auth-change"));
        navigate("/login", { replace: true });
        return;
      }

      const hostelsData = await hostelsRes.json().catch(() => []);
      const bookingsData = bookingsRes.ok ? await bookingsRes.json().catch(() => []) : [];
      const residentsData = residentsRes.ok ? await residentsRes.json().catch(() => []) : [];
      const complaintsData = complaintsRes.ok ? await complaintsRes.json().catch(() => []) : [];
      const reviewsData = reviewsRes.ok ? await reviewsRes.json().catch(() => []) : [];

      setHostels(Array.isArray(hostelsData) ? hostelsData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setResidents(Array.isArray(residentsData) ? residentsData : []);
      setComplaints(Array.isArray(complaintsData) ? complaintsData : []);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (err) {
      setError(err.message || "Could not load owner dashboard");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("hostelhub_token");
    localStorage.removeItem("hostelhub_user");
    window.dispatchEvent(new Event("hostelhub-auth-change"));
    navigate("/login", { replace: true });
  };

  const handleBookingDecision = async (bookingId, status) => {
    try {
      const res = await fetch(`${API}/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update booking status");
      setNotice(`Booking marked as ${status}.`);
      setTimeout(() => setNotice(""), 3000);
      setBookings((current) =>
        current.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
      // Reload dashboard to keep available bed counts in sync
      loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplaintStatus = async (complaintId, status) => {
    try {
      const responseNote = replyText[complaintId] || "";
      const res = await fetch(`${API}/complaints/${complaintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ status, response: responseNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update complaint");
      setNotice(`Complaint marked as ${status}.`);
      setTimeout(() => setNotice(""), 3000);
      setComplaints((current) =>
        current.map((c) => (c.id === complaintId ? { ...c, status, response: responseNote || c.response } : c))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="empty">Loading owner dashboard...</div>
        </div>
      </main>
    );
  }

  if (error && !hostels.length) {
    return (
      <main className="page">
        <div className="container">
          <div className="empty">
            <h2>Could not load dashboard</h2>
            <p>{error}</p>
            <button className="btn btn-dark" onClick={() => navigate("/login", { replace: true })}>
              Sign in again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const totalBeds = hostels.reduce((sum, h) => sum + (h.rooms || []).reduce((roomsTotal, room) => roomsTotal + Number(room.total_beds || 0), 0), 0);
  const availableBeds = hostels.reduce((sum, h) => sum + (h.rooms || []).reduce((roomsTotal, room) => roomsTotal + Number(room.available_beds || 0), 0), 0);
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const openComplaints = complaints.filter((c) => c.status === "open" || c.status === "reviewing");

  return (
    <main className="page">
      <div className="container">
        <div className="page-title">
          <div>
            <div className="eyebrow">OWNER PORTAL</div>
            <h1>Owner Dashboard</h1>
            <p>Manage listings, vacancies, bookings, residents, food menus and complaints.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/account-settings" className="btn btn-outline">Settings</Link>
            <button className="btn btn-outline" onClick={logout}>Logout</button>
          </div>
        </div>

        {notice && <div className="account-alert success">{notice}</div>}
        {error && <div className="account-alert error">{error}</div>}

        {/* High-level stats */}
        <div className="stats">
          <div className="stat">
            <span>My Hostels</span>
            <strong>{hostels.length}</strong>
            <small>{hostels.filter(h => h.status === "approved").length} approved listings</small>
          </div>
          <div className="stat">
            <span>Available Beds</span>
            <strong>{availableBeds}</strong>
            <small>{totalBeds} total capacity</small>
          </div>
          <div className="stat">
            <span>Confirmed Residents</span>
            <strong>{residents.length}</strong>
            <small>Currently staying</small>
          </div>
          <div className="stat">
            <span>Pending Bookings</span>
            <strong>{pendingBookings.length}</strong>
            <small>{openComplaints.length} active complaints</small>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="auth-tabs" style={{ margin: "24px 0 16px" }}>
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview & Hostels
          </button>
          <button
            className={activeTab === "bookings" ? "active" : ""}
            onClick={() => setActiveTab("bookings")}
          >
            Bookings ({bookings.length})
          </button>
          <button
            className={activeTab === "residents" ? "active" : ""}
            onClick={() => setActiveTab("residents")}
          >
            Residents ({residents.length})
          </button>
          <button
            className={activeTab === "complaints" ? "active" : ""}
            onClick={() => setActiveTab("complaints")}
          >
            Complaints ({complaints.length})
          </button>
          <button
            className={activeTab === "reviews" ? "active" : ""}
            onClick={() => setActiveTab("reviews")}
          >
            Reviews ({reviews.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & HOSTELS */}
        {activeTab === "overview" && (
          <>
            {hostels.length === 0 ? (
              <div className="empty" style={{ margin: "20px 0" }}>
                <h2>No hostel added yet</h2>
                <p>Add your hostel information to start accepting bookings on HostelHub.</p>
                <Link to="/owner/hostel" className="btn btn-primary">Request New Hostel</Link>
              </div>
            ) : (
              <div className="hostel-list">
                {hostels.map((hostel) => (
                  <article className="hostel-card horizontal" key={hostel.id}>
                    <div className="hostel-info">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div className="eyebrow">{hostel.gender || "Student"} HOSTEL</div>
                        <span className={`status ${hostel.status === "approved" ? "green" : hostel.status === "rejected" ? "red" : ""}`}>
                          {hostel.status ? hostel.status.toUpperCase() : "PENDING"}
                        </span>
                      </div>
                      <h2>{hostel.name}</h2>
                      <p className="location">
                        {hostel.address || "Address not specified"}
                        {hostel.city ? ` · ${hostel.city}` : ""}
                      </p>
                      <p>{hostel.description || "No description added yet."}</p>
                      <div className="card-bottom">
                        <div>
                          <small>Starting from</small>
                          <strong>{hostel.price ? `₹${Number(hostel.price).toLocaleString()}/mo` : "Not set"}</strong>
                        </div>
                        <div>
                          <small>Available beds</small>
                          <strong>{hostel.available_beds ?? 0} beds</strong>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Link to="/owner/hostel" className="btn btn-dark">View / Edit</Link>
                          <Link to="/owner/vacancies" className="btn btn-outline">Vacancies</Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="section" style={{ marginTop: 28 }}>
              <div className="city-grid">
                <Link to="/owner/hostel" className="city-card">
                  <div>
                    <h3>Registered Hostels</h3>
                    <p>Update information and photo gallery</p>
                  </div>
                </Link>
                <Link to="/owner/vacancies" className="city-card">
                  <div>
                    <h3>Manage Vacancies</h3>
                    <p>Mark each floor, room and bed as booked or available</p>
                  </div>
                </Link>
                <Link to="/owner/menu" className="city-card">
                  <div>
                    <h3>Weekly Food Menu</h3>
                    <p>Edit daily breakfast, lunch and dinner menus</p>
                  </div>
                </Link>
                <Link to="/owner/updates" className="city-card">
                  <div>
                    <h3>Hostel Announcements</h3>
                    <p>Post updates and notices for residents</p>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: BOOKINGS MANAGEMENT */}
        {activeTab === "bookings" && (
          <section className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <h2>Student bookings ({bookings.length})</h2>
              <small className="muted">Review incoming booking requests, accept or cancel reservations.</small>
            </div>
            {bookings.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Hostel / Room</th>
                      <th>Move-in Date</th>
                      <th>Fee Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.student_name}</strong>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{b.student_email} · {b.student_phone || "No phone"}</div>
                        </td>
                        <td>
                          {b.hostel_name}
                          <div style={{ fontSize: 12, color: "#64748b" }}>{b.room_type}</div>
                        </td>
                        <td>{b.check_in || "Immediate"}</td>
                        <td><strong>₹{Number(b.amount).toLocaleString()}</strong></td>
                        <td>
                          <span className={`status ${b.status === "confirmed" ? "green" : b.status === "cancelled" ? "red" : ""}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            {b.status !== "confirmed" && (
                              <button
                                className="btn btn-primary small"
                                onClick={() => handleBookingDecision(b.id, "confirmed")}
                              >
                                Accept
                              </button>
                            )}
                            {b.status !== "cancelled" && (
                              <button
                                className="btn btn-outline small"
                                onClick={() => handleBookingDecision(b.id, "cancelled")}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No bookings received yet.</div>
            )}
          </section>
        )}

        {/* TAB 3: RESIDENTS / TENANTS VIEW */}
        {activeTab === "residents" && (
          <section className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <h2>Current residents ({residents.length})</h2>
              <small className="muted">Verified students with active confirmed bookings in your hostel.</small>
            </div>
            {residents.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Resident Name</th>
                      <th>Contact</th>
                      <th>Hostel & Room</th>
                      <th>Move-in Date</th>
                      <th>Monthly Rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map((r) => (
                      <tr key={r.booking_id}>
                        <td><strong>{r.resident_name}</strong></td>
                        <td>
                          <div>{r.resident_email}</div>
                          <small style={{ color: "#64748b" }}>{r.resident_phone || "No phone recorded"}</small>
                        </td>
                        <td>
                          <div>{r.hostel_name}</div>
                          <small style={{ color: "#64748b" }}>{r.room_type}</small>
                        </td>
                        <td>{r.check_in || "Active"}</td>
                        <td><strong>₹{Number(r.price_per_month || r.amount).toLocaleString()}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No active residents recorded yet.</div>
            )}
          </section>
        )}

        {/* TAB 4: COMPLAINTS RESPONSE */}
        {activeTab === "complaints" && (
          <section className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <h2>Resident complaints ({complaints.length})</h2>
              <small className="muted">Track issues reported by residents and reply with status updates.</small>
            </div>
            {complaints.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {complaints.map((c) => (
                  <div key={c.id} className="panel" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <span className="badge dark" style={{ textTransform: "capitalize" }}>{c.category}</span>
                        <h3 style={{ margin: "6px 0 2px" }}>{c.title}</h3>
                        <small style={{ color: "#64748b" }}>
                          Reported by <strong>{c.student_name}</strong> ({c.student_email}) · {c.hostel_name}
                        </small>
                      </div>
                      <span className={`status ${c.status === "resolved" ? "green" : c.status === "reviewing" ? "yellow" : ""}`}>
                        {c.status}
                      </span>
                    </div>
                    <p style={{ margin: "10px 0" }}>{c.description}</p>
                    {c.response && (
                      <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 6, margin: "8px 0", borderLeft: "3px solid #2563eb" }}>
                        <small><strong>Your response:</strong> {c.response}</small>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                      <input
                        className="input"
                        placeholder="Write a response or note for the resident..."
                        style={{ maxWidth: 360, padding: "5px 10px", fontSize: 13 }}
                        value={replyText[c.id] ?? ""}
                        onChange={(e) => setReplyText({ ...replyText, [c.id]: e.target.value })}
                      />
                      <button
                        className="btn btn-outline small"
                        onClick={() => handleComplaintStatus(c.id, "reviewing")}
                      >
                        In Progress
                      </button>
                      <button
                        className="btn btn-primary small"
                        onClick={() => handleComplaintStatus(c.id, "resolved")}
                      >
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">No resident complaints reported for your hostels.</div>
            )}
          </section>
        )}

        {/* TAB 5: REVIEWS */}
        {activeTab === "reviews" && (
          <section className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <h2>Resident reviews ({reviews.length})</h2>
              <small className="muted">Feedback and ratings submitted by residents who stayed at your hostels.</small>
            </div>
            {reviews.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {reviews.map((rev) => (
                  <div key={rev.id} className="review" style={{ background: "#f8fafc", padding: 14, borderRadius: 8 }}>
                    <div className="review-avatar">{(rev.user_name || "R")[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{rev.user_name || "Resident"}</strong>
                        <div className="rating">
                          <Star size={14} fill="currentColor" /> {rev.rating}/5
                        </div>
                      </div>
                      <small style={{ color: "#64748b" }}>{rev.hostel_name}</small>
                      <p style={{ marginTop: 6 }}>{rev.comment || "No comment provided."}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">No reviews submitted yet.</div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
