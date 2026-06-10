'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTripStore } from '../store/useTripStore';
import { Compass, Plus, LogIn, LogOut, User, MapPin } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, setCurrentUser, setAuthModalOpen, setCurrentTrip } = useTripStore();

  const handleLogoClick = () => {
    router.push('/');
  };

  const handleCreateTrip = () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    // Create a new blank trip
    const newTrip = {
      id: `trip-${Date.now()}`,
      title: '我的全新未命名行程 ✈️',
      country: '日本',
      city: '東京',
      is_public: false,
      user_id: currentUser.id,
      days_data: [
        {
          day: 1,
          places: []
        }
      ]
    };

    setCurrentTrip(newTrip);
    router.push(`/edit/${newTrip.id}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-lg">
      {/* Brand Logo */}
      <div 
        onClick={handleLogoClick}
        className="flex items-center gap-2.5 cursor-pointer select-none group"
      >
        <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
          <Compass size={22} className="group-hover:rotate-45 transition-transform duration-300" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-wider gradient-text">
            TravelFun
          </h1>
          <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase block -mt-1">
            社群行程規劃助手
          </span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-4">
        {pathname !== '/' && (
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <Compass size={16} />
            <span>探索大廳</span>
          </button>
        )}

        <button
          onClick={handleCreateTrip}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold gradient-brand text-white hover:opacity-95 shadow-md shadow-indigo-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 glow-btn"
        >
          <Plus size={16} />
          <span>規劃新行程</span>
        </button>

        {/* User Auth controls */}
        <div className="h-6 w-[1px] bg-slate-800"></div>

        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <User size={12} className="text-indigo-400" />
              <span className="max-w-[120px] truncate">{currentUser.email}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border border-red-950/30 text-red-400 hover:text-red-300 hover:bg-red-950/20 active:scale-[0.98] transition-all duration-200"
              title="登出系統"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">登出</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 hover:border-slate-700 active:scale-[0.98] transition-all duration-200"
          >
            <LogIn size={16} />
            <span>登入 / 註冊</span>
          </button>
        )}
      </div>
    </header>
  );
}
