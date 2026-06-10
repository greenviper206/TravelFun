'use client';

import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { supabase, hasValidSupabaseConfig } from '../lib/supabaseClient';
import { X, Mail, Lock, Sparkles, User, AlertCircle } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, setAuthModalOpen, setCurrentUser } = useTripStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setError(null);
    setAuthModalOpen(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError('請輸入信箱與密碼！');
      setLoading(false);
      return;
    }

    if (!hasValidSupabaseConfig()) {
      setError('偵測到未設定 Supabase 金鑰！建議您使用下方的「測試帳號一鍵登入」進行即時預覽體驗。');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        if (data?.user) {
          setCurrentUser({ id: data.user.id, email: data.user.email || '' });
          handleClose();
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        if (data?.user) {
          setError('註冊成功！若有啟用信箱驗證，請至信箱點擊驗證信；或者您可直接嘗試登入。');
        }
      }
    } catch (err) {
      setError(err.message || '發生錯誤，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  // 測試帳號快速體驗
  const handleQuickLogin = () => {
    setCurrentUser({
      id: 'mock-user-123',
      email: 'test.traveler@travelfun.io',
    });
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl glass p-8 shadow-2xl transition-all duration-300">
        
        {/* Glow effect in background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors duration-200"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl gradient-brand text-white mb-3 shadow-lg shadow-indigo-500/20">
            <Sparkles size={24} className="animate-pulse-slow" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? '歡迎回來' : '開啟您的旅程'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isLogin ? '登入後即可編輯私密行程與發布至大廳' : '註冊新帳號以保存您的行程檔案'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900/80 p-1 rounded-lg mb-6 border border-slate-800">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
              isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            帳號登入
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
              !isLogin ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            免費註冊
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-lg bg-red-950/40 border border-red-800 text-red-200 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              電子信箱 (Email)
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              安全密碼 (Password)
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-brand hover:opacity-90 active:scale-[0.98] text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-indigo-500/20 glow-btn transition-all duration-200 text-sm mt-2 disabled:opacity-50"
          >
            {loading ? '連線中...' : isLogin ? '立即登入' : '開始註冊'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="px-3 text-xs text-slate-500 uppercase tracking-wider">或</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Guest Bypass Button */}
        <button
          onClick={handleQuickLogin}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
        >
          <User size={16} />
          測試帳號一鍵登入 (體驗首選)
        </button>
      </div>
    </div>
  );
}
