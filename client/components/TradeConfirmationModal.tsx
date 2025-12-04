
import React from 'react';
import { AlertCircle, CheckCircle, XCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { PendingConfirmation, TradeType } from '../types';

interface TradeConfirmationModalProps {
  pendingConfirmations: PendingConfirmation[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const TradeConfirmationModal: React.FC<TradeConfirmationModalProps> = ({ 
  pendingConfirmations, 
  onApprove, 
  onReject 
}) => {
  if (pendingConfirmations.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none p-4 sm:p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold">Trade Confirmation Required</h3>
            </div>
            <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full border border-slate-700">
                {pendingConfirmations.length} Pending
            </span>
        </div>

        {/* List of pending items */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
            {pendingConfirmations.map((item) => (
                <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 relative group">
                     {/* Top Row: Accounts */}
                     <div className="flex items-center text-xs text-slate-400 mb-2">
                        <span className="font-medium text-slate-300">{item.sourceAccountName}</span>
                        <ArrowRight className="w-3 h-3 mx-2 text-slate-600" />
                        <span className="font-medium text-slate-300">{item.destAccountName}</span>
                     </div>

                     {/* Main Row: Trade Info */}
                     <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                             <div className={`text-sm font-bold px-2 py-0.5 rounded ${
                                 item.tradeDetails.type === TradeType.BUY 
                                 ? 'bg-green-500/20 text-green-400' 
                                 : 'bg-red-500/20 text-red-400'
                             }`}>
                                 {item.tradeDetails.type}
                             </div>
                             <div className="text-lg font-bold text-slate-100">{item.tradeDetails.symbol}</div>
                         </div>
                         <div className="text-right">
                             <div className="text-sm font-mono text-slate-300">{item.tradeDetails.lots} Lots</div>
                             <div className="text-xs text-slate-500">@ {item.tradeDetails.openPrice}</div>
                         </div>
                     </div>
                    
                    {/* Buttons */}
                     <div className="flex gap-2">
                         <button 
                            onClick={() => onApprove(item.id)}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                         >
                             <CheckCircle className="w-4 h-4" /> Approve
                         </button>
                         <button 
                            onClick={() => onReject(item.id)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                         >
                             <XCircle className="w-4 h-4" /> Reject
                         </button>
                     </div>

                     {/* AI Badge if detected */}
                     {item.tradeDetails.comment && item.tradeDetails.comment.includes('AI') && (
                         <div className="absolute top-2 right-2">
                             <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                                 AI-AUTO
                             </span>
                         </div>
                     )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
