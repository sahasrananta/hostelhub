import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, authHeaders } from "./api";

const API = API_BASE;

export default function StudentComplaints() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);
  const [mine, setMine] = useState([]);
  const [hostelId, setHostelId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("maintenance");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const headers = authHeaders(token);

    Promise.all([
      fetch(`${API}/hostels`).then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error(data.message || "Could not load hostels");
        return Array.isArray(data) ? data.filter((x) => !x.status || x.status === "approved") : [];
      }),
      fetch(`${API}/complaints/mine`, { headers }).then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error(data.message || "Could not load complaints");
        return Array.isArray(data) ? data : [];
      }),
    ])
      .then(([hostelData, complaintData]) => {
        setHostels(hostelData);
        setMine(complaintData);
      })
      .catch((e) => setError(e.message));
  }, [navigate, token]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ hostel_id: Number(hostelId), title, description, category }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not submit complaint");
      setMine((current) => [data, ...current]);
      setTitle("");
      setDescription("");
      setMessage("Complaint submitted. The HostelHub team can review it.");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="page">
      <div className="container">
        <div className="eyebrow">STUDENT SUPPORT</div>
        <h1>Hostel complaints</h1>
        <p className="lead">Report safety, cleanliness, facilities, or service issues. Sign in is required so the team can follow up.</p>
        {!token ? (
          <p><Link to="/login">Sign in</Link> to submit a complaint.</p>
        ) : (
          <form className="panel" onSubmit={submit} style={{ maxWidth: 760, display: "grid", gap: 14 }}>
            <label>
              Hostel
              <select required value={hostelId} onChange={(e) => setHostelId(e.target.value)}>
                <option value="">Choose a hostel</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name} — {h.city}</option>
                ))}
              </select>
            </label>
            <label>
              Issue type
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="maintenance">Maintenance</option>
                <option value="cleanliness">Cleanliness</option>
                <option value="food">Food</option>
                <option value="safety">Safety</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Title
              <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Briefly describe the issue" />
            </label>
            <label>
              Details
              <textarea required minLength={10} maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="What happened and where?" />
            </label>
            <button className="btn btn-primary" type="submit">Submit complaint</button>
            {message && <p role="status">{message}</p>}
            {error && <p role="alert">{error}</p>}
          </form>
        )}

        <section style={{ marginTop: 30 }}>
          <h2>My complaints</h2>
          {mine.length ? (
            mine.map((c) => (
              <article className="panel" key={c.id} style={{ marginBottom: 12 }}>
                <strong>{c.title}</strong>
                <p>{c.hostel_name || hostels.find((h) => h.id === c.hostel_id)?.name || "Hostel"} · {c.category}</p>
                <p>{c.description}</p>
                <small>Status: {c.status || "open"} · {c.created_at || "Just submitted"}</small>
              </article>
            ))
          ) : (
            <p>No complaints submitted yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
