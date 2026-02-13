
import React, { useState } from 'react';
import { supabase, linkUserToIp } from '../services/supabaseService';
import { X, Loader2, Sparkles, LogIn, UserPlus, AlertCircle, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      let authResponse;
      if (isLogin) {
        authResponse = await supabase.auth.signInWithPassword({ email, password });
      } else {
        authResponse = await supabase.auth.signUp({ email, password });
      }
      
      if (authResponse.error) throw authResponse.error;

      if (stayLoggedIn && authResponse.data.user) {
        await linkUserToIp(authResponse.data.user.id);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message === 'Invalid API key' ? 'Auth service error' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800/50 w-full max-w-sm rounded-[2rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] relative ring-1 ring-white/5">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-all hover:rotate-90"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl mb-6 shadow-inner ring-1 ring-indigo-500/20">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 leading-none">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 text-xs font-medium italic tracking-wide">
            Secure User Login
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2 block">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500 transition-all font-sans text-xs shadow-inner"
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500 transition-all font-sans text-xs shadow-inner"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] ml-2 block">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500 transition-all font-sans text-xs shadow-inner"
                placeholder="••••••••"
              />
            </div>
          )}

          <div className="flex items-center gap-3 px-2">
            <button
              type="button"
              onClick={() => setStayLoggedIn(!stayLoggedIn)}
              className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${stayLoggedIn ? 'bg-indigo-600 border-indigo-500' : 'bg-black/40 border-slate-800'}`}
            >
              {stayLoggedIn && <ShieldCheck size={10} className="text-white" />}
            </button>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Stay logged in on this IP</span>
          </div>

          {error && (
            <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl text-rose-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 animate-pulse">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl transition-all shadow-2xl flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>{isLogin ? <LogIn size={20} /> : <UserPlus size={20} />} {isLogin ? 'Login' : 'Sign Up'}</>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-slate-600 hover:text-indigo-400 text-[9px] font-black uppercase tracking-[0.3em] transition-all"
          >
            {isLogin ? "Create an account" : "Already have an account?"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
