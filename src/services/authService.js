const API_BASE = 'https://api-caby.story-labs.in';

const TOKEN_KEY   = 'caby_token';
const USER_KEY    = 'caby_user';

/** Shared helper — POST login, store token + user info */
async function _doLogin(endpoint, username, password) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        let message = 'Login failed. Please check your credentials.';
        try {
            const errBody = await response.json();
            if (errBody.message) message = errBody.message;
        } catch (_) { /* ignore parse errors */ }
        throw new Error(message);
    }

    const data = await response.json();
    // data: { token, userId, username, role?, companyId? }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify({
        userId:    data.userId,
        username:  data.username,
        role:      data.role      || 'ADMIN',
        companyId: data.companyId || null,
    }));
    return data;
}

/**
 * Cab-Admin login — POST /api/v1/auth/cab-admin/login
 * @returns {{ token, userId, username, role }}
 */
export async function login(username, password) {
    return _doLogin('/api/v1/auth/cab-admin/login', username, password);
}

/**
 * Company-Admin login — POST /api/v1/auth/company-admin/login
 * @returns {{ token, userId, username, role, companyId }}
 */
export async function loginCompanyAdmin(username, password) {
    return _doLogin('/api/v1/auth/company-admin/login', username, password);
}

/** Remove stored session */
export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

/** Returns the stored JWT string or null */
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/** Returns { userId, username, role, companyId } or null */
export function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
}

/** Decode a JWT payload (base64url → object). Returns null on failure. */
export function decodeJwt(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '==='.slice((b64.length + 3) % 4);
        return JSON.parse(atob(padded));
    } catch (_) {
        return null;
    }
}

/** Token expiry in ms since epoch, or null if not present/parseable. */
export function getTokenExpiryMs() {
    const payload = decodeJwt(getToken());
    if (!payload || typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
}

/** True if the stored token's `exp` claim is in the past. */
export function isTokenExpired() {
    const expMs = getTokenExpiryMs();
    if (expMs == null) return false; // no exp claim → treat as non-expiring
    return Date.now() >= expMs;
}

/** True if a non-expired token is present in storage. Clears storage if expired. */
export function isAuthenticated() {
    if (!getToken()) return false;
    if (isTokenExpired()) {
        logout();
        return false;
    }
    return true;
}
