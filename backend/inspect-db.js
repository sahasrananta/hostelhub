import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({ filename: "hostelhub.db", driver: sqlite3.Database });
const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
console.log("Tables:", tables.map((t) => t.name));
for (const t of tables) {
  const info = await db.all(`PRAGMA table_info(${t.name})`);
  console.log("\n" + t.name + ":", info.map((c) => c.name + "(" + c.type + ")").join(", "));
  const cnt = await db.get(`SELECT COUNT(*) as c FROM ${t.name}`);
  console.log("  rows:", cnt.c);
}
const users = await db.all("SELECT id, name, email, role FROM users");
console.log("\nUsers:", users);
await db.close();
