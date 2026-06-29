'use client';

import { useState, useEffect } from 'react';
import { X, BarChart3, Trash2, Clock, MessageSquare, Zap } from 'lucide-react';

interface UsageEntry {
  id: string;
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  chatTitle: string;
}

interface UsageDashboardProps {
  onClose: () => void;
}

const STORAGE_KEY = 'mistral-usage-log';

function getUsageLog(): UsageEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function clearUsageLog() {
  localStorage.removeItem(STORAGE_KEY);
}

// Approximate costs per 1M tokens (USD)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'mistral-small-latest': { input: 0.1, output: 0.3 },
  'mistral-medium-latest': { input: 0.27, output: 0.81 },
  'mistral-large-latest': { input: 0.2, output: 0.6 },
  'open-mixtral-8x7b': { input: 0.07, output: 0.07 },
  'open-mixtral-8x22b': { input: 0.2, output: 0.6 },
  'codestral-latest': { input: 0.3, output: 0.9 },
  'pixtral-large-latest': { input: 0.2, output: 0.6 },
  'open-mistral-nemo': { input: 0.07, output: 0.07 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['mistral-small-latest'];
  return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
}

export function UsageDashboard({ onClose }: UsageDashboardProps) {
  const [entries, setEntries] = useState<UsageEntry[]>([]);

  useEffect(() => {
    setEntries(getUsageLog());
  }, []);

  const totalInput = entries.reduce((s, e) => s + e.inputTokens, 0);
  const totalOutput = entries.reduce((s, e) => s + e.outputTokens, 0);
  const totalCost = entries.reduce((s, e) => s + estimateCost(e.model, e.inputTokens, e.outputTokens), 0);
  const totalRequests = entries.length;

  // Group by model
  const byModel: Record<string, { count: number; input: number; output: number; cost: number }> = {};
  for (const e of entries) {
    if (!byModel[e.model]) byModel[e.model] = { count: 0, input: 0, output: 0, cost: 0 };
    byModel[e.model].count++;
    byModel[e.model].input += e.inputTokens;
    byModel[e.model].output += e.outputTokens;
    byModel[e.model].cost += estimateCost(e.model, e.inputTokens, e.outputTokens);
  }

  // Group by day (last 7 days)
  const now = Date.now();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), start: d.setHours(0, 0, 0, 0), end: d.setHours(23, 59, 59, 999) };
  });
  const dailyUsage = days.map(day => ({
    ...day,
    count: entries.filter(e => e.timestamp >= day.start && e.timestamp <= day.end).length,
    tokens: entries.filter(e => e.timestamp >= day.start && e.timestamp <= day.end).reduce((s, e) => s + e.inputTokens + e.outputTokens, 0),
  }));
  const maxDaily = Math.max(...dailyUsage.map(d => d.count), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">API Usage</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { clearUsageLog(); setEntries([]); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
              title="Clear all data"
            >
              <Trash2 size={12} />
              Clear
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 size={40} className="mx-auto text-[var(--muted-foreground)] opacity-30 mb-3" />
              <p className="text-sm text-[var(--muted-foreground)]">No usage data yet</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Start chatting to see your API usage statistics</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={14} className="text-[var(--muted-foreground)]" />
                    <span className="text-[11px] text-[var(--muted-foreground)]">Total Requests</span>
                  </div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">{totalRequests.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-[var(--muted-foreground)]" />
                    <span className="text-[11px] text-[var(--muted-foreground)]">Total Tokens</span>
                  </div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">{(totalInput + totalOutput).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-[var(--muted-foreground)]" />
                    <span className="text-[11px] text-[var(--muted-foreground)]">Input / Output</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--foreground)]">{totalInput.toLocaleString()} / {totalOutput.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-[var(--muted-foreground)]">Estimated Cost</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">${totalCost.toFixed(4)}</p>
                </div>
              </div>

              {/* Activity Chart */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Last 7 Days</h3>
                <div className="flex items-end gap-1.5 h-20">
                  {dailyUsage.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[var(--primary)]/20 rounded-t-md relative" style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? 4 : 0 }}>
                        <div className="absolute bottom-0 w-full bg-[var(--primary)] rounded-t-md" style={{ height: '100%' }} />
                      </div>
                      <span className="text-[9px] text-[var(--muted-foreground)]">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Model */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">By Model</h3>
                <div className="space-y-2">
                  {Object.entries(byModel).sort((a, b) => b[1].count - a[1].count).map(([model, stats]) => (
                    <div key={model} className="flex items-center justify-between p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{model}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">{stats.count} requests</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[var(--foreground)]">${stats.cost.toFixed(4)}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">{(stats.input + stats.output).toLocaleString()} tokens</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
