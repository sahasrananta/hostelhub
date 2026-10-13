import express from "express";
import { getDb } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();
const statuses = ["open", "reviewing", "resolved", "dismissed"];

router.post("/", authenticate, async (req, res) => {
  try {
    if (!["student", "resident"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only student accounts can report listings" });
    }

    const { hostel_id, reason, details = "" } = req.body;
    if (!hostel_id || !String(reason || "").trim()) {
      return res.status(400).json({ message: "Hostel and report reason are required" });
    }

    const db = await getDb();
    const hostel = await db.get("SELECT id FROM hostels WHERE id = ?", hostel_id);
    if (!hostel) return res.status(404).json({ message: "Hostel not found" });

    const existing = await db.get(
      "SELECT id FROM hostel_reports WHERE hostel_id = ? AND user_id = ? AND status IN ('open', 'reviewing')",
      hostel_id,
      req.user.id
    );
    if (existing) return res.status(409).json({ message: "You already have an open report for this hostel" });

    const result = await db.run(
      "INSERT INTO hostel_reports(hostel_id, user_id, reason, details) VALUES(?, ?, ?, ?)",
      hostel_id,
      req.user.id,
      String(reason).trim().slice(0, 120),
      String(details).trim().slice(0, 2000)
    );

    const report = await db.get(
      `SELECT r.*, h.name AS hostel_name, h.city AS hostel_city
       FROM hostel_reports r JOIN hostels h ON h.id = r.hostel_id WHERE r.id = ?`,
      result.lastID
    );
    return res.status(201).json(report);
  } catch (error) {
    console.error("Hostel report creation failed:", error);
    return res.status(500).json({ message: "Could not submit hostel report" });
  }
});

router.get("/mine", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const reports = await db.all(
      `SELECT r.*, h.name AS hostel_name, h.city AS hostel_city
       FROM hostel_reports r JOIN hostels h ON h.id = r.hostel_id
       WHERE r.user_id = ? ORDER BY r.created_at DESC`,
      req.user.id
    );
    return res.json(reports);
  } catch (error) {
    console.error("Hostel report loading failed:", error);
    return res.status(500).json({ message: "Could not load hostel reports" });
  }
});

router.get("/all", authenticate, authorize("admin"), async (_req, res) => {
  try {
    const db = await getDb();
    const reports = await db.all(
      `SELECT r.*, h.name AS hostel_name, h.city AS hostel_city,
              u.name AS student_name, u.email AS student_email
       FROM hostel_reports r
       JOIN hostels h ON h.id = r.hostel_id
       JOIN users u ON u.id = r.user_id
       ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, r.created_at DESC`
    );
    return res.json(reports);
  } catch (error) {
    console.error("Admin hostel report loading failed:", error);
    return res.status(500).json({ message: "Could not load hostel reports" });
  }
});

router.patch("/:id/status", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { status, response = "" } = req.body;
    if (!statuses.includes(status)) return res.status(400).json({ message: "Invalid report status" });
    const db = await getDb();
    const report = await db.get("SELECT id FROM hostel_reports WHERE id = ?", req.params.id);
    if (!report) return res.status(404).json({ message: "Hostel report not found" });
    await db.run(
      "UPDATE hostel_reports SET status = ?, admin_response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      status,
      String(response).trim().slice(0, 2000),
      report.id
    );
    return res.json({ message: "Hostel report updated", report: await db.get("SELECT * FROM hostel_reports WHERE id = ?", report.id) });
  } catch (error) {
    console.error("Hostel report update failed:", error);
    return res.status(500).json({ message: "Could not update hostel report" });
  }
});

export default router;
