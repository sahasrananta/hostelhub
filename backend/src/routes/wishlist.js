import express from "express";
import { getDb } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const hostels = await db.all(
      `SELECT h.*, wishlist.created_at AS wishlisted_at,
              COALESCE(AVG(r.rating), 0) rating,
              COUNT(DISTINCT r.id) review_count,
              COALESCE(SUM(ro.available_beds), 0) available_beds,
              COALESCE(MIN(ro.price_per_month), 0) price
       FROM wishlist
       JOIN hostels h ON h.id = wishlist.hostel_id
       LEFT JOIN reviews r ON r.hostel_id = h.id AND r.is_hidden = 0
       LEFT JOIN rooms ro ON ro.hostel_id = h.id
       WHERE wishlist.user_id = ?
       GROUP BY h.id
       ORDER BY wishlist.id DESC`,
      req.user.id
    );

    for (const h of hostels) {
      h.photos = await db.all("SELECT id, url FROM hostel_photos WHERE hostel_id = ? ORDER BY id DESC", h.id);
      h.amenities = JSON.parse(h.amenities || "[]");
    }

    res.json(hostels);
  } catch (e) {
    res.status(500).json({ message: "Could not load wishlist", error: e.message });
  }
});

router.post("/:hostelId", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run("INSERT INTO wishlist(user_id,hostel_id) VALUES(?,?)", req.user.id, req.params.hostelId);
    res.status(201).json({ message: "Added to wishlist" });
  } catch (e) {
    res.status(409).json({ message: "Already in wishlist" });
  }
});

router.delete("/:hostelId", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run("DELETE FROM wishlist WHERE user_id=? AND hostel_id=?", req.user.id, req.params.hostelId);
    res.json({ message: "Removed from wishlist" });
  } catch (e) {
    res.status(500).json({ message: "Failed to remove from wishlist" });
  }
});

export default router;