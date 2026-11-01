/**
 * Same-origin app path for post-login redirects.
 * Rejects protocol-relative, absolute, and control-character destinations.
 */
export function safeRedirectPath(pathname) {
  if (typeof pathname !== 'string') return '/';
  const path = pathname.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  if (path.includes('\\') || path.includes(':')) return '/';
  if (/[\u0000-\u001F\u007F]/.test(path)) return '/';
  return path;
}
