const SPECIAL = /[!@#$%^&*(),.?":{}|<>\-_]/;

/** Client-side password rules. Supabase dashboard settings still enforce the server side. */
export function validatePassword(password, confirm) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!SPECIAL.test(password)) return 'Password must contain at least one special character';
  if (confirm !== undefined && password !== confirm) return 'Passwords do not match';
  return '';
}
