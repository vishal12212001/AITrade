import React, { useState } from 'react';
import { X, Server, User, Globe, Hash, Key, AlertCircle, Percent, ListFilter } from 'lucide-react';
import { Platform, AccountRole, MTAccount } from '../types';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (account: Partial<MTAccount>) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    server: '',
    platform: Platform.MT5,
    role: AccountRole.SOURCE,
    defaultTakeProfit: '',
    defaultStopLoss: '',
    allowedPairs: ''
  });

  const [errors, setErrors] = useState<{server?: string}>({});

  if (!isOpen) return null;

  const validateServer = (value: string) => {
    // Allows alphanumeric, hyphens, dots. e.g. "QuantTekel-Server" or "mt4.broker.com"
    const serverRegex = /^[a-zA-Z0-9-.]+$/;
    if (!serverRegex.test(value)) {
      return "Invalid server format. Use letters, numbers, hyphens (-) or dots (.).";
    }
    if (value.length < 3) {
      return "Server name is too short.";
    }
    return undefined;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user types
    if (field === 'server') {
        const error = validateServer(value);
        if (!error) {
            setErrors(prev => ({ ...prev, server: undefined }));
        }
    }
  };

  const handleBlur = (field: string) => {
      if (field === 'server') {
          const error = validateServer(formData.server);
          if (error) {
              setErrors(prev => ({ ...prev, server: error }));
          }
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final Validation
    const serverError = validateServer(formData.server);
    if (serverError) {
        setErrors(prev => ({ ...prev, server: serverError }));
        return;
    }

    // Process optional fields
    const newAccount: any = { ...formData };
    
    if (formData.defaultTakeProfit) newAccount.defaultTakeProfit = parseFloat(formData.defaultTakeProfit);
    else delete newAccount.defaultTakeProfit;

    if (formData.defaultStopLoss) newAccount.defaultStopLoss = parseFloat(formData.defaultStopLoss);
    else delete newAccount.defaultStopLoss;

    if (formData.allowedPairs) {
        newAccount.allowedPairs = formData.allowedPairs.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    } else {
        delete newAccount.allowedPairs;
    }

    onAdd(newAccount);
    onClose();
    
    // Reset Form
    setFormData({
      name: '',
      login: '',
      password: '',
      server: '',
      platform: Platform.MT5,
      role: AccountRole.SOURCE,
      defaultTakeProfit: '',
      defaultStopLoss: '',
      allowedPairs: ''
    });
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-white">Connect Account</h2>
            <p className="text-xs text-slate-400 mt-1">Enter trading credentials to authorize connection</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Platform Selection */}
          <div className="grid grid-cols-2 gap-4">
            <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all ${
              formData.platform === Platform.MT4 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800'
            }`}>
              <input 
                type="radio" 
                name="platform" 
                className="hidden" 
                checked={formData.platform === Platform.MT4} 
                onChange={() => handleChange('platform', Platform.MT4)} 
              />
              <span className="font-bold text-lg text-slate-200">MetaTrader 4</span>
            </label>
            <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all ${
              formData.platform === Platform.MT5 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800'
            }`}>
              <input 
                type="radio" 
                name="platform" 
                className="hidden" 
                checked={formData.platform === Platform.MT5} 
                onChange={() => handleChange('platform', Platform.MT5)} 
              />
              <span className="font-bold text-lg text-slate-200">MetaTrader 5</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Account Friendly Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  required
                  type="text" 
                  placeholder="e.g. My FTMO Challenge"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Login ID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input 
                    required
                    type="number" 
                    placeholder="Account Number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={formData.login}
                    onChange={(e) => handleChange('login', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input 
                    required
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Broker Server Address</label>
              <div className="relative">
                <Server className={`absolute left-3 top-2.5 w-4 h-4 ${errors.server ? 'text-red-500' : 'text-slate-500'}`} />
                <input 
                  required
                  type="text" 
                  placeholder="e.g. QuantTekel-Server"
                  className={`w-full bg-slate-800 border rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none transition-all ${
                      errors.server 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-slate-700 focus:border-blue-500'
                  }`}
                  value={formData.server}
                  onChange={(e) => handleChange('server', e.target.value)}
                  onBlur={() => handleBlur('server')}
                />
              </div>
              {errors.server && (
                  <div className="flex items-center gap-1 mt-1.5 text-red-400 text-xs animate-in slide-in-from-top-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.server}</span>
                  </div>
              )}
            </div>

            {/* Advanced Filters Section */}
            <div className="border-t border-slate-700/50 pt-4 mt-2">
                 <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">Advanced Filters (Optional)</h3>
                 
                 <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Default TP (%)</label>
                        <div className="relative">
                            <Percent className="absolute left-3 top-2.5 w-3 h-3 text-slate-500" />
                            <input 
                                type="number" 
                                min="0.1" step="0.1"
                                placeholder="e.g. 1.5"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-8 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                value={formData.defaultTakeProfit}
                                onChange={(e) => handleChange('defaultTakeProfit', e.target.value)}
                            />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Default SL (%)</label>
                        <div className="relative">
                            <Percent className="absolute left-3 top-2.5 w-3 h-3 text-slate-500" />
                            <input 
                                type="number" 
                                min="0.1" step="0.1"
                                placeholder="e.g. 1.0"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-8 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                                value={formData.defaultStopLoss}
                                onChange={(e) => handleChange('defaultStopLoss', e.target.value)}
                            />
                        </div>
                     </div>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Allowed Pairs (Comma Separated)</label>
                    <div className="relative">
                        <ListFilter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="EURUSD, GBPUSD, XAUUSD"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                            value={formData.allowedPairs}
                            onChange={(e) => handleChange('allowedPairs', e.target.value)}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 ml-1">Leave empty to allow all pairs.</p>
                 </div>
            </div>

          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Account Role</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${
                formData.role === AccountRole.SOURCE ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800 opacity-60 hover:opacity-100'
              }`}>
                <input 
                  type="radio" 
                  name="role" 
                  className="hidden" 
                  checked={formData.role === AccountRole.SOURCE} 
                  onChange={() => handleChange('role', AccountRole.SOURCE)} 
                />
                <Globe className="w-4 h-4 text-amber-500" />
                <div className="text-left">
                  <div className="font-bold text-sm text-slate-200">Source</div>
                  <div className="text-[10px] text-slate-400">Master Account</div>
                </div>
              </label>

              <label className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${
                formData.role === AccountRole.DESTINATION ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800 opacity-60 hover:opacity-100'
              }`}>
                <input 
                  type="radio" 
                  name="role" 
                  className="hidden" 
                  checked={formData.role === AccountRole.DESTINATION} 
                  onChange={() => handleChange('role', AccountRole.DESTINATION)} 
                />
                <User className="w-4 h-4 text-blue-500" />
                <div className="text-left">
                  <div className="font-bold text-sm text-slate-200">Destination</div>
                  <div className="text-[10px] text-slate-400">Slave Account</div>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button 
              type="submit"
              disabled={!!errors.server}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-blue-900/20"
            >
              Connect Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};