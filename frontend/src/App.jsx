import React, { useState, useEffect, useCallback } from 'react';
import { Database, ShieldCheck, RefreshCw, Activity, Terminal } from 'lucide-react';
import TrafficTester from './components/TrafficTester.jsx';
import QuotaGauge from './components/QuotaGauge.jsx';
import RequestLogTable from './components/RequestLogTable.jsx';
import { sendTestRequest, fetchRedisKeys, API_BASE } from './api/client.js';

export default function App() {
  const [clientId, setClientId] = useState('user-a');
  const [limit, setLimit] = useState(10);
  const [remaining, setRemaining] = useState(10);
  const [retryAfter, setRetryAfter] = useState(0);
  const [requests, setRequests] = useState([]);
  const [redisKeys, setRedisKeys] = useState([]);
  const [redisConnected, setRedisConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  // Poll Redis keys and TTLs every 2 seconds
  const pollRedisKeys = useCallback(async () => {
    try {
      const keys = await fetchRedisKeys();
      setRedisKeys(keys);
      setRedisConnected(true);
      setLastRefreshed(new Date().toLocaleTimeString());

      // Sync quota gauge if current client key exists in Redis
      const activeClientKey = keys.find((k) => k.key === `rate_limit:${clientId}`);
      if (activeClientKey && activeClientKey.tokens !== null) {
        setRemaining(Math.floor(activeClientKey.tokens));
      }
    } catch {
      setRedisConnected(false);
    }
  }, [clientId]);

  useEffect(() => {
    pollRedisKeys();
    const interval = setInterval(pollRedisKeys, 2000);
    return () => clearInterval(interval);
  }, [pollRedisKeys]);

  // Send a single test request
  const handleSendSingle = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await sendTestRequest(clientId);
      if (result.limit !== null) setLimit(result.limit);
      if (result.remaining !== null) setRemaining(result.remaining);
      if (result.retryAfter !== null) setRetryAfter(result.retryAfter);

      setRequests((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          ...result,
        },
        ...prev,
      ]);
    } finally {
      setIsLoading(false);
      pollRedisKeys();
    }
  };

  // Simulate 15 burst concurrent requests
  const handleSendBurst = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const promises = Array.from({ length: 15 }, () => sendTestRequest(clientId));
      const results = await Promise.all(promises);

      // Add all burst results to log
      const newLogs = results.map((res, i) => ({
        id: `${Date.now()}-${i}-${Math.random()}`,
        ...res,
      }));
      setRequests((prev) => [...newLogs, ...prev]);

      // Update state with latest/lowest quota reading
      const lastResult = results[results.length - 1];
      if (lastResult) {
        if (lastResult.limit !== null) setLimit(lastResult.limit);
        const minRemaining = results.reduce(
          (min, r) => (r.remaining !== null ? Math.min(min, r.remaining) : min),
          10
        );
        setRemaining(minRemaining);
        const maxRetry = results.reduce(
          (max, r) => (r.retryAfter !== null ? Math.max(max, r.retryAfter) : max),
          0
        );
        setRetryAfter(maxRetry);
      }
    } finally {
      setIsLoading(false);
      pollRedisKeys();
    }
  };

  const handleClearLogs = () => {
    setRequests([]);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-100 tracking-tight">
                  Token Bucket Rate Limiter
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Atomic Redis Token Bucket &bull; Millisecond Refill Rate
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 font-mono">
              <Terminal className="w-3.5 h-3.5 text-gray-400" />
              <span>{API_BASE}</span>
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium ${
                redisConnected
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                  : 'bg-red-950/40 text-red-300 border-red-800/50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  redisConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span>{redisConnected ? 'Redis Connected' : 'Redis Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Section: Controls, Gauge & Redis Keys */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center Column: Traffic Tester & Quota Gauge */}
          <div className="lg:col-span-8 space-y-6">
            <TrafficTester
              clientId={clientId}
              onClientIdChange={setClientId}
              onSendSingle={handleSendSingle}
              onSendBurst={handleSendBurst}
              isLoading={isLoading}
            />

            <QuotaGauge limit={limit} remaining={remaining} retryAfter={retryAfter} />
          </div>

          {/* Right Column: Live Redis Keys & TTL Panel */}
          <div className="lg:col-span-4">
            <div className="bg-gray-800/80 backdrop-blur border border-gray-700/60 rounded-xl p-5 shadow-xl flex flex-col h-full">
              <div className="flex items-center justify-between mb-4 border-b border-gray-700/60 pb-3">
                <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Live Redis Keys & TTL
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
                  <span>2s poll</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2.5 pr-1">
                {redisKeys.length === 0 ? (
                  <div className="text-center py-10 px-4 text-xs text-gray-400 font-sans">
                    <Activity className="w-8 h-8 mx-auto text-gray-600 mb-2 stroke-[1.5]" />
                    <p className="font-medium text-gray-300">No active rate limit keys in Redis</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Keys appear upon sending requests and expire after TTL.
                    </p>
                  </div>
                ) : (
                  redisKeys.map((item) => {
                    const isCurrent = item.key === `rate_limit:${clientId}`;
                    return (
                      <div
                        key={item.key}
                        className={`p-3 rounded-lg border text-xs transition ${
                          isCurrent
                            ? 'bg-indigo-950/30 border-indigo-700/60 ring-1 ring-indigo-500/30'
                            : 'bg-gray-900/60 border-gray-700/40 hover:border-gray-600/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 font-mono">
                          <span className="font-semibold text-gray-200 truncate max-w-[180px]">
                            {item.key}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.ttl > 10
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                            }`}
                          >
                            TTL {item.ttl}s
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 pt-1 border-t border-gray-800/80 font-mono">
                          <div>
                            <span className="text-gray-500">Tokens: </span>
                            <span className="text-gray-200 font-semibold">
                              {item.tokens !== null ? Number(item.tokens).toFixed(2) : 'N/A'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500">Refill: </span>
                            <span className="text-gray-300">
                              {item.last_refill
                                ? `${Math.max(
                                    0,
                                    Math.round((Date.now() - item.last_refill) / 1000)
                                  )}s ago`
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700/60 text-[11px] text-gray-500 flex justify-between items-center">
                <span>Active Keys: {redisKeys.length}</span>
                <span>Updated: {lastRefreshed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Full-Width Request Log Table */}
        <section>
          <RequestLogTable requests={requests} onClearLogs={handleClearLogs} />
        </section>
      </main>
    </div>
  );
}
