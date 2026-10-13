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
    description: "Comfortable student living with Wi-Fi, study rooms, daily meals, and secure entry in a vibrant campus zone.",
    amenities: ["WiFi", "Food", "Study Room", "Laundry", "CCTV", "Parking"],
    roomType: "3 Sharing",
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Green Stay Girls Hostel",
    gender: "Girls",
    price: 7000,
    beds: 8,
    address: "Near Miyapur, Hyderabad",
    city: "Hyderabad",
    description: "A bright, secure girls-only residence with housekeeping, study areas, and a calm, student-focused environment.",
    amenities: ["WiFi", "Food", "CCTV", "Study Room", "Laundry", "Power Backup"],
    roomType: "2 Sharing",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Student Comfort Residency",
    gender: "Boys",
    price: 6000,
    beds: 10,
    address: "Near Nizampet, Hyderabad",
    city: "Hyderabad",
    description: "Affordable and well-maintained accommodation for engineering and degree students, with common lounges and transport access.",
    amenities: ["WiFi", "Laundry", "Parking", "Study Room", "Common Room"],
    roomType: "4 Sharing",
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Urban Student Living",
    gender: "Co-living",
    price: 8000,
    beds: 6,
    address: "Near Kukatpally, Hyderabad",
    city: "Hyderabad",
    description: "Premium co-living with a social community feel, high-speed internet, and modern shared spaces for students.",
    amenities: ["WiFi", "Food", "CCTV", "Parking", "Gym", "Common Room"],
    roomType: "2 Sharing",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Hill View Residency",
    gender: "Girls",
    price: 6200,
    beds: 9,
    address: "Near Hitech City, Hyderabad",
    city: "Hyderabad",
    description: "Well-connected girls hostel near tech parks and colleges with secure infrastructure and nutritious meals.",
    amenities: ["WiFi", "Food", "Study Room", "CCTV", "Laundry"],
    roomType: "3 Sharing",
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Metro Nest Boys Stay",
    gender: "Boys",
    price: 5600,
    beds: 11,
    address: "Near Gachibowli, Hyderabad",
    city: "Hyderabad",
    description: "A convenient student hostel near major colleges with active community spaces, filtration, and flexible monthly plans.",
    amenities: ["WiFi", "Food", "Parking", "Study Room", "Power Backup"],
    roomType: "3 Sharing",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80"
  }
];

const hyderabadAreas = [
  "Bachupally", "Miyapur", "Nizampet", "Kukatpally", "Gachibowli",
  "Hitech City", "Madhapur", "Kondapur", "Ameerpet", "Begumpet",
  "Secunderabad", "Manikonda", "Sainikpuri", "Uppal", "Dilsukhnagar",
  "LB Nagar", "Mehdipatnam", "Tolichowki", "Hafeezpet", "Nallagandla",
  "Tarnaka", "Kothapet", "Somajiguda", "Masab Tank", "Panjagutta",
  "Kompally", "Alwal", "Nagole", "Kachiguda", "Abids"
];
const generatedImages = [
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
];
const generatedHostels = Array.from({ length: 94 }, (_, index) => {
  const area = hyderabadAreas[index % hyderabadAreas.length];
  const gender = ["Boys", "Girls", "Co-living"][index % 3];
  const price = 4500 + (index % 8) * 500;
  return {
    name: `Hyderabad Student Home ${String(index + 1).padStart(2, "0")}`,
    gender,
    price,
    beds: 6 + (index % 4) * 4,
    address: `Near ${area}, Hyderabad`,
    city: "Hyderabad",
    description: `Comfortable ${gender.toLowerCase()} student accommodation near ${area} with practical amenities, secure access, and flexible monthly rooms.`,
    amenities: ["WiFi", "CCTV", index % 2 ? "Laundry" : "Food", "Study Room", "Power Backup"],
    roomType: ["2 Sharing", "3 Sharing", "4 Sharing"][index % 3],
    image: generatedImages[index % generatedImages.length]
  };
});
demoHostels.push(...generatedHostels);

async function seedDemoData() {
  await initDb();

  const db = await getDb();

  let admin = await db.get("SELECT id FROM users WHERE email = ?", "admin@hostelhub.local");
  if (!admin) {
    const adminHash = await bcrypt.hash("Admin@123", 10);
    const adminResult = await db.run(
      "INSERT INTO users(name,email,password_hash,phone,role,is_active) VALUES(?,?,?,?,?,1)",
      "HostelHub Admin",
      "admin@hostelhub.local",
      adminHash,
      "9000000000",
      "admin"
    );
    admin = { id: adminResult.lastID };
  }

  let owner = await db.get("SELECT id FROM users WHERE email = ?", "demo-owner@hostelhub.local");
  if (!owner) {
    const passwordHash = await bcrypt.hash("DemoOwner@123", 10);
    const result = await db.run(
      "INSERT INTO users(name,email,password_hash,phone,role,is_active) VALUES(?,?,?,?,?,1)",
      "HostelHub Demo Owner",
      "demo-owner@hostelhub.local",
      passwordHash,
      "9876543210",
      "owner"
    );
    owner = { id: result.lastID };
  }

  for (const item of demoHostels) {
    let hostel = await db.get("SELECT id FROM hostels WHERE name = ?", item.name);

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
          rules,
          status,
          image_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)
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
          "Keep shared spaces clean",
          "No visitors after 9 PM"
        ]),
        item.image
      );

      hostel = { id: result.lastID };
      console.log("Added demo hostel:", item.name);
    } else {
      console.log("Hostel already exists:", item.name);
    }

    const existingRoom = await db.get("SELECT id FROM rooms WHERE hostel_id = ? LIMIT 1", hostel.id);

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
  console.log("Demo admin: admin@hostelhub.local");
  console.log("Demo admin password: Admin@123");
  console.log("Demo owner: demo-owner@hostelhub.local");
  console.log("Demo owner password: DemoOwner@123");
}

seedDemoData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed demo data:", error);
    process.exit(1);
  });