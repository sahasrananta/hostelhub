import { getDb } from "./src/config/db.js";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

try {
  const email = (await rl.question("Enter your owner email: "))
    .trim()
    .toLowerCase();

  const password = await rl.question("Enter your owner password: ");

  const db = await getDb();

  const user = await db.get(
    "SELECT id, email, role, password_hash FROM users WHERE email = ?",
    email
  );

  if (!user) {
    console.log("RESULT: Email not found in this database.");
  } else {
    console.log("Email found:", user.email);
    console.log("Role:", user.role);

    const matches = await bcrypt.compare(password, user.password_hash);

    console.log("Password matches:", matches);
  }
} catch (error) {
  console.error("Check failed:", error.message);
} finally {
  rl.close();
  process.exit();
}