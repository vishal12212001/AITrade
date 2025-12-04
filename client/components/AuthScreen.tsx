import React, { useState, useEffect } from 'react';
import { Activity, Mail, Lock, User, ArrowRight, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

type AuthView = 'LOGIN' | 'SIGNUP' | 'VERIFY';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('LOGIN');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Verification State
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [showSimulatedEmail, setShowSimulatedEmail] = useState(false);

  // Error State
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API Call
    setTimeout(() => {
      // Mock validation
      if (email && password.length >= 6) {
        onLogin({
          id: 'user-1',
          name: 'Trader',
          email: email,
          isVerified: true,
          joinedDate: new Date().toISOString()
        });
      } else {
        setError('Invalid credentials. Password must be 6+ chars.');
        setLoading(false);
      }
    }, 1500);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError("All fields are required");
      return;
    }
    
    setLoading(true);
    setError('');

    // Simulate Sending Email
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setLoading(false);
      setView('VERIFY');
      setShowSimulatedEmail(true);
    }, 1500);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (inputCode === generatedCode) {
        onLogin({
          id: `user-${Date.now()}`,
          name: name,
          email: email,
          isVerified: true,
          joinedDate: new Date().toISOString()
        });
      } else {
        setError('Invalid verification code. Please check your simulated email.');
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
           style={{ 
             backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* Simulated Email Notification Toast */}
      {showSimulatedEmail && view === 'VERIFY' && (
        <div className="absolute top-4 right-4 max-w-sm w-full bg-white text-slate-900 rounded-lg shadow-2xl p-4 border-l-4 border-blue-600 animate-in slide-in-from-right z-50">
          <div className="flex items-start gap-3">
             <div className="bg-blue-100 p-2 rounded-full">
               <Mail className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <h4 className="font-bold text-sm">New Email: MetaSync Verify</h4>
               <p className="text-xs text-slate-500 mt-1">Hello {name}, your verification code is:</p>
               <div className="text-2xl font-mono font-bold text-blue-600 my-1">{generatedCode}</div>
               <p className="text-[10px] text-slate-400">Sent to {email}</p>
             </div>
             <button onClick={() => setShowSimulatedEmail(false)} className="text-slate-400 hover:text-slate-600">×</button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden relative z-10">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 text-blue-400">
              <Activity className="w-8 h-8" />
              <h1 className="text-2xl font-bold tracking-tight text-white">MetaSync AI</h1>
            </div>
          </div>

          <h2 className="text-xl font-bold text-center text-slate-200 mb-6">
            {view === 'LOGIN' && 'Welcome Back'}
            {view === 'SIGNUP' && 'Create Account'}
            {view === 'VERIFY' && 'Verify Email'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {view === 'SIGNUP' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                  <input 
                    type="password" 
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {view === 'VERIFY' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center space-y-2">
                 <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-500" />
                 </div>
                 <p className="text-slate-400 text-sm">
                   We've sent a verification code to <span className="text-white font-medium">{email}</span>.
                 </p>
                 <p className="text-xs text-slate-500">
                   (Check the notification in top right corner)
                 </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 ml-1 text-center block">Verification Code</label>
                <input 
                    type="text" 
                    required
                    maxLength={6}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 text-center text-2xl font-mono tracking-widest text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
                    placeholder="000000"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                  />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify & Login'}
                {!loading && <ShieldCheck className="w-4 h-4" />}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            {view === 'LOGIN' && (
              <p className="text-sm text-slate-400">
                Don't have an account?{' '}
                <button onClick={() => setView('SIGNUP')} className="text-blue-400 hover:text-blue-300 font-medium">Sign up</button>
              </p>
            )}
            {view === 'SIGNUP' && (
              <p className="text-sm text-slate-400">
                Already have an account?{' '}
                <button onClick={() => setView('LOGIN')} className="text-blue-400 hover:text-blue-300 font-medium">Log in</button>
              </p>
            )}
            {view === 'VERIFY' && (
              <button onClick={() => { setView('SIGNUP'); setShowSimulatedEmail(false); }} className="text-sm text-slate-500 hover:text-slate-300">
                Wrong email? Back to Sign Up
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};