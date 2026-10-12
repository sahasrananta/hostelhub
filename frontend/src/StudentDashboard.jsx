import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  CreditCard,
  Bell,
  Heart,
  MessageSquare,
  Receipt,
  BedDouble,
  Star,
  Settings,
  LogOut,
  Building2,
  CalendarDays,
  Plus,
  Send,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { API_BASE, API_ORIGIN, authHeaders } from "./api";

const API = API_BASE;

export default function StudentDashboard({ notify }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [hostelMenu, setHostelMenu] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");

  // Complaint submission form
  const [compHostelId, setCompHostelId] = useState("");
  const [compTitle, setCompTitle] = useState("");
  const [compCat, setCompCat] = useState("maintenance");
  const [compDesc, setCompDesc] = useState("");
  const [compSubmitting, setCompSubmitting] = useState(false);

  // Review submission form
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [revSubmitting, setRevSubmitting] = useState(false);

  // Monthly fee payment modal
  const [payingFee, setPayingFee] = useState(false);

  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const stored = localStorage.getItem("hostelhub_user");
      setUser(stored ? JSON.parse(stored) : null);
    } catch {
      setUser(null);
    }

    loadStudentData();
  }, [navigate, token]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError("");
      const headers = authHeaders(token);

      const [bRes, pRes, wRes, cRes, uRes, rRes] = await Promise.all([
        fetch(`${API}/bookings/mine`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API}/payments/mine`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API}/wishlist`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API}/complaints/mine`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API}/updates/mine`, { headers }).catch(() => ({ ok: false })),
        fetch(`${API}/reviews/mine`, { headers }).catch(() => ({ ok: false })),
      ]);

      if (bRes.status === 401) {
        localStorage.removeItem("hostelhub_token");
        localStorage.removeItem("hostelhub_user");
        window.dispatchEvent(new Event("hostelhub-auth-change"));
        navigate("/login", { replace: true });
        return;
      }

      const bData = bRes.ok ? await bRes.json().catch(() => []) : [];
      const pData = pRes.ok ? await pRes.json().catch(() => []) : [];
      const wData = wRes.ok ? await wRes.json().catch(() => []) : [];
      const cData = cRes.ok ? await cRes.json().catch(() => []) : [];
      const uData = uRes.ok ? await uRes.json().catch(() => []) : [];
      const rData = rRes.ok ? await rRes.json().catch(() => []) : [];

      const bookingList = Array.isArray(bData) ? bData : [];
      setBookings(bookingList);
      setPayments(Array.isArray(pData) ? pData : []);
      setWishlist(Array.isArray(wData) ? wData : []);
      setComplaints(Array.isArray(cData) ? cData : []);
      setUpdates(Array.isArray(uData) ? uData : []);
      setReviews(Array.isArray(rData) ? rData : []);

      // If user has an active confirmed booking, load the menu for that hostel
      const activeStay = bookingList.find((b) => b.status === "confirmed");
      if (activeStay?.hostel_id) {
        setCompHostelId(String(activeStay.hostel_id));
        fetch(`${API}/menu/hostel/${activeStay.hostel_id}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((menuData) => {
            setHostelMenu(Array.isArray(menuData) ? menuData : []);
          })
          .catch(() => {});
      }
    } catch (err) {
      setError(err.message || "Could not load student information");
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

  const handlePayMonthlyFee = async (hostelId, amount) => {
    if (!window.confirm(`Confirm payment of ₹${Number(amount).toLocaleString()} monthly hostel fee?`)) return;
    try {
      setPayingFee(true);
      const res = await fetch(`${API}/payments/monthly-fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ hostel_id: hostelId, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fee payment failed");

      notify("Monthly fee paid successfully! Receipt generated.");
      loadStudentData();
    } catch (err) {
      notify(err.message);
    } finally {
      setPayingFee(false);
    }
  };

  const handleRemoveWishlist = async (hostelId) => {
    try {
      const res = await fetch(`${API}/wishlist/${hostelId}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error("Could not remove from wishlist");
      setWishlist(wishlist.filter((w) => w.id !== hostelId));
      notify("Removed from wishlist.");
    } catch (err) {
      notify(err.message);
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!compHostelId || !compTitle.trim() || !compDesc.trim()) {
      notify("Please fill all complaint fields.");
      return;
    }
    try {
      setCompSubmitting(true);
      const res = await fetch(`${API}/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          hostel_id: Number(compHostelId),
          title: compTitle.trim(),
          category: compCat,
          description: compDesc.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit complaint");

      setComplaints([data, ...complaints]);
      setCompTitle("");
      setCompDesc("");
      notify("Complaint submitted. The hostel team has been notified.");
    } catch (err) {
      notify(err.message);
    } finally {
      setCompSubmitting(false);
    }
  };

  const handleSubmitReview = async (e, hostelId) => {
    e.preventDefault();
    try {
      setRevSubmitting(true);
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({
          hostel_id: hostelId,
          rating: Number(revRating),
          comment: revComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit review");

      setReviews([data, ...reviews]);
      setRevComment("");
      notify("Review submitted successfully! Thank you for your feedback.");
    } catch (err) {
      notify(err.message);
    } finally {
      setRevSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="empty">Loading your resident portal...</div>
        </div>
      </main>
    );
  }

  const activeStay = bookings.find((b) => b.status === "confirmed");
  const todayDayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const todayMeals = hostelMenu.filter((m) => m.day.toLowerCase() === todayDayName.toLowerCase());

  return (
    <main className="page">
      <div className="container">
        {/* Profile Header */}
        <div className="page-title">
          <div>
            <div className="eyebrow">STUDENT PORTAL</div>
            <h1>Welcome back, {user?.name || "Student"}</h1>
            <p>{user?.email} · {activeStay ? "Active Resident" : "Registered Student"}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/account-settings" className="btn btn-outline">
              <Settings size={16} /> Security Settings
            </Link>
            <button className="btn btn-outline" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {error && <div className="account-alert error">{error}</div>}

        {/* Active Stay Banner */}
        {activeStay ? (
          <div className="resident-banner" style={{ marginBottom: 24 }}>
            <div>
              <span className="eyebrow">YOUR CURRENT STAY</span>
              <h2>{activeStay.hostel_name}</h2>
              <p><MapPin size={15} /> {activeStay.hostel_address || activeStay.hostel_city}</p>
              <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 14 }}>
                <span><strong>Room:</strong> {activeStay.room_type}</span>
                <span><strong>Monthly Rent:</strong> ₹{Number(activeStay.price_per_month || activeStay.amount).toLocaleString()}</span>
                <span><strong>Move-in:</strong> {activeStay.check_in || "Active"}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <span className="status green">Active Resident</span>
              <button
                className="btn btn-primary small"
                onClick={() => handlePayMonthlyFee(activeStay.hostel_id, activeStay.price_per_month || activeStay.amount)}
                disabled={payingFee}
              >
                <CreditCard size={15} /> {payingFee ? "Processing..." : "Pay Monthly Rent"}
              </button>
            </div>
          </div>
        ) : (
          <div className="panel" style={{ marginBottom: 24, background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>No active hostel booking</h3>
                <p className="muted">Explore verified student accommodations and book a room to unlock resident benefits.</p>
              </div>
              <Link to="/hostels" className="btn btn-primary">Browse Hostels</Link>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="stats">
          <div className="stat">
            <span>Bookings</span>
            <strong>{bookings.length}</strong>
            <small>{activeStay ? "1 active stay" : "No active stay"}</small>
          </div>
          <div className="stat">
            <span>Fee Payments</span>
            <strong>{payments.length}</strong>
            <small>Total paid: ₹{payments.reduce((s, p) => s + Number(p.amount || 0), 0).toLocaleString()}</small>
          </div>
          <div className="stat">
            <span>Saved Wishlist</span>
            <strong>{wishlist.length}</strong>
            <small>Hostels saved</small>
          </div>
          <div className="stat">
            <span>Complaints</span>
            <strong>{complaints.length}</strong>
            <small>{complaints.filter((c) => c.status === "resolved").length} resolved</small>
          </div>
        </div>

        {/* Portal Tabs */}
        <div className="auth-tabs" style={{ margin: "24px 0 16px" }}>
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Stay & Updates
          </button>
          <button
            className={activeTab === "bookings" ? "active" : ""}
            onClick={() => setActiveTab("bookings")}
          >
            Booking History ({bookings.length})
          </button>
          <button
            className={activeTab === "payments" ? "active" : ""}
            onClick={() => setActiveTab("payments")}
          >
            Payments ({payments.length})
          </button>
          <button
            className={activeTab === "wishlist" ? "active" : ""}
            onClick={() => setActiveTab("wishlist")}
          >
            Wishlist ({wishlist.length})
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

        {/* TAB 1: OVERVIEW & STAY */}
        {activeTab === "overview" && (
          <div className="portal-grid">
            <div className="panel">
              <div className="panel-head">
                <h2>Today's food menu</h2>
                <span className="badge dark">{todayDayName}</span>
              </div>
              {todayMeals.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {todayMeals.map((m) => (
                    <div key={m.id} style={{ background: "#f8fafc", padding: 10, borderRadius: 6 }}>
                      <strong>{m.meal}:</strong> <span>{m.item}</span>
                    </div>
                  ))}
                </div>
              ) : hostelMenu.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {hostelMenu.slice(0, 4).map((m) => (
                    <div key={m.id} style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                      <strong>{m.day}:</strong> <span>{m.item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  {activeStay
                    ? "Hostel menu has not been published yet."
                    : "Book a hostel stay to view daily food menus."}
                </p>
              )}

              {activeStay && (
                <div style={{ marginTop: 24 }}>
                  <h3>Rate your hostel stay</h3>
                  <form onSubmit={(e) => handleSubmitReview(e, activeStay.hostel_id)}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
                      Rating:
                      <select
                        className="input"
                        style={{ maxWidth: 100 }}
                        value={revRating}
                        onChange={(e) => setRevRating(Number(e.target.value))}
                      >
                        <option value={5}>5 - Excellent</option>
                        <option value={4}>4 - Good</option>
                        <option value={3}>3 - Average</option>
                        <option value={2}>2 - Poor</option>
                        <option value={1}>1 - Terrible</option>
                      </select>
                    </label>
                    <textarea
                      className="input textarea"
                      rows={2}
                      placeholder="Write your review of the food, cleanliness, staff and facilities..."
                      value={revComment}
                      onChange={(e) => setRevComment(e.target.value)}
                    />
                    <button className="btn btn-primary small" type="submit" disabled={revSubmitting} style={{ marginTop: 8 }}>
                      <Send size={14} /> {revSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Hostel announcements</h2>
                <Bell size={18} />
              </div>
              {updates.length ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {updates.map((u) => (
                    <div className="update-row" key={u.id}>
                      <Bell size={18} style={{ color: "#2563eb", marginTop: 2 }} />
                      <div>
                        <strong>{u.title}</strong>
                        <p style={{ margin: "4px 0", color: "#334155" }}>{u.content}</p>
                        <small className="muted">{u.hostel_name} · {u.created_at || "Recent"}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  {activeStay
                    ? "No new announcements from your hostel owner."
                    : "Notices and updates from your hostel will appear here."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BOOKING HISTORY */}
        {activeTab === "bookings" && (
          <section className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <h2>My bookings ({bookings.length})</h2>
              <Link to="/hostels" className="btn btn-outline small">Book Another Stay</Link>
            </div>
            {bookings.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Hostel</th>
                      <th>Room Type</th>
                      <th>Move-in Date</th>
                      <th>Booking Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.hostel_name}</strong>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{b.hostel_city} · {b.hostel_address}</div>
                        </td>
                        <td>{b.room_type}</td>
                        <td>{b.check_in || "Immediate"}</td>
                        <td><strong>₹{Number(b.amount).toLocaleString()}</strong></td>
                        <td>
                          <span className={`status ${b.status === "confirmed" ? "green" : b.status === "cancelled" ? "red" : ""}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <Link to={`/hostels/${b.hostel_id}`} className="btn btn-outline small">
                            View Hostel
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <h2>No bookings yet</h2>
                <p>Find your next student home and book securely.</p>
                <Link to="/hostels" className="btn btn-primary">Browse Hostels</Link>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: PAYMENT HISTORY */}
        {activeTab === "payments" && (
          <section className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <h2>Payment transactions ({payments.length})</h2>
            </div>
            {payments.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Hostel</th>
                      <th>Payment Type</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td><code>{p.transaction_id || `TXN-${p.id}`}</code></td>
                        <td>{p.hostel_name || "Hostel Stay"}</td>
                        <td>
                          <span className="account-role" style={{ textTransform: "capitalize" }}>
                            {p.payment_type === "monthly_fee" ? "Monthly Rent" : "Room Booking"}
                          </span>
                        </td>
                        <td><strong>₹{Number(p.amount).toLocaleString()}</strong></td>
                        <td>{p.paid_at || p.created_at || "Recent"}</td>
                        <td><span className="status green">{p.status || "Paid"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No payment transactions recorded.</div>
            )}
          </section>
        )}

        {/* TAB 4: WISHLIST */}
        {activeTab === "wishlist" && (
          <section className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <h2>Saved hostels ({wishlist.length})</h2>
              <Link to="/hostels" className="btn btn-outline small">Explore More</Link>
            </div>
            {wishlist.length ? (
              <div className="hostel-grid">
                {wishlist.map((h) => {
                  const imageUrl = h.photos?.[0]?.url ? `${API_ORIGIN}${h.photos[0].url}` : null;
                  return (
                    <article className="hostel-card" key={h.id}>
                      <div
                        className="hostel-image img-sunrise"
                        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
                      >
                        <span className="badge">{h.gender || "Student"}</span>
                        <button
                          className="like active"
                          onClick={() => handleRemoveWishlist(h.id)}
                          title="Remove from wishlist"
                        >
                          <Heart size={19} fill="currentColor" />
                        </button>
                      </div>
                      <div className="hostel-info">
                        <div className="rating">
                          <Star size={15} fill="currentColor" />
                          {Number(h.rating || 0).toFixed(1)} <span>({h.review_count || 0})</span>
                        </div>
                        <h3>{h.name}</h3>
                        <p className="location"><MapPin size={15} />{h.city}</p>
                        <div className="card-bottom">
                          <div>
                            <small>From</small>
                            <strong>₹{Number(h.price || 0).toLocaleString()}<small>/mo</small></strong>
                          </div>
                          <Link to={`/hostels/${h.id}`} className="btn btn-dark small">View</Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <Heart size={36} />
                <h2>No saved hostels</h2>
                <p>Browse hostels and save places you want to visit.</p>
                <Link to="/hostels" className="btn btn-primary">Browse Hostels</Link>
              </div>
            )}
          </section>
        )}

        {/* TAB 5: COMPLAINTS */}
        {activeTab === "complaints" && (
          <div style={{ marginTop: 12, display: "grid", gap: 24 }}>
            {/* Submit Complaint Form */}
            <form className="panel" onSubmit={handleSubmitComplaint}>
              <div className="panel-head">
                <div>
                  <h2>Submit a hostel complaint</h2>
                  <p className="muted">Report maintenance, food, hygiene or security issues for official resolution.</p>
                </div>
              </div>
              <div className="two">
                <label>
                  Hostel
                  <select
                    className="input"
                    value={compHostelId}
                    onChange={(e) => setCompHostelId(e.target.value)}
                    required
                  >
                    <option value="">Select your hostel</option>
                    {bookings.map((b) => (
                      <option key={b.hostel_id} value={b.hostel_id}>{b.hostel_name}</option>
                    ))}
                    {wishlist.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select
                    className="input"
                    value={compCat}
                    onChange={(e) => setCompCat(e.target.value)}
                  >
                    <option value="maintenance">Maintenance & Repairs</option>
                    <option value="cleanliness">Cleanliness & Hygiene</option>
                    <option value="food">Mess & Food Quality</option>
                    <option value="safety">Security & Safety</option>
                    <option value="billing">Billing & Fees</option>
                    <option value="general">General Issue</option>
                  </select>
                </label>
              </div>
              <label>
                Subject
                <input
                  className="input"
                  placeholder="Example: Geyser not working in 2nd floor bathroom"
                  value={compTitle}
                  onChange={(e) => setCompTitle(e.target.value)}
                  required
                />
              </label>
              <label>
                Details
                <textarea
                  className="input textarea"
                  rows={3}
                  placeholder="Describe the problem, room number, and when it started..."
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  required
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={compSubmitting}>
                <Send size={16} /> {compSubmitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </form>

            {/* List of Complaints */}
            <section className="panel">
              <div className="panel-head">
                <h2>Complaint history ({complaints.length})</h2>
              </div>
              {complaints.length ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {complaints.map((c) => (
                    <div key={c.id} style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span className="badge dark" style={{ textTransform: "capitalize" }}>{c.category}</span>
                          <h3 style={{ margin: "6px 0 2px" }}>{c.title}</h3>
                          <small className="muted">{c.hostel_name} · {c.created_at || "Recent"}</small>
                        </div>
                        <span className={`status ${c.status === "resolved" ? "green" : c.status === "reviewing" ? "yellow" : ""}`}>
                          {c.status}
                        </span>
                      </div>
                      <p style={{ margin: "10px 0" }}>{c.description}</p>
                      {c.response && (
                        <div style={{ background: "#eff6ff", padding: "8px 12px", borderRadius: 6, borderLeft: "3px solid #2563eb", marginTop: 8 }}>
                          <small><strong>Response from management:</strong> {c.response}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">No complaints submitted.</div>
              )}
            </section>
          </div>
        )}

        {/* TAB 6: REVIEWS */}
        {activeTab === "reviews" && (
          <section className="panel" style={{ marginTop: 12 }}>
            <div className="panel-head">
              <h2>My written reviews ({reviews.length})</h2>
            </div>
            {reviews.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {reviews.map((r) => (
                  <div key={r.id} className="panel" style={{ background: "#f8fafc" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <h3>{r.hostel_name}</h3>
                        <small className="muted">{r.hostel_city} · {r.created_at || "Recent"}</small>
                      </div>
                      <div className="rating">
                        <Star size={16} fill="currentColor" /> {r.rating} / 5
                      </div>
                    </div>
                    <p style={{ marginTop: 8 }}>{r.comment || "No comment."}</p>
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
