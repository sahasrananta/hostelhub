import express from "express";
import { getDb } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  try {
    if (!["student", "resident"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only student accounts can submit hostel complaints" });
    }
    const { hostel_id, title, description, category = "general" } = req.body;
    if (!hostel_id || !String(title || "").trim() || !String(description || "").trim()) {
      return res.status(400).json({ message: "Hostel, title and description are required" });
    }
    const db = await getDb();
    const hostel = await db.get("SELECT id FROM hostels WHERE id=?", hostel_id);
    if (!hostel) return res.status(404).json({ message: "Hostel not found" });

    const r = await db.run(
      "INSERT INTO complaints(user_id,hostel_id,title,description,category) VALUES(?,?,?,?,?)",
      req.user.id,
      hostel_id,
      String(title).trim(),
      String(description).trim(),
      String(category).slice(0, 50)
    );
    res.status(201).json(await db.get("SELECT * FROM complaints WHERE id=?", r.lastID));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Could not submit complaint" });
  }
});

router.get("/mine", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    res.json(
      await db.all(
        `SELECT c.*, h.name AS hostel_name, h.city AS hostel_city
         FROM complaints c
         JOIN hostels h ON h.id = c.hostel_id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC`,
        req.user.id
      )
    );
  } catch (e) {
    res.status(500).json({ message: "Could not load complaints" });
  }
});

router.get("/owner", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Owner access required" });
    }
    const db = await getDb();
    const complaints = await db.all(
      `SELECT c.*, u.name AS student_name, u.email AS student_email, u.phone AS student_phone, h.name AS hostel_name
       FROM complaints c
       JOIN hostels h ON h.id = c.hostel_id
       JOIN users u ON u.id = c.user_id
       WHERE h.owner_id = ?
       ORDER BY c.created_at DESC`,
      req.user.id
    );
    res.json(complaints);
  } catch (e) {
    res.status(500).json({ message: "Could not load owner complaints" });
  }
});

router.get("/all", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    const db = await getDb();
    const complaints = await db.all(
      `SELECT c.*, u.name AS student_name, u.email AS student_email, h.name AS hostel_name
       FROM complaints c
       JOIN hostels h ON h.id = c.hostel_id
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC`
    );
    res.json(complaints);
  } catch (e) {
    res.status(500).json({ message: "Could not load complaints" });
  }
});

router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { status, response = "" } = req.body;
    if (!status || !["open", "reviewing", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ message: "Valid status required (open, reviewing, resolved, closed)" });
    }
    const db = await getDb();
    const c = await db.get(
      `SELECT c.id, h.owner_id
       FROM complaints c
       JOIN hostels h ON h.id = c.hostel_id
       WHERE c.id = ?`,
      req.params.id
    );
    if (!c) return res.status(404).json({ message: "Complaint not found" });

    const isOwner = req.user.role === "owner" && c.owner_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this complaint" });
    }

    await db.run(
      `UPDATE complaints
       SET status = ?, response = CASE WHEN ? != '' THEN ? ELSE response END, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      status,
      response,
      response,
      c.id
    );

    const updated = await db.get("SELECT * FROM complaints WHERE id = ?", c.id);
    res.json({ message: "Complaint status updated", complaint: updated });
  } catch (e) {
    res.status(500).json({ message: "Could not update complaint status", error: e.message });
  }
});

export default router;
