import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'auth.db');

let db;

const initDb = async () => {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  saveDb();
};

const saveDb = () => {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, data);
  }
};

export const getDb = () => db;

export const findUserByEmail = (email) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  stmt.bind([email.toLowerCase()]);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
};

export const createUser = (name, email, passwordHash) => {
  db.run(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email.toLowerCase(), passwordHash]
  );
  saveDb();
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  return result.id;
};

export const findUserById = (id) => {
  const stmt = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
  stmt.bind([id]);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
};

export { initDb };
export default db;
