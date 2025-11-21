/**
 * API Service Layer
 * Wrapper for authenticated fetch requests
 */

import { getAuthHeader } from '../../utils/auth';

/**
 * Authenticated fetch wrapper that automatically includes JWT token
 * @param url The URL to fetch
 * @param options Fetch options (headers will be merged with auth headers)
 * @returns Promise with the fetch Response
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeader = await getAuthHeader();

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  });
}
