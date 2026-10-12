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

router.get("/hostel/:hostelId", async (req, res) => {
  try {
    const db = await getDb();

    const rooms = await db.all(
      "SELECT * FROM rooms WHERE hostel_id = ? ORDER BY id",
      req.params.hostelId
    );

    res.json(rooms);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load rooms",
      error: error.message
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
        description
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
         available_beds, description)
        VALUES (?, ?, ?, ?, ?, ?)`,
        hostel.id,
        room_type,
        price,
        total,
        available,
        description?.trim() || null
      );

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
        description
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
             available_beds = ?, description = ?
         WHERE id = ?`,
        room_type,
        price,
        total,
        available,
        description?.trim() || null,
        room.id
      );

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