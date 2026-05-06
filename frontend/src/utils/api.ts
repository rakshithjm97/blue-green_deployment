export const getApiBase = (): string => {
  if (typeof window === 'undefined') return '';
  const apiBase = import.meta.env.VITE_API_URL?.trim?.();
  if (apiBase) return apiBase;
  const { hostname, protocol } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname);
  // Dev: same-origin `/api/*` uses `server.proxy` in vite.config.ts (backend still must run on :5000).
  if (import.meta.env.DEV && isLocal) return '';
  if (isLocal) return `${protocol}//${hostname}:5000`;
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

  // No session was sent — let the caller handle 401 (e.g. login page) without wiping storage / reload loop
  if (!token) return res;

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