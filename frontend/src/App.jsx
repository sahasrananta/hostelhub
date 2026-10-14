import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Search, Heart, MapPin, Star, ShieldCheck,
  ArrowRight, Menu, X, CheckCircle2, CreditCard,
  Bell, BedDouble, Users, Settings, Building2,
  LayoutDashboard, ClipboardList, Utensils, MessageSquare, LogIn,
  Plus, Save, Send
} from "lucide-react";
import OwnerHostelConnected from "./OwnerHostelConnected";
import OwnerAuth from "./OwnerAuth";
import OwnerDashboardConnected from "./OwnerDashboardConnected";
import OwnerMenuConnected from "./OwnerMenuConnected";
import OwnerUpdatesConnected from "./OwnerUpdatesConnected";
import AdminDashboard from "./AdminDashboard";
import StudentDashboard from "./StudentDashboard";
import StudentComplaints from "./StudentComplaints";
import AccountSettings from "./AccountSettings";
import { API_BASE, API_ORIGIN } from "./api";
import { hostels } from "./data/hostels";

const LOCATION_ALIASES = {
  mlrit: ["mlrit", "maisammaguda", "dundigal", "gundlapochampally", "bowrampet", "bachupally", "medchal"],
  cmrit: ["cmrit", "kandlakoya", "medchal", "kompally", "gundlapochampally"],
  "vnr vjiet": ["vnr vjiet", "bachupally", "nizampet", "pragathi nagar", "kukatpally"],
  jntuh: ["jntuh", "kukatpally", "balkampet", "miyapur", "nizampet"],
  "iiit hyderabad": ["iiit hyderabad", "gachibowli", "nallagandla", "lingampally", "serilingampally"],
  medchal: ["medchal", "dundigal", "gandimaisamma", "domarapochampally", "maisammaguda", "gundlapochampally", "bowrampet", "bahadurpally", "kompally", "quthbullapur"]
};

