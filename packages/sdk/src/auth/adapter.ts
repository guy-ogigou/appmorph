import { AuthAdapter, UserContext } from '@appmorph/shared';

/**
 * Create a simple auth adapter from static values.
 * Useful for testing or simple integrations.
 */
export function createStaticAuthAdapter(
  userContext: UserContext,
  token: string
): AuthAdapter {
  return {
    getUserContext: async () => userContext,
    getAuthToken: async () => token,
  };
}

/**
 * Create an auth adapter that retrieves context from a callback.
 * Useful for integrating with existing auth systems.
 */
export function createCallbackAuthAdapter(
  getUserContext: () => Promise<UserContext>,
  getAuthToken: () => Promise<string>
): AuthAdapter {
  return {
    getUserContext,
    getAuthToken,
  };
}

/**
 * Create an auth adapter that reads from localStorage.
 * Assumes token is stored at the given key and user context at another key.
 */
export function createLocalStorageAuthAdapter(
  tokenKey: string,
  userContextKey: string
): AuthAdapter {
  return {
    getUserContext: async () => {
      const stored = localStorage.getItem(userContextKey);
      if (!stored) {
        throw new Error('User context not found in localStorage');
      }
      return JSON.parse(stored);
    },
    getAuthToken: async () => {
      const token = localStorage.getItem(tokenKey);
      if (!token) {
        throw new Error('Auth token not found in localStorage');
      }
      return token;
    },
  };
}

// Re-export types
export type { AuthAdapter, UserContext } from '@appmorph/shared';
