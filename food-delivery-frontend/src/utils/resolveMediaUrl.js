/**
 * Profile images are stored on user-service and exposed via API Gateway at /api/user-uploads/:file.
 * Legacy DB values may point at APP_URL (3000) or user-service /uploads — rewrite for the browser.
 */
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export function resolveProfilePictureUrl(stored) {
  if (!stored) return null;
  const s = String(stored).trim();
  if (s.startsWith('blob:') || s.startsWith('data:')) return s;

  if (s.startsWith('http') && s.includes('/api/user-uploads/')) return s;
  if (s.startsWith('/api/user-uploads/')) return `${API_BASE}${s}`;

  const uploadsIdx = s.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const filename = s.slice(uploadsIdx + '/uploads/'.length).split('?')[0];
    if (filename) return `${API_BASE}/api/user-uploads/${filename}`;
  }

  if (s.startsWith('http')) return s;
  return `${API_BASE}/api/user-uploads/${s.replace(/^\//, '')}`;
}
