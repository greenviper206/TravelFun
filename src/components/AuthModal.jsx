'use client';

import React, { useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import { auth, hasValidFirebaseConfig } from '../lib/firebaseClient';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { X, Sparkles, AlertCircle } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2 shrink-0" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

export default function AuthModal() {
  const { isAuthModalOpen, setAuthModalOpen, setCurrentUser } = useTripStore();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setError(null);
    setAuthModalOpen(false);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    if (!hasValidFirebaseConfig) {
      setError('偵測到未設定 Firebase 金鑰！請聯絡系統管理員或在環境變數中設定 Firebase 金鑰。');
      setLoading(false);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      if (userCredential?.user) {
        setCurrentUser({
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: userCredential.user.displayName || '',
          photoURL: userCredential.user.photoURL || ''
        });
        handleClose();
      }
    } catch (err) {
      setError(err.message || 'Google 登入失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
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
            開啟您的旅程
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            登入後即可編輯私密行程與發布至大廳，保存您的行程檔案
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-lg bg-red-950/40 border border-red-800 text-red-200 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-250 text-sm disabled:opacity-50 cursor-pointer"
        >
          <GoogleIcon />
          {loading ? '連線中...' : '使用 Google 帳號登入 / 註冊'}
        </button>


      </div>
    </div>
  );
}
