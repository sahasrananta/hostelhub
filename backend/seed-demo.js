import { initDb, getDb } from "./src/config/db.js";
import bcrypt from "bcryptjs";

const demoHostels = [
  {
    name: "Campus Nest Boys Hostel",
    gender: "Boys",
    price: 5500,
    beds: 12,
    address: "Near Bachupally, Hyderabad",
    city: "Hyderabad",
    description:
      "DEMO LISTING — Student-friendly accommodation with Wi-Fi, study space and daily meals.",
    amenities: ["WiFi", "Food", "Study Room", "Laundry"],
    roomType: "3 Sharing"
  },
  {
    name: "Green Stay Girls Hostel",
    gender: "Girls",
    price: 7000,
    beds: 8,
    address: "Near Miyapur, Hyderabad",
    city: "Hyderabad",
    description:
      "DEMO LISTING — Girls accommodation with CCTV, food facilities and a quiet study area.",
    amenities: ["WiFi", "Food", "CCTV", "Study Room"],
    roomType: "2 Sharing"
  },
  {
    name: "Student Comfort Residency",
    gender: "Boys",
    price: 6000,
    beds: 10,
    address: "Near Nizampet, Hyderabad",
    city: "Hyderabad",
    description:
      "DEMO LISTING — Shared rooms with laundry, Wi-Fi and common study facilities.",
    amenities: ["WiFi", "Laundry", "Parking", "Study Room"],
    roomType: "4 Sharing"
  },
  {
    name: "Urban Student Living",
    gender: "Co-living",
    price: 8000,
    beds: 6,
    address: "Near Kukatpally, Hyderabad",
    city: "Hyderabad",
    description:
      "DEMO LISTING — Sample co-living listing created for the HostelHub project demonstration.",
    amenities: ["WiFi", "Food", "CCTV", "Parking"],
    roomType: "2 Sharing"
  }
];

async function seedDemoData() {
  await initDb();

  const db = await getDb();

  // Find or create a demo owner account.
  let owner = await db.get(
    "SELECT id FROM users WHERE email = ?",
    "demo-owner@hostelhub.local"
  );

  if (!owner) {
    const passwordHash = await bcrypt.hash(
      "DemoOwner@123",
      10
    );

    const result = await db.run(
      `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES (?, ?, ?, 'owner', 1)
      `,
      "HostelHub Demo Owner",
      "demo-owner@hostelhub.local",
      passwordHash
    );

    owner = {
      id: result.lastID
    };
  }

  for (const item of demoHostels) {
    // Avoid creating duplicate demo hostels when rerunning.
    let hostel = await db.get(
      "SELECT id FROM hostels WHERE name = ?",
      item.name
    );

    if (!hostel) {
      const result = await db.run(
        `
        INSERT INTO hostels (
          owner_id,
          name,
          city,
          address,
          description,
          gender,
          amenities,
          rules
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        owner.id,
        item.name,
        item.city,
        item.address,
        item.description,
        item.gender,
        JSON.stringify(item.amenities),
        JSON.stringify([
          "Follow hostel timings",
          "Keep shared spaces clean"
        ])
      );

      hostel = {
        id: result.lastID
      };

      console.log("Added demo hostel:", item.name);
    } else {
      console.log("Hostel already exists:", item.name);
    }

    // Add a room only when the hostel has no rooms.
    const existingRoom = await db.get(
      "SELECT id FROM rooms WHERE hostel_id = ? LIMIT 1",
      hostel.id
    );

    if (!existingRoom) {
      await db.run(
        `
        INSERT INTO rooms (
          hostel_id,
          room_type,
          price_per_month,
          total_beds,
          available_beds,
          description
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        hostel.id,
        item.roomType,
        item.price,
        item.beds,
        item.beds,
        "Demo room data for project testing. Update it through the owner portal."
      );

      console.log("Added demo room for:", item.name);
    }
  }

  console.log("\nDemo data setup completed.");
  console.log("Existing hostel records were preserved.");
  console.log(
    "Demo owner: demo-owner@hostelhub.local"
  );
  console.log(
    "Demo password: DemoOwner@123"
  );
}

seedDemoData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Failed to seed demo data:", error);
    process.exit(1);
  });