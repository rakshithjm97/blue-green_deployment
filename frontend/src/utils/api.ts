export const getApiBase = (): string => {
  if (typeof window === 'undefined') return '';
  const { hostname, protocol } = window.location;
  const apiBase = import.meta.env.VITE_API_URL;
  if (apiBase) return apiBase;
  if (hostname === 'localhost' || hostname.startsWith('192.') || hostname.startsWith('10.') || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:5000`;
  }
  return '';
};

export const API_BASE = getApiBase();

export const fetchWithAuth = async (path: string, init?: RequestInit) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const baseHeaders = { ...(init?.headers as any || {}) };
  if (token) baseHeaders.Authorization = `Bearer ${token}`;

  const fullUrl = path.startsWith('http') ? path : `${API_BASE}${path}`;
  let res = await fetch(fullUrl, { ...(init || {}), headers: baseHeaders });

  if (res.status !== 401) return res;

  // Try silent refresh using stored refresh token
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
  if (refreshToken) {
    try {
      const r = await fetch(`${API_BASE}/api/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshToken}` },
        body: JSON.stringify({}),
      });
      if (r.ok) {
        const j = await r.json();
        const newAccess = j.access_token;
        if (newAccess) {
          try { localStorage.setItem('access_token', newAccess); } catch (e) {}
          // retry original request with new token
          const retryHeaders = { ...(init?.headers as any || {}), Authorization: `Bearer ${newAccess}` };
          const retryRes = await fetch(fullUrl, { ...(init || {}), headers: retryHeaders });
          return retryRes;
        }
      }
    } catch (e) {
      // fallthrough to clearing auth
    }
  }

  // Refresh failed or no refresh token - clear and reload
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
  } catch (e) {}
  if (typeof window !== 'undefined') window.location.reload();
  return res;
};