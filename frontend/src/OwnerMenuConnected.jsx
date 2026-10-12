import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Utensils, Save, Building2, BedDouble, Bell, CheckCircle2 } from "lucide-react";
import { API_BASE, authHeaders } from "./api";

const API = API_BASE;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultMenu = {
  Monday: "Breakfast: Idli, Sambar | Lunch: Rice, Dal, Veg Curry | Dinner: Roti, Sabzi",
  Tuesday: "Breakfast: Dosa, Chutney | Lunch: Rice, Sambar, Poriyal | Dinner: Roti, Paneer",
  Wednesday: "Breakfast: Upma, Chutney | Lunch: Rice, Rasam, Veg Kootu | Dinner: Roti, Dal Fry",
  Thursday: "Breakfast: Poha, Tea | Lunch: Rice, Dal Tadka, Aloo Fry | Dinner: Roti, Mix Veg",
  Friday: "Breakfast: Pongal, Vada | Lunch: Rice, Sambar, Papad | Dinner: Veg Biryani, Raita",
  Saturday: "Breakfast: Puri, Bhaji | Lunch: Lemon Rice, Curd Rice | Dinner: Roti, Chole",
  Sunday: "Breakfast: Masala Dosa | Lunch: Special Veg/Egg Meals | Dinner: Roti, Dal Makhani"
};

export default function OwnerMenuConnected({ notify }) {
  const [hostelId, setHostelId] = useState("");
  const [menu, setMenu] = useState(defaultMenu);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError("");

      const hostelRes = await fetch(`${API}/hostels/mine`, {
        headers: authHeaders(token)
      });
      const hostelData = await hostelRes.json();
      if (!hostelRes.ok) throw new Error(hostelData.message || "Could not load hostel");
      if (!Array.isArray(hostelData) || !hostelData.length) {
        throw new Error("Please add your hostel before setting the food menu.");
      }

      const hId = hostelData[0].id;
      setHostelId(hId);

      const menuRes = await fetch(`${API}/menu/hostel/${hId}`);
      const menuData = await menuRes.json();

      if (Array.isArray(menuData) && menuData.length > 0) {
        const loaded = { ...defaultMenu };
        for (const item of menuData) {
          if (item.day) {
            loaded[item.day] = item.item;
          }
        }
        setMenu(loaded);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hostelId) {
      notify("Please add a hostel first.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API}/menu/hostel/${hostelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token)
        },
        body: JSON.stringify({ menu })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update menu");

      setSaved(true);
      notify("Weekly food menu updated successfully.");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="portal">
        <div className="container">
          <div className="empty">Loading weekly food menu...</div>
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
              <h1>Food Menu</h1>
            </div>
            <span className="user-avatar">O</span>
          </div>

          {error ? (
            <div className="empty">
              <p>{error}</p>
              <Link to="/owner/hostel" className="btn btn-primary">Go to My Hostel</Link>
            </div>
          ) : (
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>Weekly food schedule</h2>
                  <p className="muted">Specify the daily meals provided to students and residents.</p>
                </div>
                <button className="btn btn-primary small" onClick={handleSave} disabled={saving}>
                  {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  {saving ? "Saving..." : saved ? "Saved" : "Save menu"}
                </button>
              </div>

              <div className="menu-admin" style={{ display: "grid", gap: 14 }}>
                {DAYS.map((day) => (
                  <label key={day} style={{ display: "grid", gap: 4 }}>
                    <strong>{day}</strong>
                    <textarea
                      className="input textarea"
                      rows={2}
                      value={menu[day] || ""}
                      onChange={(e) => {
                        setMenu({ ...menu, [day]: e.target.value });
                        setSaved(false);
                      }}
                      placeholder={`Enter meal details for ${day}...`}
                    />
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  <Save size={16} /> Save Weekly Menu
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
