import express from "express";
import { getDb } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

const ROOM_TYPES = [
  "2 Sharing",
  "3 Sharing",
  "4 Sharing",
  "5 Sharing"
];

router.get("/owner/hostel/:hostelId", authenticate, authorize("owner"), async (req, res) => {
  try {
    const db = await getDb();
    const hostel = await db.get("SELECT id FROM hostels WHERE id = ? AND owner_id = ?", req.params.hostelId, req.user.id);
    if (!hostel) return res.status(404).json({ message: "Hostel not found" });
    const rooms = await db.all(
      `SELECT r.*, COALESCE((SELECT json_group_array(json_object('id', b.id, 'bed_label', b.bed_label, 'status', b.status))
        FROM beds b WHERE b.room_id = r.id), '[]') AS beds
       FROM rooms r WHERE r.hostel_id = ? ORDER BY r.floor_number, r.room_number, r.id`,
      req.params.hostelId
    );
    res.json(rooms.map((room) => ({ ...room, beds: JSON.parse(room.beds || "[]") })));
  } catch (error) {
    res.status(500).json({ message: "Failed to load owner rooms", error: error.message });
  }
});

router.get("/hostel/:hostelId", async (req, res) => {
  try {
    const db = await getDb();

    const rooms = await db.all(
      `SELECT r.*, COALESCE((SELECT json_group_array(json_object('id', b.id, 'bed_label', b.bed_label, 'status', b.status))
        FROM beds b WHERE b.room_id = r.id), '[]') AS beds
       FROM rooms r JOIN hostels h ON h.id = r.hostel_id
       WHERE r.hostel_id = ? AND h.status = 'approved' ORDER BY r.id`,
      req.params.hostelId
    );

    res.json(rooms.map((room) => ({ ...room, beds: JSON.parse(room.beds || "[]") })));
  } catch (error) {
    res.status(500).json({
      message: "Failed to load rooms",
      error: error.message
    });

    router.patch("/beds/:bedId/status", authenticate, authorize("owner"), async (req, res) => {
      const { status } = req.body;
      if (!["available", "booked"].includes(status)) {
        return res.status(400).json({ message: "Bed status must be available or booked" });
      }
      const db = await getDb();
      try {
        const bed = await db.get(
          `SELECT b.*, r.hostel_id, h.owner_id
           FROM beds b JOIN rooms r ON r.id = b.room_id
           JOIN hostels h ON h.id = r.hostel_id
           WHERE b.id = ?`,
          req.params.bedId
        );
        if (!bed || bed.owner_id !== req.user.id) return res.status(404).json({ message: "Bed not found" });
        if (bed.status === "occupied") return res.status(409).json({ message: "Occupied beds can only be freed by cancelling the booking" });

        await db.exec("BEGIN");
        await db.run("UPDATE beds SET status = ?, booking_id = NULL WHERE id = ?", status, bed.id);
        await db.run(
          `UPDATE rooms SET available_beds = (
            SELECT COUNT(*) FROM beds WHERE room_id = rooms.id AND status = 'available'
          ) WHERE id = ?`,
          bed.room_id
        );
        await db.exec("COMMIT");
        res.json(await db.get("SELECT * FROM beds WHERE id = ?", bed.id));
      } catch (error) {
        try { await db.exec("ROLLBACK"); } catch {}
        res.status(500).json({ message: "Could not update bed status", error: error.message });
      }
    });
  }
});

