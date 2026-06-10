'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, mockTrips } from '../store/useTripStore';
import { db, hasValidFirebaseConfig } from '../lib/firebaseClient';
import { collection, getDocs, doc, setDoc, query, where, or } from 'firebase/firestore';
import { Search, MapPin, Calendar, User, Eye, Copy, AlertCircle, Database, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ExploreLobby() {
  const router = useRouter();
  const {
    tripsList,
    filteredTrips,
    setTripsList,
    searchQuery,
    setSearchQuery,
    selectedCountry,
    setSelectedCountry,
    selectedCity,
    setSelectedCity,
    currentUser,
    setAuthModalOpen,
    setCurrentTrip,
    isLoading,
    setIsLoading
  } = useTripStore();

  const [dbStatus, setDbStatus] = useState('preview');

  // Load Trips
  useEffect(() => {
    const fetchTrips = async () => {
      setIsLoading(true);
      console.log("Firebase API Key 實際內容:", JSON.stringify(process.env.NEXT_PUBLIC_FIREBASE_API_KEY));
      console.log("Firebase API Key 字串長度:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.length);
      if (!hasValidFirebaseConfig) {
        console.log('Using local mock data - Firebase not configured');
        const currentTrips = useTripStore.getState().tripsList;
        setTripsList(currentTrips);
        setDbStatus('preview');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        let q;
        if (currentUser && currentUser.id) {
          q = query(
            collection(db, 'trips'),
            or(
              where('is_public', '==', true),
              where('user_id', '==', currentUser.id)
            )
          );
        } else {
          q = query(collection(db, 'trips'), where('is_public', '==', true));
        }
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setTripsList(data);
        setDbStatus('connected');
      } catch (err) {
        console.error('Error fetching trips from Firebase:', err instanceof Error ? err.message : err);
        setTripsList(mockTrips);
        setDbStatus('preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrips();
  }, [setTripsList, setIsLoading, currentUser]);

  // Derived state for Country tabs
  const countries = ['All', ...Array.from(new Set(tripsList.map(t => t.country)))];

  // Derived state for City subtabs (dynamic lock/unlock based on selected country)
  const availableCities = selectedCountry && selectedCountry !== 'All'
    ? ['All', ...Array.from(new Set(tripsList.filter(t => t.country === selectedCountry).map(t => t.city)))]
    : [];

  // One-click Fork / Clone Trip
  const handleForkTrip = async (e, trip) => {
    e.stopPropagation(); // Avoid card click navigation

    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    setIsLoading(true);

    // Deep copy and transform
    const clonedTrip = {
      id: `trip-${Date.now()}`,
      title: `${trip.title} (複製版) 📝`,
      country: trip.country,
      city: trip.city,
      is_public: false, // Clone starts as private
      user_id: currentUser.id,
      days_data: JSON.parse(JSON.stringify(trip.days_data)), // Deep copy of days & places
      created_at: new Date().toISOString()
    };

    // Confetti effect!
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#8b5cf6', '#10b981', '#ffffff']
    });

    if (dbStatus === 'connected' && hasValidFirebaseConfig) {
      try {
        await setDoc(doc(db, 'trips', clonedTrip.id), {
          id: clonedTrip.id,
          title: clonedTrip.title,
          country: clonedTrip.country,
          city: clonedTrip.city,
          is_public: clonedTrip.is_public,
          user_id: clonedTrip.user_id,
          days_data: clonedTrip.days_data,
          created_at: clonedTrip.created_at
        });

        // Update list locally
        setCurrentTrip(clonedTrip);
        router.push(`/edit/${clonedTrip.id}`);
      } catch (err) {
        console.error('Error saving cloned trip to Firebase:', err);
        // Fallback to local editor transition if database write fails
        setCurrentTrip(clonedTrip);
        router.push(`/edit/${clonedTrip.id}`);
      }
    } else {
      // Preview mode: Update locally in Zustand and proceed
      const updatedList = [clonedTrip, ...tripsList];
      setTripsList(updatedList);
      setCurrentTrip(clonedTrip);
      router.push(`/edit/${clonedTrip.id}`);
    }
    
    setIsLoading(false);
  };

  const handleCardClick = (trip) => {
    setCurrentTrip(trip);
    router.push(`/edit/${trip.id}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* DB Connection Status Banner */}
      {dbStatus === 'preview' && (
        <div className="glass bg-yellow-500/10 border-yellow-500/20 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertCircle className="text-yellow-400 shrink-0 mt-1 md:mt-0" size={20} />
            <div className="text-sm">
              <span className="font-bold text-yellow-300">預覽體驗模式 (使用 Mock 靜態資料)</span>
              <p className="text-slate-400 mt-1">
                尚未配置 Firebase 金鑰。您仍可自由體驗行程搜尋、篩選、新增、編輯以及一鍵複製（在瀏覽器記憶體中暫存）等全部功能！
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-[#0b0f19] px-3.5 py-2 rounded-lg transition-colors duration-200"
            >
              一鍵模擬登入
            </button>
          </div>
        </div>
      )}

      {dbStatus === 'connected' && (
        <div className="glass bg-emerald-500/10 border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
          <Database className="text-emerald-400" size={20} />
          <div className="text-sm text-slate-300">
            <span className="font-bold text-emerald-400">雲端資料庫已連線 (Firebase)</span>
            <p className="text-slate-400 text-xs">行程變更將直接儲存至 Firestore。感謝使用！</p>
          </div>
        </div>
      )}

      {/* Main Title & Search */}
      <div className="text-center space-y-4 max-w-2xl mx-auto py-4">
        <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          探索別人的 <span className="gradient-text">完美旅程</span>
        </h2>
        <p className="text-slate-400 text-sm md:text-base">
          在大廳尋找世界各地的精選旅遊行程，點擊複製即可快速編輯，調整為屬於您專屬的旅遊計畫。
        </p>

        {/* Search Box */}
        <div className="relative max-w-lg mx-auto mt-6">
          <div className="flex items-center bg-slate-900/60 border border-slate-800 focus-within:border-indigo-500 rounded-xl px-4 py-3 search-input-glow transition-all duration-200">
            <Search className="text-slate-400 mr-2" size={18} />
            <input
              type="text"
              placeholder="搜尋行程標題、國家或城市..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs Container */}
      <div className="glass p-5 rounded-2xl space-y-4 shadow-xl">
        {/* Country Filter */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
            選擇國家 / 地區
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {countries.map(country => {
              const isActive = (selectedCountry === null && country === 'All') || selectedCountry === country;
              return (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(country === 'All' ? null : country)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold shrink-0 transition-all duration-200 ${
                    isActive
                      ? 'gradient-brand text-white shadow-md shadow-indigo-500/20 scale-102'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {country === 'All' ? '🌍 全部國家' : country}
                </button>
              );
            })}
          </div>
        </div>

        {/* City Filter (Conditional based on Country selected) */}
        {selectedCountry && selectedCountry !== 'All' && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60 animate-fade-in">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block">
              地區城市篩選 (連動解鎖 🔓)
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {availableCities.map(city => {
                const isActive = (selectedCity === null && city === 'All') || selectedCity === city;
                return (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city === 'All' ? null : city)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-500 text-white shadow-md scale-102'
                        : 'bg-slate-950 border border-slate-900 text-slate-500 hover:text-white'
                    }`}
                  >
                    {city === 'All' ? '🌆 所有城市' : city}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-600/30 border-t-indigo-500 animate-spin"></div>
          <span className="text-slate-400 text-sm font-semibold">讀取行程檔案中...</span>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
          <MapPin className="text-slate-600 mx-auto mb-3" size={40} />
          <h3 className="text-lg font-bold text-slate-300">找不到相符的行程</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            嘗試更換關鍵字、國家或城市，或者點擊右上角的「規劃新行程」開始創建您的旅途吧！
          </p>
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map(trip => {
            // Count total locations in days_data
            const totalPlaces = trip.days_data.reduce((acc, d) => acc + (d.places?.length || 0), 0);
            
            return (
              <div
                key={trip.id}
                onClick={() => handleCardClick(trip)}
                className="group relative rounded-2xl glass glass-hover p-6 flex flex-col justify-between cursor-pointer select-none overflow-hidden"
              >
                {/* Visual card glow decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300"></div>
                
                <div className="space-y-4">
                  {/* Country & City Tags */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-950/40 border border-indigo-800/40 text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                      {trip.country}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-slate-950/40 border border-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      {trip.city}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-extrabold text-white leading-snug group-hover:text-indigo-400 transition-colors duration-200">
                    {trip.title}
                  </h3>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  {/* Left: Stats */}
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-slate-500" />
                      <span>{trip.days_data.length} 天</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-500" />
                      <span>{totalPlaces} 個景點</span>
                    </span>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleForkTrip(e, trip)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400 hover:text-white transition-all duration-200 font-semibold text-[11px]"
                      title="複製此行程到我的收藏，並開始編輯"
                    >
                      <Copy size={11} />
                      <span>複製行程</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
