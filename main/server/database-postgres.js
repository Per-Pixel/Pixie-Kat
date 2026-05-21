import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
        ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_role_check'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT users_role_check
            CHECK (role IN ('user', 'admin', 'reseller', 'support'));
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_status_check'
            AND conrelid = 'users'::regclass
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT users_status_check
            CHECK (status IN ('active', 'inactive', 'suspended'));
        END IF;
      END
      $$;
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);
    
    console.log('✓ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const findUserByEmail = async (email) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

export const createUser = async (name, email, passwordHash) => {
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email.toLowerCase(), passwordHash]
    );
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const findUserById = async (id) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, status, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, role, status, created_at, updated_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
};

export const updateUserById = async (id, updates) => {
  try {
    const result = await pool.query(
      `
        UPDATE users
        SET
          name = COALESCE($2, name),
          email = COALESCE($3, email),
          phone = CASE WHEN $7 THEN $4 ELSE phone END,
          role = COALESCE($5, role),
          status = COALESCE($6, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING id, name, email, phone, role, status, created_at, updated_at
      `,
      [
        id,
        updates.name,
        updates.email,
        updates.phone,
        updates.role,
        updates.status,
        Object.prototype.hasOwnProperty.call(updates, 'phone'),
      ]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating user by ID:', error);
    throw error;
  }
};

export const softDeleteUserById = async (id) => {
  try {
    const result = await pool.query(
      `
        UPDATE users
        SET
          deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING id
      `,
      [id]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error soft deleting user by ID:', error);
    throw error;
  }
};

export const closePool = async () => {
  await pool.end();
};

export default pool;
