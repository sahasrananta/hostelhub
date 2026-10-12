import { getDb } from "./src/config/db.js";

try {
  const db = await getDb();

  const users = await db.all(
    "SELECT id, name, email, role, created_at FROM users"
  );

  console.log("\nRegistered users:");
  console.table(users);

} catch (error) {
  console.error("Database check failed:", error.message);
} finally {
  process.exit();
}