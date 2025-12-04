
import React from 'react';
import { Monitor, Server, Power, RefreshCw, Trash2 } from 'lucide-react';
import { MTAccount, ConnectionStatus, AccountRole } from '../types';

interface AccountCardProps {
  account: MTAccount;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, onDelete, onToggle }) => {
  const isConnected = account.status === ConnectionStatus.CONNECTED;
  const isSource = account.role === AccountRole.SOURCE;

  // Helper to determine status colors
  const getStatusStyles = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return {
          container: 'bg-green-500/10 text-green-400 border-green-500/20',
          dot: 'bg-green-500'
        };
      case ConnectionStatus.CONNECTING:
        return {
          container: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500'
        };
      case ConnectionStatus.ERROR:
      case ConnectionStatus.DISCONNECTED:
      default:
        return {
          container: 'bg-red-500/10 text-red-400 border-red-500/20',
          dot: 'bg-red-500'
        };
    }
  };

  const statusStyles = getStatusStyles(account.status);

  return (
    <div className={`relative overflow-hidden rounded-xl border ${
      isSource ? 'border-amber-500/30 bg-amber-500/5' : 'border-blue-500/30 bg-blue-500/5'
    } p-5 transition-all hover:border-opacity-50`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isSource ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{account.name}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded">{account.login}</span>
              <span>{account.server}</span>
            </div>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${statusStyles.container}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${statusStyles.dot}`}></div>
          {account.status}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-500 mb-1">Balance</p>
          <p className="text-lg font-mono font-medium text-slate-200">
            {account.balance.toLocaleString('en-US', { style: 'currency', currency: account.currency })}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Equity</p>
          <p className={`text-lg font-mono font-medium ${
            account.equity >= account.balance ? 'text-green-400' : 'text-red-400'
          }`}>
            {account.equity.toLocaleString('en-US', { style: 'currency', currency: account.currency })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-slate-700/50 pt-4">
        <button 
          onClick={() => onToggle(account.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            isConnected 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
          }`}
        >
          <Power className="w-4 h-4" />
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
        <button 
          onClick={() => onDelete(account.id)}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Role Badge */}
      <div className={`absolute top-0 right-0 px-2 py-1 rounded-bl-lg text-[10px] font-bold tracking-wider ${
         isSource ? 'bg-amber-500 text-slate-900' : 'bg-blue-500 text-white'
      }`}>
        {account.role}
      </div>
    </div>
  );
};
