import jwt from "jsonwebtoken";
import { getDb } from "../config/db.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "change_this_to_a_long_random_secret") {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret());
    const db = await getDb();
    const user = await db.get("SELECT id, role, is_active FROM users WHERE id = ?", payload.id);
    if (!user || user.is_active === 0) return res.status(401).json({ message: "Account is inactive or no longer exists. Please sign in again." });
    req.user = { ...payload, role: user.role };
    return next();
  } catch (error) {
    console.error("Token verification failed:", error.message || error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function authorize(...roles) {
  return (req, res, next) => req.user && roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ message: "Access denied" });
}
