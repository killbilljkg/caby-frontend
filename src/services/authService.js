const API_BASE = 'https://api-caby.story-labs.in';

const TOKEN_KEY = 'caby_token';
const USER_KEY = 'caby_user';

/**
 * Calls POST /api/v1/auth/admin/login with username + password.
 * On success stores the JWT token and user info in localStorage.
 * @returns {{ token, userId, username }}
 */
export async function login(username, password) {
    const response = await fetch(`${API_BASE}/api/v1/auth/cab-admin/login`, {
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
    // data: { token, userId, username }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify({ userId: data.userId, username: data.username }));
    return data;
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

/** Returns { userId, username } or null */
export function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
}

/** True if a token is present in storage */
export function isAuthenticated() {
    return !!getToken();
}
