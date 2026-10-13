import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, ShieldCheck, UserRound } from "lucide-react";
import { API_BASE } from "./api";

const ROLE_LABELS = {
  student: "Student",
  owner: "Hostel Owner",
  admin: "Administrator",
};

export default function OwnerAuth({ signup = false }) {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = signup ? "/auth/register" : "/auth/login";
      const payload = signup
        ? {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            phone: phone.trim(),
            role,
          }
        : {
            email: email.trim().toLowerCase(),
            password,
            role,
          };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Authentication failed.");
      if (!data.token || !data.user) throw new Error("The server did not return a valid session.");

      const actualRole = String(data.user.role || "").toLowerCase();
      if (!signup && actualRole !== role) {
        throw new Error(`This account is registered as ${ROLE_LABELS[actualRole] || actualRole}. Choose the matching role and try again.`);
      }
      if (signup && actualRole !== role) {
        throw new Error("The server returned a different account role. Please contact support.");
      }

      localStorage.setItem("hostelhub_token", data.token);
      localStorage.setItem("hostelhub_user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("hostelhub-auth-change"));

      if (actualRole === "owner") navigate("/owner", { replace: true });
      else if (actualRole === "admin") navigate("/admin", { replace: true });
      else navigate("/resident", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page-navy">
      <div className="auth-shell">
        <section className="auth-story">
          <Link to="/" className="brand"><span className="brand-mark">H</span>HostelHub</Link>
          <div className="auth-story-copy">
            <div className="auth-kicker">STUDENT LIVING, MADE SIMPLE</div>
            <h1>{signup ? <>Make space for a <em>better stay.</em></> : <>Welcome back to <em>better living.</em></>}</h1>
            <p>Find verified hostels, compare rooms, check vacancies, and manage your stay in one calm, simple place.</p>
          </div>
          <div className="auth-trust"><ShieldCheck size={17} /> Secure accounts <span>·</span> Verified listings</div>
        </section>

        <section className="auth-card-navy">
          <div className="auth-card-heading">
            <div className="eyebrow">{signup ? "JOIN HOSTELHUB" : "WELCOME BACK"}</div>
            <h2>{signup ? "Create your account" : "Sign in to HostelHub"}</h2>
            <p>{signup ? "Choose the account type you want to create." : "Select your role and enter your details."}</p>
          </div>

          <div className="role-picker" role="group" aria-label="Choose account role">
            <button type="button" className={`role-option ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")}><UserRound size={18} />Student</button>
            <button type="button" className={`role-option ${role === "owner" ? "active" : ""}`} onClick={() => setRole("owner")}><Building2 size={18} />Owner</button>
            {!signup && <button type="button" className={`role-option ${role === "admin" ? "active" : ""}`} onClick={() => setRole("admin")}><ShieldCheck size={18} />Admin</button>}
          </div>

          <div className="role-description"><CheckCircle2 size={16} /> {role === "admin" ? "Manage users, listings, approvals, and platform reports." : role === "owner" ? "List your hostel, manage vacancies, and respond to residents." : "Browse freely, then sign in when you want to book or save a hostel."}</div>
          {error && <div className="account-alert error" role="alert">{error}</div>}

          <form className="auth-form" onSubmit={submit}>
            {signup && <>
              <label>Full name<input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
              <label>Phone number <span className="optional-label">(optional)</span><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
            </>}
            <label>Email<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
            <label>Password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 8 : undefined} required /></label>
            {signup && role === "owner" && <p className="muted">Your hostel listing may require administrator approval before appearing publicly.</p>}
            {!signup && role === "admin" && <p className="muted">Administrator accounts are provisioned securely and cannot be created through public signup.</p>}
            <button className="btn btn-primary full auth-submit" type="submit" disabled={loading}>{loading ? "Please wait…" : signup ? `Create ${ROLE_LABELS[role]} Account` : `Sign in as ${ROLE_LABELS[role]}`}</button>
          </form>

          <p className="auth-switch">{signup ? "Already have an account? " : "Don't have an account? "}<Link to={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Sign up"}</Link></p>
          <p className="auth-legal">You can continue browsing hostels without signing in. An account is required for bookings, wishlists, reviews, and dashboards.</p>
        </section>
      </div>
    </main>
  );
}
