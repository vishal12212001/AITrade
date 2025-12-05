import React from 'react';
import { Trade, TradeType } from '../types';
import { ArrowDownRight, ArrowUpRight, Calendar, DollarSign } from 'lucide-react';

interface HistoryTableProps {
  history: Trade[];
  title: string;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ history, title }) => {
  if (history.length === 0) {
    return (
      <div className="border border-slate-800 bg-slate-800/50 rounded-xl p-12 text-center flex flex-col items-center justify-center">
        <div className="bg-slate-800 p-4 rounded-full mb-4">
          <Calendar className="w-6 h-6 text-slate-500" />
        </div>
        <h3 className="text-slate-300 font-medium mb-1">{title}</h3>
        <p className="text-slate-500 text-sm">No closed trades history available yet.</p>
      </div>
    );
  }

  // Safe sorting
  const sortedHistory = [...history].sort((a, b) => {
    const timeA = a.closeTime ? new Date(a.closeTime).getTime() : 0;
    const timeB = b.closeTime ? new Date(b.closeTime).getTime() : 0;
    return timeB - timeA;
  });

  // Safe profit sum
  const totalProfit = sortedHistory.reduce((sum, t) => sum + (t.profit ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end px-1">
        <h3 className="text-lg font-bold text-slate-200">{title}</h3>
        <div
          className={`px-3 py-1 rounded-lg border text-sm font-mono font-medium flex items-center gap-2 ${
            totalProfit >= 0
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          <DollarSign className="w-3 h-3" />
          Total P/L: {totalProfit > 0 ? '+' : ''}
          {totalProfit.toFixed(2)}
        </div>
      </div>

      <div className="border border-slate-700 bg-slate-800/30 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/80">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3 text-right">Price (In)</th>
                <th className="px-4 py-3 text-right">Price (Out)</th>
                <th className="px-4 py-3 text-right">Profit</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/50">
              {sortedHistory.map((trade) => (
                <tr key={trade.id} className="hover:bg-slate-700/20 transition-colors group">
                  {/* TIME COLUMN */}
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    <div>
                      <span className="text-slate-500">Close:</span>
                      {trade.closeTime
                        ? new Date(trade.closeTime || 0).toLocaleTimeString()
                        : '-'}
                    </div>

                    <div className="text-[10px] opacity-60">
                      {trade.closeTime
                        ? new Date(trade.closeTime || 0).toLocaleDateString()
                        : '-'}
                    </div>
                  </td>

                  {/* SYMBOL */}
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {trade.symbol}
                    <div className="text-[10px] text-slate-500 font-mono">
                      #{trade.ticket}
                    </div>
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`p-1 rounded ${
                          trade.type === TradeType.BUY
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {trade.type === TradeType.BUY ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                      </span>

                      <span
                        className={`text-xs font-bold ${
                          trade.type === TradeType.BUY
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {trade.type} {trade.lots}
                      </span>
                    </div>
                  </td>

                  {/* PRICE IN */}
                  <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs">
                    {(trade.openPrice ?? 0).toFixed(5)}
                  </td>

                  {/* PRICE OUT */}
                  <td className="px-4 py-3 text-right text-slate-300 font-mono text-xs group-hover:text-white">
                    {trade.closePrice ? trade.closePrice.toFixed(5) : '-'}
                  </td>

                  {/* PROFIT */}
                  <td
                    className={`px-4 py-3 text-right font-mono font-bold ${
                      (trade.profit ?? 0) >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {(trade.profit ?? 0) > 0 ? '+' : ''}
                    {(trade.profit ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
