import express from "express";
import { getDb } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.get("/mine", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT p.*, h.name AS hostel_name, h.city AS hostel_city, r.room_type
       FROM payments p
       LEFT JOIN hostels h ON h.id = p.hostel_id
       LEFT JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE p.user_id = ?
       ORDER BY p.id DESC`,
      req.user.id
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load payments", error: e.message });
  }
});

router.get("/owner", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Owner access required" });
    }
    const db = await getDb();
    const rows = await db.all(
      `SELECT p.*, u.name AS student_name, u.email AS student_email, h.name AS hostel_name
       FROM payments p
       JOIN hostels h ON h.id = p.hostel_id
       JOIN users u ON u.id = p.user_id
       WHERE h.owner_id = ?
       ORDER BY p.id DESC`,
      req.user.id
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load owner payments", error: e.message });
  }
});

router.post("/monthly-fee", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { hostel_id } = req.body;
    if (!hostel_id) {
      return res.status(400).json({ message: "Hostel ID is required" });
    }

    const b = await db.get(
      "SELECT id FROM bookings WHERE user_id = ? AND hostel_id = ? AND status = 'confirmed' LIMIT 1",
      req.user.id,
      hostel_id
    );
    if (!b) {
      return res.status(403).json({ message: "Only confirmed residents can pay monthly fees" });
    }

    const room = await db.get("SELECT price_per_month FROM rooms WHERE id = (SELECT room_id FROM bookings WHERE id = ?)", b.id);
    const numAmount = Number(room?.price_per_month || 0);
    if (!Number.isFinite(numAmount) || numAmount <= 0) return res.status(400).json({ message: "Resident room has no valid monthly price" });

    const txn = `SIMULATED-FEE-${Date.now()}`;
    const r = await db.run(
      `INSERT INTO payments(user_id, booking_id, hostel_id, amount, payment_type, status, transaction_id, paid_at)
       VALUES(?, ?, ?, ?, 'monthly_fee', 'pending', ?, NULL)`,
      req.user.id,
      b.id,
      hostel_id,
      numAmount,
      txn
    );

    const payment = await db.get("SELECT * FROM payments WHERE id = ?", r.lastID);
    res.status(201).json(payment);
  } catch (e) {
    res.status(500).json({ message: "Failed to process fee payment", error: e.message });
  }
});

export default router;