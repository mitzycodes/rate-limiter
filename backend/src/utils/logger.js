/**
 * Lightweight structured logger function that prints timestamped JSON logs to stdout.
 *
 * @param {Object} params
 * @param {string} params.clientId - Client identifier
 * @param {number|string} params.status - HTTP status code
 * @param {number} params.remaining - Remaining tokens in the bucket
 * @param {string} params.path - Request URL path
 */
export function logRequest({ clientId, status, remaining, path }) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    clientId,
    status,
    remaining,
    path,
  };
  console.log(JSON.stringify(logEntry));
}

export default { logRequest };
