const APPMORPH_USER_ID_COOKIE = 'appmorph_user_id';

/**
 * Generate a random UUID v4.
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get a cookie value by name.
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set a cookie with the given name and value.
 * Sets a long expiration (1 year) for persistence.
 */
function setCookie(name: string, value: string): void {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Get or create the appmorph_user_id.
 * If a user_id is provided, use it and store in cookie.
 * If not, check for existing cookie or generate a new one.
 */
export function getOrCreateAppmorphUserId(providedUserId?: string): string {
  // If user provided an ID, use it and store in cookie
  if (providedUserId) {
    setCookie(APPMORPH_USER_ID_COOKIE, providedUserId);
    return providedUserId;
  }

  // Check for existing cookie
  const existingId = getCookie(APPMORPH_USER_ID_COOKIE);
  if (existingId) {
    return existingId;
  }

  // Generate new ID and store in cookie
  const newId = generateUUID();
  setCookie(APPMORPH_USER_ID_COOKIE, newId);
  return newId;
}

/**
 * Get the current appmorph_user_id from cookie.
 * Returns null if not set.
 */
export function getAppmorphUserId(): string | null {
  return getCookie(APPMORPH_USER_ID_COOKIE);
}
