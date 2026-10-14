import express from "express";
import { getDb } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  const db = await getDb();
  const { hostel_id, room_id, check_in, check_out, simulated_payment = true } = req.body;

  if (!hostel_id || !room_id) {
    return res.status(400).json({ message: "Hostel ID and Room ID are required" });
  }

  try {
    await db.exec("BEGIN");
    const room = await db.get("SELECT * FROM rooms WHERE id=? AND hostel_id=?", room_id, hostel_id);
    if (!room) {
      await db.exec("ROLLBACK");
      return res.status(404).json({ message: "Room not found" });
    }
    if (room.available_beds < 1) {
      await db.exec("ROLLBACK");
      return res.status(409).json({ message: "No vacancy available in this room" });
    }

    const bookingAmount = Number(room.price_per_month || 0);
    if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
      await db.exec("ROLLBACK");
      return res.status(400).json({ message: "This room does not have a valid monthly price" });
    }

    const b = await db.run(
      `INSERT INTO bookings(hostel_id, room_id, user_id, check_in, check_out, amount, status)
       VALUES(?, ?, ?, ?, ?, ?, 'pending')`,
      hostel_id,
      room_id,
      req.user.id,
      check_in || null,
      check_out || null,
      bookingAmount
    );

    await db.run(
      `INSERT INTO payments(user_id, booking_id, hostel_id, amount, payment_type, status, transaction_id, paid_at)
       VALUES(?, ?, ?, ?, 'booking', ?, ?, NULL)`,
      req.user.id,
      b.lastID,
      hostel_id,
      bookingAmount,
      "pending",
      `SIMULATED-${Date.now()}`
    );

    await db.exec("COMMIT");

    const created = await db.get(
      `SELECT b.*, h.name AS hostel_name, h.city AS hostel_city, h.address AS hostel_address, r.room_type
       FROM bookings b
       JOIN hostels h ON h.id = b.hostel_id
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = ?`,
      b.lastID
    );
    res.status(201).json(created);
  } catch (e) {
    try { await db.exec("ROLLBACK"); } catch {}
    res.status(500).json({ message: "Booking failed", error: e.message });
  }
});

router.get("/mine", authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT b.*, h.name AS hostel_name, h.city AS hostel_city, h.address AS hostel_address,
              h.phone AS hostel_phone, r.room_type, r.price_per_month,
              p.transaction_id, p.paid_at, p.status AS payment_status
       FROM bookings b
       JOIN hostels h ON h.id = b.hostel_id
       JOIN rooms r ON r.id = b.room_id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.user_id = ?
       ORDER BY b.id DESC`,
      req.user.id
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load bookings", error: e.message });
  }
});

router.get("/owner", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Owner access required" });
    }
    const db = await getDb();
    const rows = await db.all(
      `SELECT b.*, h.name AS hostel_name, r.room_type, r.price_per_month,
              u.name AS student_name, u.email AS student_email, u.phone AS student_phone
       FROM bookings b
       JOIN hostels h ON h.id = b.hostel_id
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.user_id
       WHERE h.owner_id = ?
       ORDER BY b.id DESC`,
      req.user.id
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load owner bookings", error: e.message });
  }
});

router.get("/residents", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Owner access required" });
    }
    const db = await getDb();
    const rows = await db.all(
      `SELECT b.id AS booking_id, b.check_in, b.status, b.amount,
              u.id AS user_id, u.name AS resident_name, u.email AS resident_email, u.phone AS resident_phone,
              h.name AS hostel_name, h.id AS hostel_id,
              r.room_type, r.price_per_month
       FROM bookings b
       JOIN hostels h ON h.id = b.hostel_id
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.user_id
       WHERE h.owner_id = ? AND b.status = 'confirmed'
       ORDER BY b.id DESC`,
      req.user.id
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Could not load residents", error: e.message });
  }
});

router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["confirmed", "cancelled", "pending"].includes(status)) {
      return res.status(400).json({ message: "Status must be confirmed, cancelled, or pending" });
    }

    const db = await getDb();
    const booking = await db.get(
      `SELECT b.*, h.owner_id, r.id AS room_id, r.available_beds
       FROM bookings b
       JOIN hostels h ON h.id = b.hostel_id
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = ?`,
      req.params.id
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isOwner = req.user.role === "owner" && booking.owner_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this booking" });
    }

    const prevStatus = booking.status;
    if (prevStatus === status) {
      return res.json({ message: "Booking already in this status", booking });
    }

    await db.exec("BEGIN");

    if (prevStatus === "pending" && status === "confirmed") {
      const allocate = await db.run(
        "UPDATE rooms SET available_beds = available_beds - 1 WHERE id = ? AND available_beds > 0",
        booking.room_id
      );
      if (allocate.changes !== 1) {
        await db.exec("ROLLBACK");
        return res.status(409).json({ message: "No vacancy is available to approve this booking" });
      }
    } else if (prevStatus === "confirmed" && status === "cancelled") {
      // Free up bed
      await db.run("UPDATE rooms SET available_beds = MIN(total_beds, available_beds + 1) WHERE id = ?", booking.room_id);
    } else if (prevStatus === "cancelled" && status === "confirmed") {
      // Re-occupy bed
      const reclaim = await db.run("UPDATE rooms SET available_beds = available_beds - 1 WHERE id = ? AND available_beds > 0", booking.room_id);
      if (reclaim.changes !== 1) {
        await db.exec("ROLLBACK");
        return res.status(409).json({ message: "No vacancy is available to reconfirm this booking" });
      }
    }

    await db.run("UPDATE bookings SET status = ? WHERE id = ?", status, booking.id);
    await db.exec("COMMIT");

    const updated = await db.get("SELECT * FROM bookings WHERE id = ?", booking.id);
    res.json({ message: `Booking status changed to ${status}`, booking: updated });
  } catch (e) {
    res.status(500).json({ message: "Could not update booking status", error: e.message });
  }
});

export default router;