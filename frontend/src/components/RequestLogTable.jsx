import React from 'react';
import { ListFilter, Trash2, CheckCircle2, XCircle } from 'lucide-react';

/**
 * RequestLogTable renders a scrollable live feed of requests.
 *
 * @param {Object} props
 * @param {Array} props.requests - Array of request records
 * @param {() => void} [props.onClearLogs] - Callback to clear logs
 */
export default function RequestLogTable({ requests = [], onClearLogs }) {
  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) +
        '.' +
        String(d.getMilliseconds()).padStart(3, '0')
      );
    } catch {
      return isoString || '-';
    }
  };

  const acceptedCount = requests.filter((r) => r.status === 200).length;
  const blockedCount = requests.filter((r) => r.status === 429).length;

  return (
    <div className="bg-gray-800/80 backdrop-blur border border-gray-700/60 rounded-xl shadow-xl overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-gray-700/60 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Live Request Feed</h2>
            <p className="text-xs text-gray-400">
              {requests.length} total &bull;{' '}
              <span className="text-emerald-400 font-medium">{acceptedCount} accepted</span> &bull;{' '}
              <span className="text-red-400 font-medium">{blockedCount} blocked</span>
            </p>
          </div>
        </div>

        {requests.length > 0 && onClearLogs && (
          <button
            type="button"
            onClick={onClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Feed
          </button>
        )}
      </div>

      <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-900/80 text-gray-400 uppercase text-[11px] tracking-wider sticky top-0 backdrop-blur border-b border-gray-700/60 z-10">
            <tr>
              <th className="py-3 px-4 font-semibold">Timestamp</th>
              <th className="py-3 px-4 font-semibold">Client ID</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Remaining</th>
              <th className="py-3 px-4 font-semibold">Retry-After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/40 font-mono">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500 font-sans">
                  No requests recorded yet. Click "Send 1 Request" or "Simulate Burst" to generate traffic.
                </td>
              </tr>
            ) : (
              requests.map((req, index) => {
                const is200 = req.status === 200;
                const is429 = req.status === 429;

                return (
                  <tr
                    key={req.id || `${req.timestamp}-${index}`}
                    className={`hover:bg-gray-700/30 transition ${
                      is429 ? 'bg-red-950/20' : 'bg-transparent'
                    }`}
                  >
                    <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">
                      {formatTime(req.timestamp)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-200 whitespace-nowrap">
                      <span className="bg-gray-900/80 px-2 py-0.5 rounded border border-gray-700/60 font-sans text-xs">
                        {req.clientId}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {is200 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-sans">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          200 OK
                        </span>
                      )}
                      {is429 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/60 text-red-300 border border-red-800/60 font-sans">
                          <XCircle className="w-3 h-3 text-red-400" />
                          429 Blocked
                        </span>
                      )}
                      {!is200 && !is429 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-700 text-gray-300 font-sans">
                          {req.status || 'ERR'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={
                          req.remaining === 0
                            ? 'text-red-400 font-bold'
                            : 'text-gray-200 font-semibold'
                        }
                      >
                        {req.remaining !== null ? `${req.remaining}` : '-'}
                      </span>
                      {req.limit !== null && (
                        <span className="text-gray-500 font-normal"> / {req.limit}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {req.retryAfter !== null && req.retryAfter > 0 ? (
                        <span className="text-amber-400 font-semibold">{req.retryAfter}s</span>
                      ) : (
                        <span className="text-gray-500">0s</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
