import { getDb } from "./src/config/db.js";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

try {
  const email = (
    await rl.question("Enter owner email: ")
  ).trim().toLowerCase();

  const password = await rl.question(
    "Enter your new password (minimum 8 characters): "
  );

  if (password.length < 8) {
    throw new Error("Password must contain at least 8 characters.");
  }

  const db = await getDb();

  const user = await db.get(
    "SELECT id, email, role FROM users WHERE email = ?",
    email
  );

  if (!user) {
    throw new Error("Owner account not found.");
  }

  if (user.role !== "owner") {
    throw new Error("This account does not have the owner role.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.run(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    passwordHash,
    user.id
  );

  console.log("Owner password reset successfully.");
  console.log("Email:", user.email);
  console.log("Role:", user.role);
} catch (error) {
  console.error("Password reset failed:", error.message);
} finally {
  rl.close();
}