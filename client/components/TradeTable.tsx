import React from 'react';
import { Trade, TradeType } from '../types';

interface TradeTableProps {
  trades: Trade[];
  title: string;
}

export const TradeTable: React.FC<TradeTableProps> = ({ trades, title }) => {
  if (trades.length === 0) {
    return (
      <div className="border border-slate-800 bg-slate-800/50 rounded-xl p-8 text-center">
        <h3 className="text-slate-300 font-medium mb-1">{title}</h3>
        <p className="text-slate-500 text-sm">No active positions</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-700 bg-slate-800/30 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
        <h3 className="font-semibold text-slate-200">{title}</h3>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">{trades.length} Open</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800/80">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Lots</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-200">
                  {trade.symbol}
                  <div className="text-[10px] text-slate-500">#{trade.ticket}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    trade.type === TradeType.BUY 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{trade.lots}</td>
                <td className="px-4 py-3 text-right text-slate-300 font-mono">
                  {trade.currentPrice.toFixed(5)}
                </td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${
                  trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
