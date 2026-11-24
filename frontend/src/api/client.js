const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_BASE = rawBase.replace(/\/+$/, '');

/**
 * Sends a test request to the rate-limited API endpoint.
 *
 * @param {string} clientId - Client identifier
 * @returns {Promise<{
 *   status: number,
 *   ok: boolean,
 *   data: any,
 *   limit: number | null,
 *   remaining: number | null,
 *   retryAfter: number | null,
 *   timestamp: string,
 *   clientId: string
 * }>}
 */
export async function sendTestRequest(clientId) {
  const timestamp = new Date().toISOString();
  try {
    const response = await fetch(`${API_BASE}/api/data`, {
      method: 'GET',
      headers: {
        'X-Client-Id': clientId,
      },
    });

    const status = response.status;
    const ok = response.ok;
    const limitHeader = response.headers.get('X-RateLimit-Limit');
    const remainingHeader = response.headers.get('X-RateLimit-Remaining');
    const retryAfterHeader = response.headers.get('Retry-After');

    const limit = limitHeader !== null ? Number(limitHeader) : null;
    const remaining = remainingHeader !== null ? Number(remainingHeader) : null;
    const retryAfter = retryAfterHeader !== null ? Number(retryAfterHeader) : null;

    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    return {
      status,
      ok,
      data,
      limit,
      remaining,
      retryAfter,
      timestamp,
      clientId,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: { error: error.message },
      limit: null,
      remaining: null,
      retryAfter: null,
      timestamp,
      clientId,
    };
  }
}

/**
 * Fetches the list of active Redis keys and their current TTLs.
 *
 * @returns {Promise<Array<{ key: string, tokens: number | null, last_refill: number | null, ttl: number }>>}
 */
export async function fetchRedisKeys() {
  const response = await fetch(`${API_BASE}/status/keys`);
  if (!response.ok) {
    throw new Error(`Failed to fetch keys: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

export default {
  API_BASE,
  sendTestRequest,
  fetchRedisKeys,
};
