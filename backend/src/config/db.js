import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../../hostelhub.db");
console.log("HostelHub database path:", dbPath);
let db;

export async function getDb() {
  if (!db) {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.exec("PRAGMA foreign_keys = ON;");
  }
  return db;
}

async function columnExists(database, table, column) {
  const cols = await database.all(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function migrateSchema(database) {
  // Extend users table to support admin role + is_active without losing data
  const usersSql = await database.get(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
  );

  if (usersSql?.sql && !usersSql.sql.includes("'admin'")) {
    await database.exec("PRAGMA foreign_keys = OFF;");
    await database.exec("BEGIN");
    try {
      await database.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'student'
            CHECK(role IN ('student','owner','resident','admin')),
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users_new (id, name, email, password_hash, phone, role, created_at)
          SELECT id, name, email, password_hash, phone, role, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      await database.exec("COMMIT");
    } catch (err) {
      await database.exec("ROLLBACK");
      throw err;
    } finally {
      await database.exec("PRAGMA foreign_keys = ON;");
    }
  }

  if (!(await columnExists(database, "users", "is_active"))) {
    await database.exec(
      "ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"
    );
  }

  if (!(await columnExists(database, "hostels", "status"))) {
    await database.exec(
      "ALTER TABLE hostels ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'"
    );
    // Preserve existing listings as approved so public browsing stays intact
    await database.exec(
      "UPDATE hostels SET status = 'approved' WHERE status IS NULL OR status = ''"
    );
  }

  if (!(await columnExists(database, "reviews", "is_hidden"))) {
    await database.exec(
      "ALTER TABLE reviews ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0"
    );
  }
}

async function ensureSecurityTables(database) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS login_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT,
      role TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      hostel_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','closed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
    );
  `);

  if (!(await columnExists(database, "complaints", "status"))) {
    await database.exec("ALTER TABLE complaints ADD COLUMN status TEXT NOT NULL DEFAULT 'open'");
  }

  if (!(await columnExists(database, "complaints", "updated_at"))) {
    await database.exec("ALTER TABLE complaints ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
  }

  if (!(await columnExists(database, "complaints", "response"))) {
    await database.exec("ALTER TABLE complaints ADD COLUMN response TEXT");
  }
}

export async function initDb() {
  const database = await getDb();
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      phone TEXT, role TEXT NOT NULL DEFAULT 'student'
        CHECK(role IN ('student','owner','resident','admin')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS hostels (
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER NOT NULL,
      name TEXT NOT NULL, city TEXT NOT NULL, address TEXT, description TEXT,
      gender TEXT, phone TEXT, email TEXT, amenities TEXT DEFAULT '[]',
      rules TEXT DEFAULT '[]', image_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS hostel_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hostel_id INTEGER NOT NULL,
      filename TEXT NOT NULL, original_name TEXT NOT NULL, url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hostel_id INTEGER NOT NULL,
      room_type TEXT NOT NULL, price_per_month REAL NOT NULL,
      total_beds INTEGER NOT NULL DEFAULT 1, available_beds INTEGER NOT NULL DEFAULT 1,
      description TEXT, FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hostel_id INTEGER NOT NULL,
      day TEXT NOT NULL, meal TEXT NOT NULL, item TEXT NOT NULL,
      FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hostel_id INTEGER NOT NULL,
      title TEXT NOT NULL, content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hostel_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL, user_id INTEGER NOT NULL, check_in TEXT,
      check_out TEXT, amount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','confirmed','cancelled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      booking_id INTEGER, hostel_id INTEGER, amount REAL NOT NULL,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('booking','monthly_fee')),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','paid','failed','refunded')),
      transaction_id TEXT, paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hostel_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT, is_hidden INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      hostel_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id,hostel_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
    );
  `);

  await ensureSecurityTables(database);
  await migrateSchema(database);
}
