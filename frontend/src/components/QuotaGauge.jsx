import React, { useEffect, useState } from 'react';
import { Gauge, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * QuotaGauge component displaying a visual token bucket progress bar
 * and live countdown when throttled.
 *
 * @param {Object} props
 * @param {number} [props.limit=10] - Total bucket capacity
 * @param {number} [props.remaining=10] - Current remaining tokens
 * @param {number} [props.retryAfter=0] - Cooldown in seconds until 1 token is available
 */
export default function QuotaGauge({ limit = 10, remaining = 10, retryAfter = 0 }) {
  const [countdown, setCountdown] = useState(retryAfter || 0);

  // Sync countdown whenever retryAfter prop updates
  useEffect(() => {
    if (retryAfter > 0) {
      setCountdown(retryAfter);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(0);
    }
  }, [retryAfter]);

  const totalCapacity = Number(limit) > 0 ? Number(limit) : 10;
  const currentRemaining =
    typeof remaining === 'number' && !isNaN(remaining) ? Math.max(0, Number(remaining)) : 0;
  const percentage = Math.min(
    100,
    Math.max(0, Math.round((currentRemaining / totalCapacity) * 100))
  );

  // Color logic: green > 50%, amber 20-50%, red at 0 (and < 20%)
  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-400';
  let badgeBg = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';

  if (currentRemaining === 0 || percentage < 20) {
    barColor = 'bg-red-500';
    textColor = 'text-red-400';
    badgeBg = 'bg-red-950/40 text-red-300 border-red-800/40';
  } else if (percentage >= 20 && percentage <= 50) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-400';
    badgeBg = 'bg-amber-950/40 text-amber-300 border-amber-800/40';
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur border border-gray-700/60 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-indigo-400" />
          Token Bucket Quota
        </h2>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${badgeBg}`}>
          {currentRemaining === 0 ? 'Exhausted' : `${percentage}% Available`}
        </span>
      </div>

      {/* Numerical display */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-extrabold tracking-tight ${textColor}`}>
            {currentRemaining}
          </span>
          <span className="text-sm font-medium text-gray-400">/ {totalCapacity} tokens</span>
        </div>
        <span className="text-xs text-gray-400">Capacity: {totalCapacity}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-900 rounded-full h-3.5 p-0.5 overflow-hidden border border-gray-700/80">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Countdown when retryAfter > 0 */}
      {countdown > 0 ? (
        <div className="mt-4 p-3 bg-red-950/30 border border-red-800/50 rounded-lg flex items-center justify-between text-xs text-red-300 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Rate limit active. Next token available in:</span>
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-red-200 bg-red-900/40 px-2 py-0.5 rounded border border-red-700/40">
            <Clock className="w-3.5 h-3.5" />
            {countdown}s
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bucket refills at configured rate. Requests ready to send.</span>
        </div>
      )}
    </div>
  );
}
