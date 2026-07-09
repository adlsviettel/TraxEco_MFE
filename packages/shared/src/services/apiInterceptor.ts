/**
 * API Interceptor — wraps fetch() with automatic JWT token refresh.
 * 
 * - Before each request: checks if token is near expiry and proactively refreshes
 * - On 401 response: attempts one token refresh, then retries the original request
 * - If refresh fails: logs out user and redirects to login with a toast message
 */

import { authService } from './authService';

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api';

// Minimum remaining token life before proactive refresh (5 minutes)
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

// Prevent multiple simultaneous refresh calls
let refreshPromise: Promise<string | null> | null = null;

/**
 * Decode JWT payload to get expiration time
 */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

/**
 * Check if token is near expiry
 */
function isTokenNearExpiry(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry - Date.now() < REFRESH_THRESHOLD_MS;
}

/**
 * Refresh the JWT token via backend
 */
async function refreshToken(): Promise<string | null> {
  const currentToken = authService.getToken();
  if (!currentToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
    });

    if (res.ok) {
      const json = await res.json();
      const data = (json.code !== undefined && json.data !== undefined) ? json.data : json;
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        console.log('🔄 Token refreshed successfully');
        return data.token;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ensure token is fresh — proactively refresh if near expiry.
 * Deduplicates concurrent refresh calls.
 */
async function ensureFreshToken(): Promise<string | null> {
  const token = authService.getToken();
  if (!token) return null;

  if (isTokenNearExpiry(token)) {
    // Deduplicate: if already refreshing, wait for that
    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }
  return token;
}

/**
 * Handle session expiry — logout and redirect to login
 */
function handleSessionExpired(customMsg?: string) {
  console.error('[handleSessionExpired] ⚠️ Session expired! Logging out and redirecting to login');
  console.trace('[handleSessionExpired] Stack trace:');
  authService.logout();
  const currentPath = window.location.hash || window.location.pathname;
  if (!currentPath.includes('/login')) {
    const dialog = document.createElement('div');
    dialog.style.cssText = 'position: fixed; inset: 0; background-color: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; animation: fakeFadeIn 0.3s ease;';
    
    const title = customMsg ? 'Đăng Nhập Ở Thiết Bị Khác' : 'Hết Phiên Đăng Nhập';
    const message = customMsg || 'Không đủ quyền hạn hoặc phiên làm việc đã quá hạn. Đang chuyển hướng về trang Đăng nhập...';

    dialog.innerHTML = `
      <div style="background: white; padding: 32px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); animation: fakeSlideUp 0.3s ease; border-top: 4px solid #ef4444;">
        <div style="width: 64px; height: 64px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <svg style="width: 32px; height: 32px; color: #ef4444;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 style="margin: 0 0 8px; color: #0f172a; font-family: system-ui, sans-serif; font-size: 1.25rem; font-weight: 700;">${title}</h3>
        <p style="margin: 0 0 24px; color: #64748b; font-family: system-ui, sans-serif; font-size: 0.95rem; line-height: 1.5;">${message}</p>
        <button id="btn-relogin" style="background: #0ea5e9; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; width: 100%;">Đăng Nhập Lại Ngay</button>
      </div>
      <style>
        @keyframes fakeFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fakeSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        #btn-relogin:hover { background: #0284c7 !important; }
      </style>
    `;

    document.body.appendChild(dialog);
    
    const basePath = (import.meta.env.VITE_BASE_PATH || '').replace(/\/$/, '');
    const loginUrl = (basePath || '') + '/login';

    setTimeout(() => {
      window.location.href = loginUrl;
    }, 4000);
    
    document.getElementById('btn-relogin')?.addEventListener('click', () => {
      window.location.href = loginUrl;
    });
  }
}

/**
 * Helper to unwrap standard ApiResponse<T> from backend if present.
 * If the response matches { code, message, data }, it returns a new Response containing just 'data'.
 */
async function unwrapIfApiResponse(res: Response): Promise<Response> {
  if (!res.ok) return res;
  try {
    const clone = res.clone();
    const json = await clone.json();
    if (json && typeof json.code === 'number' && typeof json.message === 'string' && 'data' in json) {
      return new Response(JSON.stringify(json.data), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers
      });
    }
  } catch (e) {
    // Not JSON or parse error, ignore
  }
  return res;
}

/**
 * Authenticated fetch — drop-in replacement for fetch() with auto token management.
 * 
 * Usage: import { authFetch } from './apiInterceptor';
 *        const res = await authFetch('/some-endpoint', { method: 'GET' });
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Proactively refresh if near expiry
  const token = await ensureFreshToken();

  if (!token) {
    handleSessionExpired();
    return Promise.reject(new Error('No valid token'));
  }

  // Chèn API_BASE_URL nếu url là đường dẫn tương đối và chưa có
  let finalUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.startsWith(API_BASE_URL)) {
      finalUrl = url;
    } else {
      finalUrl = `${API_BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }
  }

  // Inject Authorization header
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(finalUrl, { ...options, headers });

  // If 401, try one refresh + retry
  if (res.status === 401) {
    let isKickedOut = false;
    try {
      const clone = res.clone();
      const body = await clone.json();
      if (body && (body.message === 'SESSION_KICKED_OUT' || (body.error && body.error.includes('SESSION_KICKED_OUT')))) {
        isKickedOut = true;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }

    if (isKickedOut) {
      console.warn('⚠️ User session was kicked out by another login!');
      handleSessionExpired('Tài khoản của bạn đã được đăng nhập ở thiết bị hoặc trình duyệt khác. Phiên làm việc này sẽ tự động đăng xuất.');
      return Promise.reject(new Error('Session kicked out'));
    }

    console.warn('⚠️ Got 401, attempting token refresh...');
    const newToken = await refreshToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      const retryRes = await fetch(finalUrl, { ...options, headers });
      // If still 401 after refresh, definitely a session issue
      if (retryRes.status === 401) {
        let isKickedOutRetry = false;
        try {
          const cloneRetry = retryRes.clone();
          const bodyRetry = await cloneRetry.json();
          if (bodyRetry && (bodyRetry.message === 'SESSION_KICKED_OUT' || (bodyRetry.error && bodyRetry.error.includes('SESSION_KICKED_OUT')))) {
            isKickedOutRetry = true;
          }
        } catch (e) {}

        if (isKickedOutRetry) {
          handleSessionExpired('Tài khoản của bạn đã được đăng nhập ở thiết bị hoặc trình duyệt khác. Phiên làm việc này sẽ tự động đăng xuất.');
        } else {
          handleSessionExpired();
        }
        return Promise.reject(new Error('Session expired'));
      }
      return unwrapIfApiResponse(retryRes);
    } else {
      // Refresh failed, meaning token is totally dead
      handleSessionExpired();
      return Promise.reject(new Error('Session expired'));
    }
  }

  return unwrapIfApiResponse(res);
}

/**
 * Start background timer to proactively refresh token before expiry.
 * Call this once after login.
 */
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function startTokenRefreshTimer() {
  stopTokenRefreshTimer();
  // Check every 60 seconds
  refreshTimer = setInterval(async () => {
    const token = authService.getToken();
    if (!token) { stopTokenRefreshTimer(); return; }
    if (isTokenNearExpiry(token)) {
      await refreshToken();
    }
  }, 60_000);
}

export function stopTokenRefreshTimer() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}
