import express from "express";
import { getDb } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/hostel/:hostelId", async (req, res) => {
  try {
    const db = await getDb();
    const items = await db.all(
      "SELECT m.* FROM menu_items m JOIN hostels h ON h.id = m.hostel_id WHERE m.hostel_id = ? AND h.status = 'approved' ORDER BY m.id",
      req.params.hostelId
    );
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Could not load menu", error: e.message });
  }
});

router.post("/hostel/:hostelId", authenticate, authorize("owner"), async (req, res) => {
  try {
    const db = await getDb();
    const h = await db.get("SELECT id FROM hostels WHERE id=? AND owner_id=?", req.params.hostelId, req.user.id);
    if (!h) return res.status(404).json({ message: "Hostel not found" });

    const { day, meal = "Full Day", item } = req.body;
    if (!day || !item) return res.status(400).json({ message: "Day and item details are required" });

    const r = await db.run(
      "INSERT INTO menu_items(hostel_id,day,meal,item) VALUES(?,?,?,?)",
      h.id,
      day,
      meal,
      item
    );
    res.status(201).json(await db.get("SELECT * FROM menu_items WHERE id=?", r.lastID));
  } catch (e) {
    res.status(500).json({ message: "Could not add menu item", error: e.message });
  }
});

router.put("/hostel/:hostelId", authenticate, authorize("owner"), async (req, res) => {
  try {
    const db = await getDb();
    const h = await db.get("SELECT id FROM hostels WHERE id=? AND owner_id=?", req.params.hostelId, req.user.id);
    if (!h) return res.status(404).json({ message: "Hostel not found" });

    const { menu } = req.body;
    // menu can be an array of { day, meal, item } or an object { Monday: "...", Tuesday: "..." }
    if (!menu) return res.status(400).json({ message: "Menu payload is required" });

    await db.exec("BEGIN");
    await db.run("DELETE FROM menu_items WHERE hostel_id = ?", h.id);

    if (Array.isArray(menu)) {
      for (const entry of menu) {
        if (entry.day && entry.item) {
          await db.run(
            "INSERT INTO menu_items(hostel_id, day, meal, item) VALUES(?,?,?,?)",
            h.id,
            entry.day,
            entry.meal || "Full Day",
            entry.item
          );
        }
      }
    } else if (typeof menu === "object") {
      for (const [day, item] of Object.entries(menu)) {
        if (item && String(item).trim()) {
          await db.run(
            "INSERT INTO menu_items(hostel_id, day, meal, item) VALUES(?,?,?,?)",
            h.id,
            day,
            "Daily Menu",
            String(item).trim()
          );
        }
      }
    }

    await db.exec("COMMIT");

    const updated = await db.all("SELECT * FROM menu_items WHERE hostel_id = ? ORDER BY id", h.id);
    res.json({ message: "Weekly food menu updated successfully", menu: updated });
  } catch (e) {
    try { await (await getDb()).exec("ROLLBACK"); } catch {}
    res.status(500).json({ message: "Failed to update food menu", error: e.message });
  }
});

router.delete("/:id", authenticate, authorize("owner"), async (req, res) => {
  try {
    const db = await getDb();
    const x = await db.get(
      `SELECT menu_items.* FROM menu_items
       JOIN hostels ON hostels.id = menu_items.hostel_id
       WHERE menu_items.id = ? AND hostels.owner_id = ?`,
      req.params.id,
      req.user.id
    );
    if (!x) return res.status(404).json({ message: "Menu item not found" });

    await db.run("DELETE FROM menu_items WHERE id = ?", req.params.id);
    res.json({ message: "Menu item deleted" });
  } catch (e) {
    res.status(500).json({ message: "Failed to delete menu item", error: e.message });
  }
});

export default router;