router.post(
  "/hostel/:hostelId",
  authenticate,
  authorize("owner"),
  async (req, res) => {
    try {
      const db = await getDb();

      const hostel = await db.get(
        "SELECT id FROM hostels WHERE id = ? AND owner_id = ?",
        req.params.hostelId,
        req.user.id
      );

      if (!hostel) {
        return res.status(404).json({
          message: "Hostel not found"
        });
      }

      const {
        room_type,
        price_per_month,
        total_beds,
        available_beds,
        description,
        floor_number = 1,
        room_number = null
      } = req.body;

      if (!ROOM_TYPES.includes(room_type)) {
        return res.status(400).json({
          message: "Select a valid room type"
        });
      }

      const price = Number(price_per_month);
      const total = Number(total_beds);
      const available = Number(available_beds);

      if (
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isInteger(total) ||
        total < 1 ||
        !Number.isInteger(available) ||
        available < 0 ||
        available > total
      ) {
        return res.status(400).json({
          message: "Enter a valid price and bed count"
        });
      }

      const existing = await db.get(
        "SELECT id FROM rooms WHERE hostel_id = ? AND room_type = ?",
        hostel.id,
        room_type
      );

      if (existing) {
        return res.status(409).json({
          message: "This room type already exists. Update it instead."
        });
      }

      const result = await db.run(
        `INSERT INTO rooms
        (hostel_id, room_type, price_per_month, total_beds,
         available_beds, description, floor_number, room_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        hostel.id,
        room_type,
        price,
        total,
        available,
        description?.trim() || null,
        Number.isInteger(Number(floor_number)) && Number(floor_number) > 0 ? Number(floor_number) : 1,
        room_number?.toString().trim() || null
      );

      for (let index = 1; index <= total; index += 1) {
        await db.run("INSERT INTO beds(room_id, bed_label) VALUES(?, ?)", result.lastID, `Bed ${index}`);
      }

      const room = await db.get(
        "SELECT * FROM rooms WHERE id = ?",
        result.lastID
      );

      res.status(201).json(room);
    } catch (error) {
      res.status(500).json({
        message: "Failed to add room",
        error: error.message
      });
    }
  }
);

router.put(
  "/:id",
  authenticate,
  authorize("owner"),
  async (req, res) => {
    try {
      const db = await getDb();

      const room = await db.get(
        `SELECT rooms.*
         FROM rooms
         JOIN hostels ON hostels.id = rooms.hostel_id
         WHERE rooms.id = ? AND hostels.owner_id = ?`,
        req.params.id,
        req.user.id
      );

      if (!room) {
        return res.status(404).json({
          message: "Room not found"
        });
      }

      const {
        room_type,
        price_per_month,
        total_beds,
        available_beds,
        description,
        floor_number = 1,
        room_number = null
      } = req.body;

      if (!ROOM_TYPES.includes(room_type)) {
        return res.status(400).json({
          message: "Select a valid room type"
        });
      }

      const price = Number(price_per_month);
      const total = Number(total_beds);
      const available = Number(available_beds);

      if (
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isInteger(total) ||
        total < 1 ||
        !Number.isInteger(available) ||
        available < 0 ||
        available > total
      ) {
        return res.status(400).json({
          message: "Enter a valid price and bed count"
        });
      }

      const duplicate = await db.get(
        `SELECT id FROM rooms
         WHERE hostel_id = ? AND room_type = ? AND id != ?`,
        room.hostel_id,
        room_type,
        room.id
      );

      if (duplicate) {
        return res.status(409).json({
          message: "This room type already exists"
        });
      }

      await db.run(
        `UPDATE rooms
         SET room_type = ?, price_per_month = ?, total_beds = ?,
             available_beds = ?, description = ?, floor_number = ?, room_number = ?
         WHERE id = ?`,
        room_type,
        price,
        total,
        available,
        description?.trim() || null,
        Number.isInteger(Number(floor_number)) && Number(floor_number) > 0 ? Number(floor_number) : 1,
        room_number?.toString().trim() || null,
        room.id
      );

      const bedCount = await db.get("SELECT COUNT(*) AS count FROM beds WHERE room_id = ?", room.id);
      for (let index = bedCount.count + 1; index <= total; index += 1) {
        await db.run("INSERT INTO beds(room_id, bed_label) VALUES(?, ?)", room.id, `Bed ${index}`);
      }

      res.json(
        await db.get("SELECT * FROM rooms WHERE id = ?", room.id)
      );
    } catch (error) {
      res.status(500).json({
        message: "Failed to update room",
        error: error.message
      });
    }
  }
);

export default router;