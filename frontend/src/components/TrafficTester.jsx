import React from 'react';
import { Send, Zap, User } from 'lucide-react';

/**
 * TrafficTester component allowing users to configure X-Client-Id
 * and dispatch single or burst requests.
 *
 * @param {Object} props
 * @param {string} props.clientId - Current client identifier
 * @param {(clientId: string) => void} props.onClientIdChange - Handler for client ID change
 * @param {() => void} props.onSendSingle - Handler for sending 1 request
 * @param {() => void} props.onSendBurst - Handler for sending 15 burst requests
 * @param {boolean} [props.isLoading=false] - Whether a request or burst is in progress
 */
export default function TrafficTester({
  clientId,
  onClientIdChange,
  onSendSingle,
  onSendBurst,
  isLoading = false,
}) {
  const presets = ['user-a', 'user-b', 'api-client-1'];

  return (
    <div className="bg-gray-800/80 backdrop-blur border border-gray-700/60 rounded-xl p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-indigo-400" />
        Traffic Simulator
      </h2>

      {/* Client ID input and presets */}
      <div className="mb-6">
        <label htmlFor="clientId" className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
          Client Identifier (X-Client-Id)
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="clientId"
            type="text"
            value={clientId}
            onChange={(e) => onClientIdChange(e.target.value)}
            placeholder="e.g. user-a"
            disabled={isLoading}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 hidden sm:inline">Presets:</span>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onClientIdChange(preset)}
                disabled={isLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  clientId === preset
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-700/60 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onSendSingle}
          disabled={isLoading || !clientId?.trim()}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
          Send 1 Request
        </button>

        <button
          type="button"
          onClick={onSendBurst}
          disabled={isLoading || !clientId?.trim()}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium text-sm text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-purple-600/20"
        >
          <Zap className="w-4 h-4" />
          Simulate Burst (15 reqs)
        </button>
      </div>
    </div>
  );
}
