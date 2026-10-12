import express from "express";
import { getDb } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/hostel/:hostelId", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      "SELECT * FROM updates WHERE hostel_id = ? ORDER BY id DESC",
      req.params.hostelId
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load updates", error: e.message });
  }
});

router.get("/mine", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    // Fetch updates for hostels the user has confirmed bookings in
    const updates = await db.all(
      `SELECT u.*, h.name AS hostel_name
       FROM updates u
       JOIN hostels h ON h.id = u.hostel_id
       WHERE u.hostel_id IN (
         SELECT DISTINCT hostel_id FROM bookings WHERE user_id = ? AND status = 'confirmed'
       )
       ORDER BY u.id DESC`,
      req.user.id
    );
    res.json(updates);
  } catch (e) {
    res.status(500).json({ message: "Could not load announcements", error: e.message });
  }
});

router.post("/hostel/:hostelId", authenticate, authorize("owner"), async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    const db = await getDb();
    const h = await db.get("SELECT id FROM hostels WHERE id = ? AND owner_id = ?", req.params.hostelId, req.user.id);
    if (!h) return res.status(404).json({ message: "Hostel not found" });

    const r = await db.run(
      "INSERT INTO updates(hostel_id, title, content) VALUES(?,?,?)",
      h.id,
      title.trim(),
      content.trim()
    );
    res.status(201).json(await db.get("SELECT * FROM updates WHERE id = ?", r.lastID));
  } catch (e) {
    res.status(500).json({ message: "Failed to post update", error: e.message });
  }
});

router.delete("/:id", authenticate, authorize("owner"), async (req, res) => {
  try {
    const db = await getDb();
    const item = await db.get(
      `SELECT u.id FROM updates u
       JOIN hostels h ON h.id = u.hostel_id
       WHERE u.id = ? AND h.owner_id = ?`,
      req.params.id,
      req.user.id
    );
    if (!item) return res.status(404).json({ message: "Update announcement not found" });

    await db.run("DELETE FROM updates WHERE id = ?", req.params.id);
    res.json({ message: "Update deleted successfully" });
  } catch (e) {
    res.status(500).json({ message: "Failed to delete update", error: e.message });
  }
});

export default router;