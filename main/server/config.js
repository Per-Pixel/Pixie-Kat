import 'dotenv/config';
import process from 'node:process';

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const isProduction = NODE_ENV === 'production';

const REQUIRED_ALWAYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const REQUIRED_IN_PROD = ['FRONTEND_URL', 'CORS_ORIGINS'];

function isMissing(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

const missing = REQUIRED_ALWAYS.filter((key) => isMissing(process.env[key]));
if (isProduction) {
  missing.push(...REQUIRED_IN_PROD.filter((key) => isMissing(process.env[key])));
}

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
    `Set them in main/server/.env before starting the server.`
  );
}

if (isProduction && process.env.FRONTEND_URL) {
  let url;
  try {
    url = new URL(process.env.FRONTEND_URL);
  } catch {
    throw new Error(`FRONTEND_URL is not a valid URL: ${process.env.FRONTEND_URL}`);
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    throw new Error(
      `FRONTEND_URL must not point to localhost in production: ${process.env.FRONTEND_URL}`
    );
  }
}

const superAdminIds = (process.env.SUPER_ADMIN_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

if (superAdminIds.length === 0 && superAdminEmails.length === 0) {
  console.warn(
    '[config] No SUPER_ADMIN_IDS or SUPER_ADMIN_EMAILS configured. ' +
    'Super-admin operations (wallet adjustments, email overrides) will be unavailable.'
  );
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: NODE_ENV,
  isProduction,
  frontendUrl: process.env.FRONTEND_URL || '',
  corsOrigins: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  superAdminIds,
  superAdminEmails,
};
