import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "./api";

const API = API_BASE;

export default function AccountSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hostelhub_user") || "null"); }
    catch { return null; }
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = localStorage.getItem("hostelhub_token");

  const logout = () => {
    localStorage.removeItem("hostelhub_token");
    localStorage.removeItem("hostelhub_user");
    window.dispatchEvent(new Event("hostelhub-auth-change"));
    navigate("/login", { replace: true });
  };

  const changePassword = async (event) => {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch(`${API}/auth/change-password`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not change password");
      setCurrentPassword(""); setNewPassword(""); setMessage("Password updated successfully.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    const confirmation = window.prompt('This permanently deletes your HostelHub account. Type DELETE to confirm:');
    if (confirmation !== "DELETE") return;
    const password = window.prompt("Enter your current password to verify account deletion:");
    if (!password) return;
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch(`${API}/auth/me`, {
        method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete account");
      localStorage.removeItem("hostelhub_token"); localStorage.removeItem("hostelhub_user");
      navigate("/", { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (!user || !token) return <main className="page"><div className="container"><div className="empty"><h2>Please sign in first</h2><Link className="btn btn-primary" to="/login">Go to login</Link></div></div></main>;

  return <main className="page account-page"><div className="container account-wrap">
    <div className="page-title"><div><div className="eyebrow">ACCOUNT SECURITY</div><h1>Account settings</h1><p>Manage your HostelHub profile and sign-in security.</p></div><button className="btn btn-outline" onClick={logout}>Log out</button></div>
    {(error || message) && <div className={error ? "account-alert error" : "account-alert success"}>{error || message}</div>}
    <section className="panel account-profile"><div className="account-avatar">{(user.name || user.email || "U").slice(0,1).toUpperCase()}</div><div><h2>{user.name || "HostelHub user"}</h2><p>{user.email}</p><span className="account-role">{user.role || "student"}</span></div></section>
    <section className="panel"><h2>Change password</h2><form className="account-form" onSubmit={changePassword}>
      <label>Current password<input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required /></label>
      <label>New password<input className="input" type="password" autoComplete="new-password" minLength="8" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required /><small>Use at least 8 characters.</small></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Please wait…" : "Update password"}</button>
    </form></section>
    <section className="panel account-danger"><h2>Delete account</h2><p>This action is permanent. Your account will be removed and related records will be handled by the backend database rules.</p><button className="btn btn-danger" disabled={busy} onClick={deleteAccount}>Delete my account</button></section>
  </div></main>;
}
