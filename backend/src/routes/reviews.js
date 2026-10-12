import express from "express";
import { getDb } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/hostel/:hostelId", async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT r.*, u.name AS user_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.hostel_id = ? AND r.is_hidden = 0
       ORDER BY r.id DESC`,
      req.params.hostelId
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load reviews", error: e.message });
  }
});

router.get("/mine", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT r.*, h.name AS hostel_name, h.city AS hostel_city
       FROM reviews r
       JOIN hostels h ON h.id = r.hostel_id
       WHERE r.user_id = ?
       ORDER BY r.id DESC`,
      req.user.id
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load reviews", error: e.message });
  }
});

router.get("/owner", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Owner access required" });
    }
    const db = await getDb();
    const rows = await db.all(
      `SELECT r.*, u.name AS user_name, h.name AS hostel_name
       FROM reviews r
       JOIN hostels h ON h.id = r.hostel_id
       JOIN users u ON u.id = r.user_id
       WHERE h.owner_id = ?
       ORDER BY r.id DESC`,
      req.user.id
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load reviews", error: e.message });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { hostel_id, rating, comment } = req.body;
    if (!hostel_id) return res.status(400).json({ message: "Hostel ID is required" });
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const b = await db.get(
      "SELECT id FROM bookings WHERE user_id = ? AND hostel_id = ? AND status = 'confirmed' LIMIT 1",
      req.user.id,
      hostel_id
    );
    if (!b) {
      return res.status(403).json({ message: "Only confirmed residents can review this hostel" });
    }

    const r = await db.run(
      "INSERT INTO reviews(hostel_id, user_id, rating, comment) VALUES(?,?,?,?)",
      hostel_id,
      req.user.id,
      numRating,
      comment ? String(comment).trim() : null
    );

    const created = await db.get(
      `SELECT r.*, u.name AS user_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`,
      r.lastID
    );
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: "Failed to submit review", error: e.message });
  }
});

router.patch("/:id/visibility", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    const { is_hidden } = req.body;
    const db = await getDb();
    await db.run("UPDATE reviews SET is_hidden = ? WHERE id = ?", is_hidden ? 1 : 0, req.params.id);
    res.json({ message: `Review ${is_hidden ? "hidden" : "unhidden"} successfully` });
  } catch (e) {
    res.status(500).json({ message: "Could not update review visibility", error: e.message });
  }
});

export default router;