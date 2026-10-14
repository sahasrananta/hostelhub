import React, { useEffect, useState } from "react";
import {
  Building2,
  Save,
  CheckCircle2,
  ArrowLeft,
  Upload,
  Trash2,
  Image as ImageIcon,
  BedDouble,
  Utensils,
  Bell,
  ClipboardList
} from "lucide-react";
import { Link } from "react-router-dom";
import { API_BASE, API_ORIGIN } from "./api";

const API = API_BASE;

const emptyHostel = {
  name: "",
  gender: "Boys",
  city: "",
  address: "",
  description: "",
  phone: "",
  email: "",
  amenities: [],
  rules: []
};

const availableAmenities = [
  "WiFi",
  "Food",
  "CCTV",
  "Laundry",
  "Study Room",
  "Parking",
  "Gym",
  "Common Room",
  "Power Backup"
];

export default function OwnerHostelConnected({ notify }) {
  const [hostel, setHostel] = useState(emptyHostel);
  const [hostelId, setHostelId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [rulesText, setRulesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [predefined, setPredefined] = useState([]);

  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    loadHostel();
  }, []);

  const loadHostel = async () => {
    try {
      if (!token) {
        setError("Please sign in as a hostel owner.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API}/hostels/mine`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load hostel");
      }

      if (Array.isArray(data) && data.length > 0) {
        const h = data[0];
        setHostelId(h.id);
        setPhotos(Array.isArray(h.photos) ? h.photos : []);

        setHostel({
          name: h.name || "",
          gender: h.gender || "Boys",
          city: h.city || "",
          address: h.address || "",
          description: h.description || "",
          phone: h.phone || "",
          email: h.email || "",
          amenities: Array.isArray(h.amenities) ? h.amenities : [],
          rules: Array.isArray(h.rules) ? h.rules : []
        });

        setRulesText(
          Array.isArray(h.rules) ? h.rules.join("\n") : ""
        );
      }
      const publicResponse = await fetch(`${API}/hostels`);
      const publicData = await publicResponse.json();
      setPredefined(Array.isArray(publicData) ? publicData.slice(0, 8) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setHostel((current) => ({
      ...current,
      [field]: value
    }));
    setSaved(false);
  };

  const toggleAmenity = (amenity) => {
    setHostel((current) => {
      const exists = current.amenities.includes(amenity);
      return {
        ...current,
        amenities: exists
          ? current.amenities.filter((x) => x !== amenity)
          : [...current.amenities, amenity]
      };
    });
    setSaved(false);
  };

  const saveHostel = async () => {
    if (!hostel.name.trim()) {
      notify("Please enter the hostel name.");
      return;
    }

    if (!hostel.city.trim()) {
      notify("Please enter the city.");
      return;
    }

    setSaving(true);

    try {
      const rules = rulesText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      const payload = {
        ...hostel,
        rules
      };

      const url = hostelId ? `${API}/hostels/${hostelId}` : `${API}/hostels`;
      const method = hostelId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save hostel");
      }

      setHostelId(data.id);
      setPhotos(Array.isArray(data.photos) ? data.photos : photos);

      setSaved(true);
      notify(hostelId ? "Hostel information updated." : "Hostel created successfully.");
    } catch (err) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhotos = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!hostelId) {
      notify("Please save the hostel information first before uploading photos.");
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("photos", files[i]);
    }

    setUploading(true);
    try {
      const res = await fetch(`${API}/hostels/${hostelId}/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Photo upload failed");
      notify("Hostel photos uploaded successfully.");
      await loadHostel();
    } catch (err) {
      notify(err.message || "Failed to upload photos");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Remove this hostel photo?")) return;
    try {
      const res = await fetch(`${API}/hostels/${hostelId}/photos/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete photo");
      notify("Photo removed.");
      setPhotos((current) => current.filter((p) => p.id !== photoId));
    } catch (err) {
      notify(err.message || "Failed to delete photo");
    }
  };

  if (loading) {
    return (
      <main className="portal">
        <div className="container">
          <div className="empty">Loading hostel information...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="portal">
        <div className="container">
          <div className="empty">
            <Building2 size={40} />
            <h2>Unable to load hostel</h2>
            <p>{error}</p>
            <Link to="/owner" className="btn btn-primary">
              <ArrowLeft size={17} /> Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="portal">
      <div className="container portal-layout">
        <aside className="portal-side">
          <div className="brand">
            <span className="brand-mark">H</span>HostelHub
          </div>
          <div className="portal-role">OWNER</div>
          <nav>
            <Link to="/owner"><Building2 />Overview</Link>
            <Link to="/owner/hostel"><Building2 />My Hostel</Link>
            <Link to="/owner/vacancies"><BedDouble />Manage Vacancies</Link>
            <Link to="/owner/menu"><Utensils />Food Menu</Link>
            <Link to="/owner/updates"><Bell />Updates</Link>
          </nav>
        </aside>

        <section className="portal-main">
          <div className="portal-top">
            <div>
              <div className="eyebrow">OWNER</div>
              <h1>My Hostel</h1>
            </div>
            <span className="user-avatar">O</span>
          </div>

          <div className="panel form-panel">
            {!hostelId && predefined.length > 0 && (
              <div className="panel" style={{ marginBottom: 20, background: "#f8fafc" }}>
                <div className="panel-head">
                  <div>
                    <h2>Predefined hostel listings</h2>
                    <p className="muted">Use an existing listing as a starting point, or submit a completely new hostel for admin approval.</p>
                  </div>
                  <span className="badge dark">Request New Hostel</span>
                </div>
                <div className="hostel-grid">
                  {predefined.map((listing) => (
                    <button type="button" className="city-card" key={listing.id} onClick={() => {
                      setHostel((current) => ({
                        ...current,
                        name: listing.name || "",
                        city: listing.city || "",
                        address: listing.address || "",
                        description: listing.description || "",
                        gender: listing.gender || "Co-ed",
                        amenities: Array.isArray(listing.amenities) ? listing.amenities : []
                      }));
                      notify("Listing details copied. Review and submit the request.");
                    }}>
                      <strong>{listing.name}</strong>
                      <span>{listing.city} · {listing.available_beds ?? 0} beds</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="panel-head">
              <div>
                <h2>{hostelId ? "Hostel information" : "Add your hostel"}</h2>
                <p className="muted">
                  {hostelId
                    ? "Update the information and photos students see on HostelHub."
                    : "Enter your hostel details to create your listing."}
                </p>
              </div>

              <button
                className="btn btn-primary small"
                onClick={saveHostel}
                disabled={saving}
              >
                {saved ? <CheckCircle2 size={17} /> : <Save size={17} />}
                {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
              </button>
            </div>

            <div className="two">
              <label>
                Hostel name
                <input
                  className="input"
                  value={hostel.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Example: Sri Sai Boys Hostel"
                />
              </label>

              <label>
                Hostel type
                <select
                  className="input"
                  value={hostel.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                >
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                  <option value="Co-ed">Co-ed</option>
                </select>
              </label>
            </div>

            <div className="two">
              <label>
                City
                <input
                  className="input"
                  value={hostel.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Hyderabad"
                />
              </label>

              <label>
                Phone
                <input
                  className="input"
                  value={hostel.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="9876543210"
                />
              </label>
            </div>

            <label>
              Full address
              <input
                className="input"
                value={hostel.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Madhapur, Hyderabad, Telangana"
              />
            </label>

            <label>
              Owner email
              <input
                className="input"
                type="email"
                value={hostel.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="owner@example.com"
              />
            </label>

            <label>
              About hostel
              <textarea
                className="input textarea"
                value={hostel.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe your hostel, facilities, location and student experience..."
              />
            </label>

            <div className="form-section">
              <h3>Amenities</h3>
              <div className="amenity-grid">
                {availableAmenities.map((amenity) => (
                  <label className="check" key={amenity}>
                    <input
                      type="checkbox"
                      checked={hostel.amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>Hostel rules</h3>
              <p className="muted">Enter one rule per line.</p>
              <textarea
                className="input textarea"
                value={rulesText}
                onChange={(e) => {
                  setRulesText(e.target.value);
                  setSaved(false);
                }}
                placeholder={"No smoking\nVisitors allowed until 8 PM\nMaintain room cleanliness"}
              />
            </div>

            {/* Hostel Photos Management */}
            <div className="form-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h3>Hostel photos ({photos.length})</h3>
                  <p className="muted">Upload photos of rooms, building, mess, and common areas (JPG, PNG, WEBP, max 5MB).</p>
                </div>
                {hostelId && (
                  <label className="btn btn-outline small" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Upload size={16} />
                    {uploading ? "Uploading..." : "Add photos"}
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={handleUploadPhotos}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {!hostelId && (
                <p className="muted">Save the hostel first to enable photo uploads.</p>
              )}

              {photos.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      style={{
                        position: "relative",
                        borderRadius: 8,
                        overflow: "hidden",
                        aspectRatio: "4/3",
                        border: "1px solid var(--border, #e2e8f0)",
                        background: "#f8fafc"
                      }}
                    >
                      <img
                        src={`${API_ORIGIN}${photo.url}`}
                        alt="Hostel"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        title="Delete photo"
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          background: "rgba(220, 38, 38, 0.85)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: 26,
                          height: 26,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                hostelId && <p className="muted">No photos uploaded yet. Click "Add photos" to upload images.</p>
              )}
            </div>

            <div className="save-bottom" style={{ marginTop: 24 }}>
              <button
                className="btn btn-primary"
                onClick={saveHostel}
                disabled={saving}
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save hostel information"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}