function matchesLocation(value, text) {
  const term = String(value || "").trim().toLowerCase();
  const haystack = String(text || "").toLowerCase();
  const terms = LOCATION_ALIASES[term] || [term];
  return !term || terms.some((item) => haystack.includes(item));
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function RequireAuth({ user, authReady, roles, children }) {
  if (!authReady) {
    return <main className="page"><div className="container narrow"><div className="empty">Restoring your session...</div></div></main>;
  }
  if (user && (!roles || roles.includes(user.role))) return children;
  if (user) {
    return <main className="page"><div className="container narrow"><div className="empty auth-required"><h2>Account role not permitted</h2><p>This area is restricted to the appropriate account type.</p><Link to="/" className="btn btn-outline">Return home</Link></div></div></main>;
  }
  return (
    <main className="page">
      <div className="container narrow">
        <div className="empty auth-required">
          <LogIn size={38} />
          <h2>Sign in to continue</h2>
          <p>Create an account or sign in to use this feature. Browsing hostels does not require an account.</p>
          <div className="auth-required-actions">
            <Link to="/login" className="btn btn-primary">Sign in</Link>
            <Link to="/signup" className="btn btn-outline">Create account</Link>
            <Link to="/hostels" className="btn btn-ghost">Continue browsing</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function App() {
  const [wishlist, setWishlist] = useState([]);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      try {
        const stored = localStorage.getItem("hostelhub_user");
        const u = stored ? JSON.parse(stored) : null;
        const token = localStorage.getItem("hostelhub_token");
        if (token) {
          const accountResponse = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!accountResponse.ok) throw new Error("Session expired");
          const accountData = await accountResponse.json();
          const currentUser = accountData.user;
          localStorage.setItem("hostelhub_user", JSON.stringify(currentUser));
          setUser(currentUser);
          fetch(`${API_BASE}/wishlist`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
              if (Array.isArray(data)) {
                setWishlist(data.map((h) => h.id));
              }
            })
            .catch(() => {});
        } else {
          setUser(null);
          setWishlist([]);
        }
      } catch {
        localStorage.removeItem("hostelhub_token");
        localStorage.removeItem("hostelhub_user");
        setUser(null);
        setWishlist([]);
      } finally {
        setAuthReady(true);
      }
    };

    syncUser();
    window.addEventListener("hostelhub-auth-change", syncUser);
    return () => window.removeEventListener("hostelhub-auth-change", syncUser);
  }, []);

  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  };

  const toggleWishlist = async (id) => {
    const token = localStorage.getItem("hostelhub_token");
    if (!user || !token) {
      notify("Please sign in to save hostels to your wishlist.");
      return;
    }

    const isLiked = wishlist.includes(id);
    setWishlist((current) =>
      isLiked ? current.filter((x) => x !== id) : [...current, id]
    );

    try {
      if (isLiked) {
        await fetch(`${API_BASE}/wishlist/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        notify("Removed from wishlist.");
      } else {
        await fetch(`${API_BASE}/wishlist/${id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        notify("Saved to wishlist.");
      }
    } catch {}
  };

  return (
    <>
      <Header user={user} wishlistCount={wishlist.length} />
      <Routes>
        <Route path="/" element={<Home toggleWishlist={toggleWishlist} wishlist={wishlist} />} />
        <Route path="/hostels" element={<Browse toggleWishlist={toggleWishlist} wishlist={wishlist} />} />
        <Route path="/hostels/:id" element={<HostelDetails toggleWishlist={toggleWishlist} wishlist={wishlist} user={user} notify={notify} />} />
        <Route path="/login" element={<OwnerAuth />} />
        <Route path="/signup" element={<OwnerAuth signup />} />
        <Route path="/owner" element={<RequireAuth user={user} authReady={authReady} roles={["owner"]}><OwnerDashboardConnected /></RequireAuth>} />
        <Route path="/owner/hostel" element={<RequireAuth user={user} authReady={authReady} roles={["owner"]}><OwnerHostelConnected notify={notify} /></RequireAuth>} />
        <Route path="/owner/rooms" element={<RequireAuth user={user} authReady={authReady} roles={["owner"]}><OwnerRooms notify={notify} /></RequireAuth>} />
        <Route path="/owner/vacancies" element={<RequireAuth user={user} authReady={authReady} roles={["owner"]}><OwnerRooms notify={notify} /></RequireAuth>} />
        <Route path="/owner/menu" element={<RequireAuth user={user} authReady={authReady} roles={["owner"]}><OwnerMenuConnected notify={notify} /></RequireAuth>} />
        <Route path="/owner/updates" element={<RequireAuth user={user} authReady={authReady} roles={["owner"]}><OwnerUpdatesConnected notify={notify} /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth user={user} authReady={authReady} roles={["admin"]}><AdminDashboard /></RequireAuth>} />
        <Route path="/resident" element={<RequireAuth user={user} authReady={authReady} roles={["student", "resident"]}><StudentDashboard notify={notify} /></RequireAuth>} />
        <Route path="/complaints" element={<RequireAuth user={user} authReady={authReady} roles={["student", "resident"]}><StudentComplaints /></RequireAuth>} />
        <Route path="/account-settings" element={<RequireAuth user={user} authReady={authReady}><AccountSettings /></RequireAuth>} />

        <Route path="/booking/:id" element={<Booking user={user} notify={notify} />} />
        <Route path="/payment/:id" element={<Payment user={user} notify={notify} />} />
        <Route path="/wishlist" element={<RequireAuth user={user} authReady={authReady}><Wishlist toggleWishlist={toggleWishlist} /></RequireAuth>} />
      </Routes>
      <Footer />
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function Header({ user, wishlistCount }) {
  const [open, setOpen] = useState(false);
  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "admin";
  const isResident = Boolean(user?.active_resident);
  const isStudent = user?.role === "student" || user?.role === "resident";
  return (
    <header className="header">
      <div className="container nav">
        <Link to="/" className="brand"><span className="brand-mark">H</span>HostelHub</Link>
        <button className="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
        <nav className={open ? "nav-links open" : "nav-links"}>
          {!isOwner && !isAdmin && !isResident && <Link to="/hostels">Browse Hostels</Link>}
          {!isOwner && !isAdmin && !isResident && <a href="/#how">How it works</a>}
          {isStudent && !isResident && (
            <>
              <Link to="/resident">My Bookings</Link>
              <Link to="/wishlist" className="wishlist-link"><Heart size={17}/> Wishlist {wishlistCount > 0 && <span>{wishlistCount}</span>}</Link>
            </>
          )}
          {isResident && <>
            <Link to="/resident?tab=overview">Resident Dashboard</Link>
            <Link to="/resident?tab=updates">Announcements</Link>
            <Link to="/resident?tab=reviews">Reviews</Link>
            <Link to="/resident?tab=complaints">Complaints</Link>
            <Link to="/resident?tab=reports">Suspicious Hostels</Link>
          </>}
          {isOwner && <>
            <Link to="/owner">Owner Dashboard</Link>
            <Link to="/owner/hostel">My Hostels</Link>
            <Link to="/owner/vacancies">Manage Vacancies</Link>
            <Link to="/owner/menu">Food Menu</Link>
            <Link to="/owner/updates">Updates</Link>
          </>}
          {isAdmin && <Link to="/admin">Admin Dashboard</Link>}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link to="/account-settings" className="btn btn-outline small" title="Account settings">
                <Settings size={15} /> Account
              </Link>
            </div>
          ) : (
            <Link to="/login" className="btn btn-outline small">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function Home({ toggleWishlist, wishlist }) {
  const [featuredHostels, setFeaturedHostels] = useState([]);
  const [showAuthPrompt, setShowAuthPrompt] = useState(() => !localStorage.getItem("hostelhub_user"));
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/hostels`)
      .then((response) => { if (!response.ok) throw new Error("Could not load hostels"); return response.json(); })
      .then((data) => { if (!cancelled) setFeaturedHostels(Array.isArray(data) ? data.slice(0, 3) : []); })
      .catch(() => { if (!cancelled) setFeaturedHostels([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero-bg"/>
        <div className="container hero-content">
          <div className="eyebrow">STUDENT LIVING, MADE SIMPLE</div>
          <h1>Find a hostel that<br/><em>feels like home.</em></h1>
          <p>Browse trusted student hostels, compare rooms, check vacancies and book your next stay.</p>
          <SearchBox />
          <div className="hero-trust"><span><ShieldCheck size={18}/> Verified listings</span><span><CreditCard size={18}/> Secure payments</span><span><Users size={18}/> Student-friendly</span></div>
        </div>
      </section>

      <section className="section container">
        <SectionHeading eyebrow="EXPLORE" title="Popular student destinations" action="View all" to="/hostels"/>
        <div className="city-grid">
          {["Hyderabad","Bengaluru","Chennai","Pune"].map((city, i) => (
            <Link className="city-card" to={`/hostels?city=${city}`} key={city}>
              <div className={`city-img city-${i}`}></div>
              <div><h3>{city}</h3><p>{i === 0 ? "Explore" : "Discover"} hostels</p></div>
              <ArrowRight size={20}/>
            </Link>
          ))}
        </div>
      </section>

      <section className="section soft">
        <div className="container">
          <SectionHeading eyebrow="HANDPICKED" title="Popular hostels" action="Browse all" to="/hostels"/>
          <div className="hostel-grid">
            {featuredHostels.map(h => <HostelCard key={h.id} hostel={h} liked={wishlist.includes(h.id)} onLike={toggleWishlist}/>)}
          </div>
        </div>
      </section>

      <section className="section container" id="how">
        <SectionHeading eyebrow="HOW IT WORKS" title="From search to stay, simply"/>
        <div className="steps">
          {[
            ["01","Browse","Explore hostels by city, area, price, room type and amenities."],
            ["02","Compare","Check photos, vacancies, fees, food menu, reviews and rules."],
            ["03","Book","Choose your room and complete your booking securely."],
            ["04","Live","Once you're a resident, manage fees and updates in one place."]
          ].map(([n,t,d]) => <div className="step" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      {showAuthPrompt && (
        <div className="auth-prompt-backdrop" role="presentation">
          <section className="auth-prompt" role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title">
            <button className="auth-prompt-close" onClick={() => setShowAuthPrompt(false)} aria-label="Continue browsing without signing in"><X size={20} /></button>
            <div className="eyebrow">WELCOME TO HOSTELHUB</div>
            <h2 id="auth-prompt-title">Find your next hostel</h2>
            <p>Sign in or create an account to save hostels, book rooms, post reviews, and access your dashboard. You can continue browsing without signing in.</p>
            <div className="auth-required-actions">
              <Link to="/login" className="btn btn-primary">Sign in</Link>
              <Link to="/signup" className="btn btn-outline">Create account</Link>
              <button className="btn btn-ghost" onClick={() => setShowAuthPrompt(false)}>Continue browsing</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [type, setType] = useState("Any");

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (type !== "Any") params.set("gender", type);
    navigate(`/hostels?${params.toString()}`);
  };

  return (
    <form className="search-box" onSubmit={submit}>
      <div className="search-field">
        <MapPin size={20}/>
        <div>
          <small>LOCATION</small>
          <input
            placeholder="City, area or college"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
      </div>
      <div className="search-field">
        <Users size={20}/>
        <div>
          <small>HOSTEL TYPE</small>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Any</option>
            <option>Boys</option>
            <option>Girls</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary" type="submit"><Search size={19}/> Search</button>
    </form>
  );
}

function Browse({ toggleWishlist, wishlist }) {
  const [searchParams] = useSearchParams();
  const initialCity = searchParams.get("city") || "";
  const initialGender = searchParams.get("gender") || "All";

  const [hostelList, setHostelList] = useState([]);
  const [query, setQuery] = useState(initialCity);
  const [gender, setGender] = useState(initialGender);
  const [roomType, setRoomType] = useState("All");
  const [amenity, setAmenity] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(15000);
  const [minBeds, setMinBeds] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("recommended");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compareIds, setCompareIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/hostels`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load hostels");
        return data;
      })
      .then((data) => {
        if (!cancelled) setHostelList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not connect to backend");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [initialCity]);

  const suggestions = ["MLRIT", "CMRIT", "VNR VJIET", "JNTUH", "IIIT Hyderabad", "Dundigal", "Medchal", "Maisammaguda", "Bachupally", "Kompally", "Gachibowli", "Madhapur", "Kondapur", "Kukatpally"];
  let list = hostelList.filter((h) =>
    (gender === "All" || h.gender === gender || (gender === "Co-ed" && h.gender === "Co-living")) &&
    Number(h.price || 0) >= minPrice &&
    Number(h.price || 0) <= maxPrice &&
    Number(h.available_beds || 0) >= minBeds &&
    Number(h.rating || 0) >= minRating &&
    (roomType === "All" || String(h.room_types || "").split(",").includes(roomType)) &&
    (!amenity || parseJsonArray(h.amenities).some((item) => item.toLowerCase().includes(amenity.toLowerCase()))) &&
    matchesLocation(query, `${h.name || ""} ${h.city || ""} ${h.address || ""} ${h.description || ""}`)
  );
  if (sort === "price") list = [...list].sort((a,b) => Number(a.price || 0) - Number(b.price || 0));
  if (sort === "rating") list = [...list].sort((a,b) => Number(b.rating || 0) - Number(a.rating || 0));
  if (sort === "availability") list = [...list].sort((a,b) => Number(b.available_beds || 0) - Number(a.available_beds || 0));
  const compareHostels = list.filter((h) => compareIds.includes(h.id));
  const toggleCompare = (id) => setCompareIds((current) => current.includes(id)
    ? current.filter((value) => value !== id)
    : current.length >= 3 ? current : [...current, id]);

  return (
    <main className="page">
      <div className="container">
        <div className="page-title"><div><div className="eyebrow">EXPLORE</div><h1>Find your next hostel</h1><p>Compare verified student accommodations and choose what fits you.</p></div></div>
        <div className="browse-layout">
          <aside className="filters">
            <div className="filter-title">Filters <button onClick={()=>{setGender("All");setRoomType("All");setAmenity("");setMinPrice(0);setMaxPrice(15000);setMinBeds(0);setMinRating(0);setQuery("")}}>Reset</button></div>
            <label>Search<div style={{ display: "flex", gap: 8 }}><input className="input" list="location-suggestions" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Hostel, college, area, city"/>{query && <button type="button" className="btn btn-outline small" onClick={() => setQuery("")}>Clear</button>}</div><datalist id="location-suggestions">{suggestions.map((item) => <option key={item} value={item} />)}</datalist></label>
            <label>Hostel type
              <select className="input" value={gender} onChange={e=>setGender(e.target.value)}><option>All</option><option>Boys</option><option>Girls</option><option>Co-ed</option></select>
            </label>
            <label>Room type<select className="input" value={roomType} onChange={e=>setRoomType(e.target.value)}><option>All</option><option>2 Sharing</option><option>3 Sharing</option><option>4 Sharing</option><option>5 Sharing</option></select></label>
            <label>Amenity<input className="input" value={amenity} onChange={e=>setAmenity(e.target.value)} placeholder="WiFi, food, laundry"/></label>
            <label>Minimum monthly rent <strong>₹{minPrice.toLocaleString()}</strong><input type="range" min="0" max="25000" step="500" value={minPrice} onChange={e=>setMinPrice(Number(e.target.value))}/></label>
            <label>Maximum monthly rent <strong>₹{maxPrice.toLocaleString()}</strong><input type="range" min="3000" max="25000" step="500" value={maxPrice} onChange={e=>setMaxPrice(Number(e.target.value))}/></label>
            <label>Minimum available beds<input className="input" type="number" min="0" value={minBeds} onChange={e=>setMinBeds(Number(e.target.value))}/></label>
            <label>Minimum rating<select className="input" value={minRating} onChange={e=>setMinRating(Number(e.target.value))}><option value="0">Any rating</option><option value="3">3+</option><option value="4">4+</option><option value="4.5">4.5+</option></select></label>
          </aside>
          <section>
            <div className="result-bar"><strong>{loading ? "Loading hostels..." : `${list.length} hostels found`}</strong><select className="sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="price">Price: low to high</option><option value="availability">Most vacancies</option></select></div>
            {error && <div className="empty">{error}</div>}
            {!loading && !error && <div className="hostel-list">{list.map(h=><HostelCard key={h.id} hostel={h} liked={wishlist.includes(h.id)} onLike={toggleWishlist} compareSelected={compareIds.includes(h.id)} onCompare={toggleCompare} horizontal/>)}</div>}
            {!loading && !error && list.length === 0 && <div className="empty">No hostels match these filters.</div>}
            {compareHostels.length > 1 && <section className="panel compare-panel">
              <div className="panel-head"><h2>Compare hostels</h2><button className="btn btn-outline small" onClick={() => setCompareIds([])}>Clear</button></div>
              <div className="comparison-grid">
                {compareHostels.map((h) => <div key={h.id}><strong>{h.name}</strong><p>{h.address || h.city}</p><p>From ₹{Number(h.price || 0).toLocaleString()} · {h.available_beds || 0} beds</p><p>{parseJsonArray(h.amenities).slice(0, 4).join(" · ") || "Amenities not listed"}</p></div>)}
              </div>
            </section>}
          </section>
        </div>
      </div>
    </main>
  );
}

function HostelCard({ hostel:h, liked, onLike, compareSelected, onCompare, horizontal=false }) {
  const imageUrl = h.photos?.[0]?.url
    ? `${API_ORIGIN}${h.photos[0].url}`
    : h.image_url || null;
  const price = Number(h.price || 0);
  const rating = Number(h.rating || 0).toFixed(1);
  const amenities = parseJsonArray(h.amenities);
  return (
    <article className={horizontal ? "hostel-card horizontal" : "hostel-card"}>
      <div className={`hostel-image ${imageUrl ? "" : "img-sunrise"}`} style={imageUrl ? {backgroundImage:`url(${imageUrl})`} : undefined}>
        <span className="badge">{h.gender || "Student"}</span>
        <button className={liked ? "like active" : "like"} onClick={()=>onLike(h.id)}><Heart size={19} fill={liked ? "currentColor" : "none"}/></button>
      </div>
      <div className="hostel-info">
        <div className="rating"><Star size={15} fill="currentColor"/>{rating} <span>({h.review_count || 0} reviews)</span></div>
        <h3>{h.name}</h3><p className="location"><MapPin size={15}/>{h.address || h.city}{h.city && h.address ? ` · ${h.city}` : ""}</p>
        <div className="amenities">{amenities.slice(0,3).map(a=><span key={a}>{a}</span>)}</div>
        {onCompare && <button className="btn btn-outline small" onClick={() => onCompare(h.id)}>{compareSelected ? "Compared" : "Compare"}</button>}
        <div className="card-bottom"><div><small>Starting from</small><strong>{price ? `₹${price.toLocaleString()}` : "Price unavailable"}{price > 0 && <small>/month</small>}</strong><p>{Number(h.available_beds || 0)} beds available</p></div><Link to={`/hostels/${h.id}`} className="btn btn-dark">View hostel</Link></div>
      </div>
    </article>
  );
}

function HostelDetails({ toggleWishlist, wishlist, user, notify }) {
  const { id } = useParams();
  const [h, setH] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_BASE}/hostels/${id}`, { headers })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load hostel");
        return data;
      })
      .then((data) => {
        if (!cancelled) setH(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to connect to backend");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, token]);

  const handlePostReview = async (e) => {
    e.preventDefault();
    if (!token) {
      notify("Please sign in to submit a review.");
      return;
    }
    try {
      setSubmittingReview(true);
      const res = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          hostel_id: h.id,
          rating: Number(revRating),
          comment: revComment.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit review");
      notify("Thank you! Your review has been added.");
      setH((prev) => ({
        ...prev,
        reviews: [data, ...(prev.reviews || [])]
      }));
      setRevComment("");
    } catch (err) {
      notify(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <main className="page"><div className="container"><div className="empty">Loading hostel details...</div></div></main>;
  if (error || !h) return <main className="page"><div className="container"><div className="empty">{error || "Hostel not found."}</div></div></main>;

  const primaryImage = h.photos?.[0]?.url
    ? `${API_ORIGIN}${h.photos[0].url}`
    : h.image_url || null;
  const imageClass = primaryImage ? "" : "img-sunrise";
  const rooms = h.rooms || [];
  const menu = h.menu || [];
  const reviews = h.reviews || [];
  const amenities = parseJsonArray(h.amenities);
  const availableBeds = rooms.reduce((sum, room) => sum + Number(room.available_beds || 0), 0);
  const averageRating = h.rating ? Number(h.rating).toFixed(1) : "0.0";

  return (
    <main className="page">
      <div className="container">
        <div className="breadcrumbs"><Link to="/hostels">Hostels</Link> / {h.name}</div>
        <div className="detail-gallery">
          <div className="gallery-main" style={primaryImage ? {backgroundImage:`url(${primaryImage})`} : undefined}></div>
          <div className="gallery-small">
            <div className={imageClass + " g1"} style={h.photos?.[1]?.url ? {backgroundImage:`url(${API_ORIGIN}${h.photos[1].url})`} : undefined}></div>
            <div className={imageClass + " g2"} style={h.photos?.[2]?.url ? {backgroundImage:`url(${API_ORIGIN}${h.photos[2].url})`} : undefined}></div>
          </div>
        </div>
        <div className="detail-head">
          <div><span className="badge dark">{h.gender || "Student"} hostel</span><h1>{h.name}</h1><p className="location"><MapPin size={17}/>{h.address || h.city}{h.city && h.address ? ` · ${h.city}` : ""}</p><div className="rating big"><Star size={18} fill="currentColor"/>{averageRating} <span>Excellent · {h.review_count || reviews.length} reviews</span></div></div>
          <button className={wishlist.includes(h.id) ? "btn btn-outline liked" : "btn btn-outline"} onClick={()=>toggleWishlist(h.id)}><Heart size={18} fill={wishlist.includes(h.id) ? "currentColor":"none"}/> {wishlist.includes(h.id) ? "Saved":"Add to wishlist"}</button>
        </div>
        <div className="detail-layout">
          <div>
            <DetailSection title="About this hostel"><p>{h.description || "No description provided."}</p></DetailSection>
            <DetailSection title="Rooms & pricing">
              <div className="room-table">
                {rooms.length ? rooms.map(r=>(
                  <div className="room-row" key={r.id}>
                    <div><BedDouble size={20}/><strong>{r.room_type}</strong><small>{r.total_beds} total beds</small></div>
                    <strong>₹{Number(r.price_per_month).toLocaleString()}<small>/month</small></strong>
                    <span className="available">{r.available_beds} beds left</span>
                    {r.beds?.length > 0 && <div className="bed-grid">
                      {r.beds.map((bed) => <span key={bed.id} className={`bed-chip ${bed.status}`}>{bed.bed_label}</span>)}
                    </div>}
                    <Link className="btn btn-primary small" to={`/booking/${h.id}?roomId=${r.id}`}>Book</Link>
                  </div>
                )) : <div className="empty">No rooms added yet.</div>}
              </div>
            </DetailSection>
            <DetailSection title="Amenities">
              <div className="amenity-grid">
                {amenities.length ? amenities.map(a=><div key={a}><CheckCircle2 size={17}/>{a}</div>) : <span className="muted">No amenities listed yet.</span>}
              </div>
            </DetailSection>
            <DetailSection title="Food menu">
              <div className="menu-preview">
                {menu.length ? menu.map(item=><div key={item.id}><strong>{item.day}</strong><span>{item.meal}: {item.item}</span></div>) : <div className="muted">No food menu added yet.</div>}
              </div>
            </DetailSection>
            <DetailSection title="Recent reviews">
              <div className="reviews">
                {reviews.length ? reviews.map(r=>(
                  <div className="review" key={r.id}>
                    <div className="review-avatar">{(r.user_name || "U")[0]}</div>
                    <div><strong>{r.user_name || "Resident"}</strong><div className="rating"><Star size={13} fill="currentColor"/>{r.rating}/5</div><p>{r.comment || "No comment"}</p></div>
                  </div>
                )) : <div className="muted">No reviews yet.</div>}
              </div>

              {user && (
                <div style={{ marginTop: 24, background: "#f8fafc", padding: 16, borderRadius: 8 }}>
                  <h3>Leave a review</h3>
                  <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Share your experience staying at {h.name}.</p>
                  <form onSubmit={handlePostReview}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                      <label>Rating:
                        <select className="input" style={{ marginLeft: 6, width: 80 }} value={revRating} onChange={e=>setRevRating(e.target.value)}>
                          <option value={5}>5 ★</option>
                          <option value={4}>4 ★</option>
                          <option value={3}>3 ★</option>
                          <option value={2}>2 ★</option>
                          <option value={1}>1 ★</option>
                        </select>
                      </label>
                    </div>
                    <textarea className="input textarea" rows={2} placeholder="Write your review..." value={revComment} onChange={e=>setRevComment(e.target.value)} required />
                    <button className="btn btn-primary small" type="submit" disabled={submittingReview} style={{ marginTop: 8 }}>
                      <Send size={14}/> {submittingReview ? "Posting..." : "Submit Review"}
                    </button>
                  </form>
                </div>
              )}
            </DetailSection>
          </div>
          <aside className="booking-card">
            <div className="eyebrow">BOOK YOUR STAY</div>
            <h2>Stay at {h.name}</h2>
            <div className="price-large">₹{rooms.length ? Math.min(...rooms.map(r => Number(r.price_per_month))).toLocaleString() : "-"} <small>/month</small></div>
            <div className="availability"><span className="dot"></span>{availableBeds} beds currently available</div>
            <Link to={`/booking/${h.id}`} className="btn btn-primary full">Check rooms & book <ArrowRight size={18}/></Link>
            <p className="muted">Direct reservations with immediate room allocation.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function DetailSection({title, children}) { return <section className="detail-section"><h2>{title}</h2>{children}</section>; }

function Booking({ user, notify }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoomId = searchParams.get("roomId");

  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId || "");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [moveInDate, setMoveInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [phone, setPhone] = useState(user?.phone || "");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/hostels/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load hostel");
        return data;
      })
      .then((data) => {
        if (!cancelled) {
          setHostel(data);
          if (data.rooms?.length && !initialRoomId) {
            setSelectedRoomId(String(data.rooms[0].id));
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load hostel");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, initialRoomId]);

  if (!user) {
    return (
      <main className="page">
        <div className="container narrow">
          <div className="empty">
            <h2>Sign in required</h2>
            <p>Please log in or create an account to book a hostel room.</p>
            <Link to="/login" className="btn btn-primary">Sign in to book</Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page">
        <div className="container narrow">
          <div className="empty">Loading booking details...</div>
        </div>
      </main>
    );
  }

  if (error || !hostel) {
    return (
      <main className="page">
        <div className="container narrow">
          <div className="empty">
            <p>{error || "Hostel not found"}</p>
            <Link to="/hostels" className="btn btn-primary">Browse Hostels</Link>
          </div>
        </div>
      </main>
    );
  }

  const rooms = hostel.rooms || [];
  const selectedRoom = rooms.find((r) => String(r.id) === String(selectedRoomId)) || rooms[0];
  const availableBeds = selectedRoom?.beds?.filter((bed) => bed.status === "available") || [];

  const handleContinue = () => {
    if (!selectedRoom) {
      notify("Please select a room type.");
      return;
    }
    if (selectedRoom.available_beds < 1) {
      notify("No vacancies available in this room type.");
      return;
    }
    if (selectedRoom.beds?.length > 0 && !selectedBedId) {
      notify("Select an available bed to continue.");
      return;
    }
    navigate(`/payment/${hostel.id}?roomId=${selectedRoom.id}&bedId=${selectedBedId}&checkIn=${moveInDate}`);
  };

  return (
    <main className="page">
      <div className="container narrow">
        <div className="eyebrow">BOOKING</div>
        <h1>Reserve your room</h1>
        <p className="lead">Complete your reservation for {hostel.name}.</p>
        <div className="booking-layout">
          <div className="form-card">
            <h2>Stay details</h2>
            <label>
              Room type
              {rooms.length ? (
                <select
                  className="input"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id} disabled={r.available_beds < 1}>
                      {r.room_type} — ₹{Number(r.price_per_month).toLocaleString()}/mo ({r.available_beds} beds left)
                    </option>
                  ))}
                </select>
              ) : (
                <p className="muted">No rooms configured for this hostel yet.</p>
              )}
            </label>
            {selectedRoom?.beds?.length > 0 && (
              <div>
                <label>Select an available bed</label>
                <div className="bed-grid selectable">
                  {selectedRoom.beds.map((bed) => (
                    <button type="button" key={bed.id}
                      className={`bed-chip ${bed.status} ${String(selectedBedId) === String(bed.id) ? "selected" : ""}`}
                      disabled={bed.status !== "available"}
                      onClick={() => setSelectedBedId(String(bed.id))}>
                      {bed.bed_label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label>
              Move-in date
              <input
                className="input"
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
              />
            </label>
            <label>
              Full name
              <input className="input" defaultValue={user.name} readOnly />
            </label>
            <label>
              Phone number
              <input
                className="input"
                placeholder="+91"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <button
              className="btn btn-primary full"
              onClick={handleContinue}
              disabled={!selectedRoom || selectedRoom.available_beds < 1}
            >
              Continue to payment <ArrowRight size={18} />
            </button>
          </div>
          <div className="summary">
            <h3>Booking summary</h3>
            <p><strong>{hostel.name}</strong></p>
            <p>{hostel.address || hostel.city}</p>
            {selectedRoom && (
              <>
                <p>{selectedRoom.room_type}</p>
                <hr />
                <div>
                  <span>Monthly rent</span>
                  <strong>₹{Number(selectedRoom.price_per_month).toLocaleString()}</strong>
                </div>
                <div>
                  <span>Payment due now</span>
                  <strong>₹0</strong>
                </div>
                <hr />
                <div className="total">
                  <span>Due today</span>
                  <strong>₹0</strong>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Payment({ user, notify }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const bedId = searchParams.get("bedId");
  const checkIn = searchParams.get("checkIn") || new Date().toISOString().split("T")[0];

  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    fetch(`${API_BASE}/hostels/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Hostel not found");
        return data;
      })
      .then((data) => setHostel(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (!user || !token) {
    return (
      <main className="page">
        <div className="container narrow">
          <div className="empty">
            <h2>Sign in required</h2>
            <Link to="/login" className="btn btn-primary">Sign in</Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page">
        <div className="container narrow">
          <div className="empty">Loading checkout...</div>
        </div>
      </main>
    );
  }

  if (error || !hostel) {
    return (
      <main className="page">
        <div className="container narrow">
          <div className="empty"><p>{error || "Hostel not found"}</p></div>
        </div>
      </main>
    );
  }

  const selectedRoom = (hostel.rooms || []).find((r) => String(r.id) === String(roomId)) || hostel.rooms?.[0];

  const handlePay = async (e) => {
    e.preventDefault();
    if (!selectedRoom) {
      notify("Please select a room before paying.");
      return;
    }

    try {
      setPaying(true);
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hostel_id: hostel.id,
          room_id: selectedRoom.id,
          bed_id: bedId || null,
          check_in: checkIn,
          simulated_payment: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");

      notify("Booking request submitted using simulated payment. The owner will review it.");
      navigate("/resident");
    } catch (err) {
      notify(err.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <main className="page">
      <div className="container narrow">
        <div className="eyebrow">SIMULATED PAYMENT</div>
        <h1>Submit booking request</h1>
        <div className="payment-card">
          <div className="payment-head">
            <div>
              <h2>{hostel.name}</h2>
              <p>{selectedRoom ? `${selectedRoom.room_type} · Move-in: ${checkIn}` : "Booking fee"}</p>
            </div>
            <strong>₹0 due now</strong>
          </div>
          <form onSubmit={handlePay}>
            <button className="btn btn-primary full" type="submit" disabled={paying}>
              {paying ? "Submitting request..." : "Submit simulated payment"} <CreditCard size={18} />
            </button>
          </form>
          <p className="muted center" style={{ marginTop: 12 }}>
            No card details are collected. This demo records a simulated payment request only.
          </p>
        </div>
      </div>
    </main>
  );
}

function Wishlist({ toggleWishlist }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/wishlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  const handleUnlike = async (id) => {
    await toggleWishlist(id);
    setItems((current) => current.filter((x) => x.id !== id));
  };

  return (
    <main className="page">
      <div className="container">
        <div className="eyebrow">YOUR SAVED HOSTELS</div>
        <h1>Wishlist</h1>
        <p className="lead">Keep track of places you want to visit or book.</p>
        {!token ? (
          <div className="empty">
            <Heart size={35} />
            <h2>Please sign in</h2>
            <p>Sign in to view and save your favourite hostels.</p>
            <Link to="/login" className="btn btn-primary">Sign in</Link>
          </div>
        ) : loading ? (
          <div className="empty">Loading your wishlist...</div>
        ) : items.length ? (
          <div className="hostel-grid">
            {items.map((h) => (
              <HostelCard key={h.id} hostel={h} liked onLike={() => handleUnlike(h.id)} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Heart size={35} />
            <h2>No saved hostels yet</h2>
            <p>Browse hostels and save your favourites here.</p>
            <Link to="/hostels" className="btn btn-primary">Browse hostels</Link>
          </div>
        )}
      </div>
    </main>
  );
}

function OwnerRooms({ notify }) {
  const API = API_BASE;

  const [hostelId, setHostelId] = useState("");
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const roomTypes = ["2 Sharing", "3 Sharing", "4 Sharing", "5 Sharing"];

  const [form, setForm] = useState({
    room_type: "2 Sharing",
    price_per_month: "",
    total_beds: "",
    available_beds: "",
    description: "",
    floor_number: "1",
    room_number: ""
  });

  const token = localStorage.getItem("hostelhub_token");

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        throw new Error("Please sign in to your owner account.");
      }

      const hostelResponse = await fetch(`${API}/hostels/mine`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const hostelData = await hostelResponse.json();

      if (!hostelResponse.ok) {
        throw new Error(hostelData.message || "Could not load your hostel.");
      }

      if (!Array.isArray(hostelData) || hostelData.length === 0) {
        setHostels([]);
        setRooms([]);
        setError("");
        return;
      }

      setHostels(hostelData);
      const requestedHostelId = new URLSearchParams(window.location.search).get("hostelId");
      const hostel = hostelData.find((item) => String(item.id) === requestedHostelId) || hostelData[0];
      setHostelId(String(hostel.id));

      const roomResponse = await fetch(`${API}/rooms/owner/hostel/${hostel.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const roomData = await roomResponse.json();

      if (!roomResponse.ok) {
        throw new Error(roomData.message || "Could not load rooms.");
      }

      const savedRooms = Array.isArray(roomData) ? roomData : [];
      setRooms(savedRooms);
      setSelectedTypes(savedRooms.map((room) => room.room_type));
    } catch (err) {
      setError(err.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }

  }

  async function selectHostel(nextId) {
    window.history.replaceState({}, "", `/owner/rooms?hostelId=${nextId}`);
    setHostelId(String(nextId));
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/rooms/owner/hostel/${nextId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load rooms.");
      setRooms(Array.isArray(data) ? data : []);
      setSelectedTypes((Array.isArray(data) ? data : []).map((room) => room.room_type));
    } catch (err) {
      setError(err.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRoomType(type) {
    const existingRoom = rooms.find((room) => room.room_type === type);

    if (existingRoom) {
      setForm({
        room_type: existingRoom.room_type,
        price_per_month: String(existingRoom.price_per_month),
        total_beds: String(existingRoom.total_beds),
        available_beds: String(existingRoom.available_beds),
        description: existingRoom.description || "",
        floor_number: String(existingRoom.floor_number || 1),
        room_number: existingRoom.room_number || ""
      });
    } else {
      setForm({
        room_type: type,
        price_per_month: "",
        total_beds: "",
        available_beds: "",
        description: "",
        floor_number: "1",
        room_number: ""
      });
    }

    setSelectedTypes((current) =>
      current.includes(type) ? current : [...current, type]
    );
  }

  function changeField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function saveRoom(event) {
    event.preventDefault();

    if (!hostelId) {
      notify("Please add your hostel first.");
      return;
    }

    async function updateBedStatus(bed) {
      const status = bed.status === "available" ? "booked" : "available";
      try {
        const response = await fetch(`${API}/rooms/beds/${bed.id}/status`, {
          method: "PATCH",
          headers: { ...authHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not update bed status");
        setRooms((current) => current.map((room) => room.id === bed.room_id
          ? { ...room, available_beds: Number(room.available_beds) + (status === "available" ? 1 : -1), beds: room.beds.map((item) => item.id === bed.id ? data : item) }
          : room));
        notify(`${bed.bed_label} marked ${status}.`);
      } catch (error) {
        notify(error.message);
      }
    }

    const price = Number(form.price_per_month);
    const total = Number(form.total_beds);
    const available = Number(form.available_beds);

    if (!Number.isFinite(price) || price <= 0) {
      notify("Enter a valid monthly price.");
      return;
    }

    if (
      !Number.isInteger(total) ||
      total < 1 ||
      !Number.isInteger(available) ||
      available < 0 ||
      available > total
    ) {
      notify("Available beds must be between 0 and total beds.");
      return;
    }

    const existingRoom = rooms.find(
      (room) => room.room_type === form.room_type
    );

    const payload = {
      ...form,
      price_per_month: price,
      total_beds: total,
      available_beds: available,
      floor_number: Number(form.floor_number) || 1,
      room_number: form.room_number.trim() || null
    };

    try {
      setSaving(true);

      const response = await fetch(
        existingRoom
          ? `${API}/rooms/${existingRoom.id}`
          : `${API}/rooms/hostel/${hostelId}`,
        {
          method: existingRoom ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save room.");
      }

      notify(`${form.room_type} saved successfully.`);
      await loadRooms();
    } catch (err) {
      notify(err.message || "Failed to save room.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="empty">Loading room details...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="page-title">
          <div>
            <div className="eyebrow">OWNER PORTAL</div>
            <h1>Rooms & Vacancies</h1>
            <p>Manage floors, rooms, prices and live bed vacancies.</p>
          </div>
        </div>

        {hostels.length > 0 && (
          <section className="panel" style={{ marginBottom: 20 }}>
            <label>
              Manage registered hostel
              <select className="input" value={hostelId} onChange={(event) => selectHostel(event.target.value)}>
                {hostels.map((hostel) => <option key={hostel.id} value={hostel.id}>{hostel.name} · {hostel.status}</option>)}
              </select>
            </label>
          </section>
        )}

        {error && (
          <div className="empty">
            <p>{error}</p>
            <button className="btn btn-dark" onClick={loadRooms}>Retry</button>
          </div>
        )}

        {!error && hostels.length === 0 && (
          <div className="empty">
            <h2>No hostel listing found</h2>
            <p>Create your first hostel listing before configuring floors, rooms, and beds.</p>
            <Link to="/owner/hostel" className="btn btn-primary">Request New Hostel</Link>
          </div>
        )}

        {!error && hostels.length > 0 && (
          <>
            <section className="panel">
              <h2>Choose room types offered by your hostel</h2>
              <div className="amenity-grid">
                {roomTypes.map((type) => {
                  const room = rooms.find((item) => item.room_type === type);
                  const selected = selectedTypes.includes(type);

                  return (
                    <button
                      type="button"
                      key={type}
                      className={`btn ${selected ? "btn-primary" : "btn-outline"}`}
                      onClick={() => toggleRoomType(type)}
                    >
                      {selected ? "✓ " : "+ "}
                      {type}
                      {room && (
                        <span> · {room.available_beds > 0 ? `${room.available_beds} beds available` : "Not Available"}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="muted">
                Choose a room type to add its details or edit an existing type.
              </p>
            </section>

            <section className="panel" style={{ marginTop: 24 }}>
              <h2>Add or edit room details</h2>
              <form onSubmit={saveRoom}>
                <label>
                  Room type
                  <select
                    className="input"
                    value={form.room_type}
                    onChange={(event) => {
                      const type = event.target.value;
                      const room = rooms.find((item) => item.room_type === type);
                      setForm({
                        room_type: type,
                        price_per_month: room ? String(room.price_per_month) : "",
                        total_beds: room ? String(room.total_beds) : "",
                        available_beds: room ? String(room.available_beds) : "",
                        description: room?.description || "",
                        floor_number: String(room?.floor_number || 1),
                        room_number: room?.room_number || ""
                      });
                    }}
                  >
                    {roomTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <div className="two">
                  <label>
                    Monthly price per bed (₹)
                    <input
                      className="input"
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={form.price_per_month}
                      onChange={(event) => changeField("price_per_month", event.target.value)}
                      placeholder="Example: 5000"
                    />
                  </label>

                  <label>
                    Total beds
                    <input
                      className="input"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={form.total_beds}
                      onChange={(event) => changeField("total_beds", event.target.value)}
                      placeholder="Example: 12"
                    />
                  </label>
                </div>

                <div className="two">
                  <label>
                    Floor number
                    <input className="input" type="number" min="1" required value={form.floor_number}
                      onChange={(event) => changeField("floor_number", event.target.value)} />
                  </label>
                  <label>
                    Room number or name
                    <input className="input" value={form.room_number}
                      onChange={(event) => changeField("room_number", event.target.value)}
                      placeholder="Example: 201" />
                  </label>
                </div>

                <label>
                  Available beds
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    max={form.total_beds || undefined}
                    required
                    value={form.available_beds}
                    onChange={(event) => changeField("available_beds", event.target.value)}
                    placeholder="Example: 6"
                  />
                </label>

                <label>
                  Description (optional)
                  <textarea
                    className="input textarea"
                    value={form.description}
                    onChange={(event) => changeField("description", event.target.value)}
                    placeholder="Describe this room type..."
                  />
                </label>

                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Room"}
                </button>
              </form>
            </section>

            <section className="panel" style={{ marginTop: 24 }}>
              <h2>Configured room types</h2>
              {rooms.length === 0 ? (
                <div className="empty">No room types added yet.</div>
              ) : (
                <div className="room-admin">
                  {rooms.map((room) => (
                    <div className="room-admin-row" key={room.id}>
                      <div>
                        <BedDouble />
                        <strong>{room.room_type} · Floor {room.floor_number || 1}{room.room_number ? ` · Room ${room.room_number}` : ""}</strong>
                        <small>{room.total_beds} total beds · {room.available_beds} available</small>
                        {room.beds?.length > 0 && <div className="bed-grid selectable">
                          {room.beds.map((bed) => <button type="button" key={bed.id}
                            className={`bed-chip ${bed.status}`} disabled={bed.status === "occupied"}
                            onClick={() => updateBedStatus({ ...bed, room_id: room.id })}>
                            {bed.bed_label} · {bed.status}
                          </button>)}
                        </div>}
                      </div>
                      <div>
                        <small>Monthly price per bed</small>
                        <strong>₹{Number(room.price_per_month).toLocaleString("en-IN")}</strong>
                      </div>
                      <div>
                        <small>Available beds</small>
                        <strong>{room.available_beds}</strong>
                      </div>
                      <span className={`status ${room.available_beds > 0 ? "green" : ""}`}>
                        {room.available_beds > 0 ? "Available" : "Not Available"}
                      </span>
                      <button
                        className="btn btn-outline small"
                        onClick={() => {
                          setForm({
                            room_type: room.room_type,
                            price_per_month: String(room.price_per_month),
                            total_beds: String(room.total_beds),
                            available_beds: String(room.available_beds),
                            description: room.description || ""
                          });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function SectionHeading({eyebrow,title,action,to}) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {action&&<Link to={to} className="text-link">{action} <ArrowRight size={16}/></Link>}
    </div>
  );
}

function Footer(){
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Link to="/" className="brand"><span className="brand-mark">H</span>HostelHub</Link>
          <p>Find, book and manage student living in one place.</p>
        </div>
        <div>
          <strong>Explore</strong>
          <Link to="/hostels">Hostels</Link>
          <Link to="/hostels">Popular cities</Link>
          <Link to="/wishlist">Saved Wishlist</Link>
        </div>
        <div>
          <strong>Resident</strong>
          <Link to="/resident">Resident portal</Link>
          <Link to="/complaints">Complaints</Link>
          <Link to="/account-settings">Account Security</Link>
        </div>
      </div>
      <div className="container footer-bottom">© 2026 HostelHub · Student Living Platform</div>
    </footer>
  );
}

export default App;