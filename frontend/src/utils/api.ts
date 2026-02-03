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
  const headers = { ...(init?.headers as any || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  return fetch((path.startsWith('http') ? path : `${API_BASE}${path}`), { ...(init || {}), headers });
};