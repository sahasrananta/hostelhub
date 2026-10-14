import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "change_this_to_a_long_random_secret") {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};
const createToken = (u) => jwt.sign({ id: u.id, email: u.email, role: u.role }, getJwtSecret(), { expiresIn: "7d" });
const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, is_active: u.is_active ?? 1, active_resident: Boolean(u.active_resident), created_at: u.created_at });

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, role = "student" } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "Name, email and password are required" });
    if (String(password).length < 8) return res.status(400).json({ message: "Password must contain at least 8 characters" });
    if (!["student", "owner"].includes(role)) return res.status(400).json({ message: "Only student and owner accounts can register here. Admin accounts must be provisioned securely." });
    const db = await getDb(), normalizedEmail = email.trim().toLowerCase();
    if (await db.get("SELECT id FROM users WHERE email = ?", normalizedEmail)) return res.status(409).json({ message: "Email already registered" });
    const result = await db.run("INSERT INTO users(name,email,password_hash,phone,role) VALUES(?,?,?,?,?)", name.trim(), normalizedEmail, await bcrypt.hash(password, 10), phone?.trim() || null, role);
    const user = safeUser(await db.get("SELECT id,name,email,phone,role,is_active,created_at,0 AS active_resident FROM users WHERE id = ?", result.lastID));
    return res.status(201).json({ user, token: createToken(user) });
  } catch (e) { console.error("Registration failed:", e); return res.status(500).json({ message: "Registration failed" }); }
});

router.post("/login", async (req, res) => {
  try {
    const db = await getDb(), email = String(req.body.email || "").trim().toLowerCase();
    const u = await db.get("SELECT * FROM users WHERE email = ?", email);
    if (!u || !(await bcrypt.compare(req.body.password || "", u.password_hash))) return res.status(401).json({ message: "Invalid email or password" });
    if (u.is_active === 0) return res.status(403).json({ message: "This account is inactive. Contact an administrator." });
    if (req.body.role && req.body.role !== u.role && !(req.body.role === "student" && u.role === "resident")) return res.status(403).json({ message: `This account is registered as ${u.role}. Choose the matching account type.` });
    const activeResident = await db.get(
      "SELECT 1 AS active_resident FROM bookings WHERE user_id = ? AND status = 'confirmed' LIMIT 1",
      u.id
    );
    const user = safeUser({ ...u, active_resident: Boolean(activeResident) });
    await db.run("INSERT INTO login_events(user_id, email, role) VALUES(?,?,?)", u.id, u.email, u.role);
    return res.json({ user, token: createToken(user) });
  } catch (e) { console.error("Login failed:", e); return res.status(500).json({ message: "Login failed" }); }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get(
      `SELECT id,name,email,phone,role,is_active,created_at,
        EXISTS(SELECT 1 FROM bookings WHERE bookings.user_id = users.id AND bookings.status = 'confirmed') AS active_resident
       FROM users WHERE id = ?`,
      req.user.id
    );
    if (!user || user.is_active === 0) return res.status(401).json({ message: "Account not found or inactive" });
    return res.json({ user });
  } catch { return res.status(500).json({ message: "Could not load account" }); }
});

router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new passwords are required" });
    if (String(newPassword).length < 8) return res.status(400).json({ message: "New password must contain at least 8 characters" });
    const db = await getDb();
    const user = await db.get("SELECT id,password_hash FROM users WHERE id = ? AND is_active = 1", req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) return res.status(401).json({ message: "Current password is incorrect" });
    await db.run("UPDATE users SET password_hash = ? WHERE id = ?", await bcrypt.hash(newPassword, 10), req.user.id);
    return res.json({ message: "Password updated successfully" });
  } catch (e) { console.error("Password change failed:", e); return res.status(500).json({ message: "Could not change password" }); }
});

router.delete("/me", authenticate, async (req, res) => {
  try {
    if (!req.body.password) return res.status(400).json({ message: "Password confirmation is required" });
    const db = await getDb();
    const user = await db.get("SELECT id,password_hash,role FROM users WHERE id = ?", req.user.id);
    if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) return res.status(401).json({ message: "Password is incorrect" });
    if (user.role === "admin") {
      const admins = await db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1");
      if (admins.count <= 1) return res.status(400).json({ message: "The last active administrator cannot delete their own account. Provision another administrator first." });
    }
    await db.run("DELETE FROM users WHERE id = ?", req.user.id);
    return res.json({ message: "Account deleted successfully" });
  } catch (e) { console.error("Account deletion failed:", e); return res.status(500).json({ message: "Could not delete account. Resolve related records before trying again." }); }
});

router.get("/users", authenticate, authorize("admin"), async (_req, res) => {
  try {
    const db = await getDb();
    const users = await db.all("SELECT id,name,email,phone,role,is_active,created_at FROM users ORDER BY created_at DESC");
    return res.json(users);
  } catch { return res.status(500).json({ message: "Could not load users" }); }
});

router.patch("/users/:id/status", authenticate, authorize("admin"), async (req, res) => {
  try {
    const active = req.body.active;
    if (typeof active !== "boolean") return res.status(400).json({ message: "active must be true or false" });
    const db = await getDb();
    const target = await db.get("SELECT id,role,is_active FROM users WHERE id = ?", req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role === "admin" && !active) {
      const admins = await db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1");
      if (admins.count <= 1) return res.status(400).json({ message: "The last active administrator cannot be deactivated" });
    }
    await db.run("UPDATE users SET is_active = ? WHERE id = ?", active ? 1 : 0, target.id);
    return res.json({ message: `User ${active ? "activated" : "deactivated"}`, id: target.id, is_active: active ? 1 : 0 });
  } catch { return res.status(500).json({ message: "Could not update user status" }); }
});


