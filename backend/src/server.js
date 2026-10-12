import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initDb } from "./config/db.js";
import auth from "./routes/auth.js";
import hostels from "./routes/hostels.js";
import rooms from "./routes/rooms.js";
import menu from "./routes/menu.js";
import updates from "./routes/updates.js";
import bookings from "./routes/bookings.js";
import payments from "./routes/payments.js";
import reviews from "./routes/reviews.js";
import wishlist from "./routes/wishlist.js";
import complaints from "./routes/complaints.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || "uploads")));

// API Endpoints
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "HostelHub Backend" }));
app.use("/api/auth", auth);
app.use("/api/hostels", hostels);
app.use("/api/rooms", rooms);
app.use("/api/menu", menu);
app.use("/api/updates", updates);
app.use("/api/bookings", bookings);
app.use("/api/payments", payments);
app.use("/api/reviews", reviews);
app.use("/api/wishlist", wishlist);
app.use("/api/complaints", complaints);

// Unified static frontend hosting (for production deployment)
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
      return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
  });
}

// Global error handler
app.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Image is too large. Maximum size is 5 MB." });
  }
  if (err?.message?.includes("Only JPG")) {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

initDb()
  .then(() =>
    app.listen(PORT, () => console.log(`HostelHub unified server: http://localhost:${PORT}`))
  )
  .catch((e) => {
    console.error("Database initialization failed:", e);
    process.exit(1);
  });