router.get("/admin/overview", authenticate, authorize("admin"), async (_req, res) => {
  try {
    const db = await getDb();
    const users = await db.get("SELECT COUNT(*) total, SUM(CASE WHEN role='student' OR role='resident' THEN 1 ELSE 0 END) students, SUM(CASE WHEN role='owner' THEN 1 ELSE 0 END) owners, SUM(CASE WHEN role='admin' THEN 1 ELSE 0 END) admins FROM users");
    const logins = await db.get("SELECT COUNT(*) total_logins, COUNT(DISTINCT user_id) unique_users FROM login_events");
    const hostelStats = await db.get("SELECT COUNT(*) total, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) approved, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending, SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) rejected FROM hostels");
    const bookingStats = await db.get("SELECT COUNT(*) total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending, SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) confirmed, SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) cancelled FROM bookings");
    const paymentStats = await db.get("SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END), 0) paid_amount, COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END), 0) pending_amount FROM payments");
    const complaintStats = await db.all("SELECT status, COUNT(*) AS count FROM complaints GROUP BY status ORDER BY status");
    const registrationTrend = await db.all("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count FROM users WHERE created_at >= date('now', '-6 days') GROUP BY day ORDER BY day");
    const pendingHostels = await db.all("SELECT h.*, u.name AS owner_name, u.email AS owner_email FROM hostels h JOIN users u ON u.id=h.owner_id WHERE h.status='pending' ORDER BY h.created_at ASC");
    const allHostels = await db.all("SELECT h.*, u.name AS owner_name, u.email AS owner_email FROM hostels h JOIN users u ON u.id=h.owner_id ORDER BY h.id DESC");
    const complaints = await db.all("SELECT c.*, u.name AS student_name, u.email AS student_email, h.name AS hostel_name FROM complaints c JOIN users u ON u.id=c.user_id JOIN hostels h ON h.id=c.hostel_id ORDER BY c.created_at DESC");
    const hostelReports = await db.all("SELECT r.*, u.name AS student_name, u.email AS student_email, h.name AS hostel_name, h.city AS hostel_city FROM hostel_reports r JOIN users u ON u.id=r.user_id JOIN hostels h ON h.id=r.hostel_id ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, r.created_at DESC");
    const auditLogs = await db.all("SELECT * FROM login_events ORDER BY id DESC LIMIT 25");
    res.json({ users, logins, hostelStats, bookingStats, paymentStats, complaintStats, registrationTrend, pendingHostels, allHostels, complaints, hostelReports, auditLogs });
  } catch (e) { console.error(e); res.status(500).json({message:'Could not load admin overview'}); }
});

router.post("/admin/hostels", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { name, city, address = "", description = "", gender = "Co-ed", phone = "", email = "", amenities = [], rules = [], image_url = "", room_type = "Standard", price_per_month = 0, total_beds = 1 } = req.body;
    if (!String(name || "").trim() || !String(city || "").trim()) {
      return res.status(400).json({ message: "Hostel name and city are required" });
    }
    const price = Number(price_per_month);
    const beds = Number(total_beds);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(beds) || beds < 1) {
      return res.status(400).json({ message: "Price must be zero or more and beds must be a positive whole number" });
    }
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO hostels(owner_id,name,city,address,description,gender,phone,email,amenities,rules,image_url,status)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,'approved')`,
      req.user.id,
      String(name).trim(),
      String(city).trim(),
      String(address).trim(),
      String(description).trim(),
      String(gender).trim(),
      String(phone).trim(),
      String(email).trim(),
      JSON.stringify(Array.isArray(amenities) ? amenities : []),
      JSON.stringify(Array.isArray(rules) ? rules : []),
      String(image_url).trim()
    );
    await db.run(
      "INSERT INTO rooms(hostel_id,room_type,price_per_month,total_beds,available_beds,description) VALUES(?,?,?,?,?,?)",
      result.lastID,
      String(room_type).trim() || "Standard",
      price,
      beds,
      beds,
      "Room inventory added by an administrator."
    );
    return res.status(201).json({ message: "Hostel added and approved", hostel: await db.get("SELECT * FROM hostels WHERE id = ?", result.lastID) });
  } catch (error) {
    console.error("Admin hostel creation failed:", error);
    return res.status(500).json({ message: "Could not add hostel" });
  }
});

router.patch("/admin/hostels/:id/review", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { decision, note = "" } = req.body;
    if (!["approved", "rejected", "pending"].includes(decision)) return res.status(400).json({message:'Decision must be approved, rejected, or pending'});
    const db = await getDb();
    const h = await db.get("SELECT id FROM hostels WHERE id=?", req.params.id);
    if (!h) return res.status(404).json({message:'Hostel not found'});
    await db.run("UPDATE hostels SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", decision, h.id);
    res.json({message:`Hostel status set to ${decision}`, id:h.id, status:decision, note});
  } catch (e) { console.error(e); res.status(500).json({message:'Could not review hostel'}); }
});

export default router;
