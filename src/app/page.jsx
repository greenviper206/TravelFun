'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, mockTrips as defaultMockTrips } from '../store/useTripStore';
import { db, hasValidFirebaseConfig } from '../lib/firebaseClient';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Search, MapPin, Calendar, AlertCircle, Database, Copy, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ExploreLobby() {
  const router = useRouter();
  const { setCurrentTrip, currentUser } = useTripStore();
  const [tripsList, setTripsList] = useState([]);
  const [dbStatus, setDbStatus] = useState('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const mockTrips = defaultMockTrips || [
    { 
      id: 'mock-1', 
      title: '東京五天四夜櫻花季', 
      country: '日本', 
      city: '東京', 
      days_data: [{ places: [1, 2] }, { places: [1] }] 
    },
    { 
      id: 'mock-2', 
      title: '巴黎浪漫鐵塔遊', 
      country: '法國', 
      city: '巴黎', 
      days_data: [{ places: [1, 2, 3] }] 
    }
  ];

  useEffect(() => {
    async function fetchTrips() {
      try {
        setDbStatus('loading');
        setIsLoading(true);

        if (!hasValidFirebaseConfig) {
          console.log("偵測到未設定 Firebase 金鑰，啟用 Mock 預覽模式。");
          setTripsList(mockTrips);
          setDbStatus('preview');
          return;
        }
        
        const querySnapshot = await getDocs(collection(db, "trips"));
        
        if (!querySnapshot.empty) {
          const firebaseTrips = [];
          querySnapshot.forEach((doc) => {
            firebaseTrips.push({ id: doc.id, ...doc.data() });
          });
          
          setTripsList(firebaseTrips);
          setDbStatus('connected'); 
        } else {
          console.log("Firebase 中沒有任何行程資料，啟用 Mock 資料展示。");
          setTripsList(mockTrips);
          setDbStatus('connected'); 
        }
      } catch (err) {
        console.error('Error fetching trips from Firebase, falling back to mock:', err);
        setTripsList(mockTrips);
        setDbStatus('preview'); 
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrips();
  }, []);

  const countries = ['All', ...new Set(tripsList.map(t => t.country).filter(Boolean))];
  
  const availableCities = selectedCountry 
    ? ['All', ...new Set(tripsList.filter(t => t.country === selectedCountry).map(t => t.city).filter(Boolean))]
    : ['All'];

  const filteredTrips = tripsList.filter(trip => {
    const matchesSearch = searchQuery.trim() === '' || 
      trip.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry = !selectedCountry || trip.country === selectedCountry;
    const matchesCity = !selectedCity || trip.city === selectedCity;

    return matchesSearch && matchesCountry && matchesCity;
  });

  const handleForkTrip = async (e, trip) => {
    e.stopPropagation(); 

    if (!currentUser) {
      alert("請先登入帳號以複製並編輯行程！"); 
      return;
    }

    setIsLoading(true);

    const clonedTrip = {
      id: `trip-${Date.now()}`,
      title: `${trip.title} (複製版) 📝`,
      country: trip.country || '',
      city: trip.city || '',
      is_public: false, 
      user_id: currentUser.id || currentUser.uid,
      days_data: JSON.parse(JSON.stringify(trip.days_data || [])), 
      created_at: new Date().toISOString()
    };

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#8b5cf6', '#10b981', '#ffffff']
    });

    if (dbStatus === 'connected' && hasValidFirebaseConfig) {
      try {
        await setDoc(doc(db, 'trips', clonedTrip.id), clonedTrip);
        setCurrentTrip(clonedTrip);
        router.push(`/edit/${clonedTrip.id}`);
      } catch (err) {
        console.error('Error saving cloned trip to Firebase:', err);
        setCurrentTrip(clonedTrip);
        router.push(`/edit/${clonedTrip.id}`);
      }
    } else {
      setCurrentTrip(clonedTrip);
      router.push(`/edit/${clonedTrip.id}`);
    }
    
    setIsLoading(false);
  };

  const handleDeleteTrip = async (e, trip) => {
    e.stopPropagation();
    const isConfirmed = window.confirm('確認刪除此行程？');
    if (!isConfirmed) return;

    setIsLoading(true);

    if (dbStatus === 'connected' && hasValidFirebaseConfig) {
      try {
        await deleteDoc(doc(db, 'trips', trip.id));
        setTripsList(prev => prev.filter(t => t.id !== trip.id));
        alert('行程已成功刪除！');
      } catch (err) {
        console.error('Error deleting trip from Firebase:', err);
        alert('刪除失敗，您可能沒有權限刪除此行程。');
      }
    } else {
      setTripsList(prev => prev.filter(t => t.id !== trip.id));
      alert('行程已成功刪除！（預覽體驗模式）');
    }

    setIsLoading(false);
  };
  const handleCardClick = (trip) => {
    if (!currentUser) {
      alert("請先登入帳號！");
      return;
    }
    setCurrentTrip(trip);
    router.push(`/edit/${trip.id}`);
  };

  return (
    <div className="space-y-8 animate-fade-in p-6 max-w-7xl mx-auto">
      {dbStatus === 'preview' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertCircle className="text-yellow-400 shrink-0 mt-1 md:mt-0" size={20} />
            <div className="text-sm">
              <span className="font-bold text-yellow-300">預覽體驗模式 (使用 Mock 靜態資料)</span>
              <p className="text-slate-400 mt-1">
                尚未配置 Firebase 金鑰或權限受限。請聯絡系統管理員，或登入您的帳號以開始新增、編輯、複製及儲存您的行程。
              </p>
            </div>
          </div>
        </div>
      )}

      {dbStatus === 'connected' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
          <Database className="text-emerald-400" size={20} />
          <div className="text-sm text-slate-300">
            <span className="font-bold text-emerald-400">雲端資料庫已連線 (Firebase)</span>
            <p className="text-slate-400 text-xs">行程變更將直接儲存至 Firestore。感謝使用！</p>
          </div>
        </div>
      )}

      <div className="text-center space-y-4 max-w-2xl mx-auto py-4">
        <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl text-white">
          探索別人的 <span className="text-indigo-400">完美旅程</span>
        </h2>
        <p className="text-slate-400 text-sm md:text-base">
          在大廳尋找世界各地的精選旅遊行程，點擊複製即可快速編輯，調整為屬於您專屬的旅遊計畫。
        </p>

        <div className="relative max-w-lg mx-auto mt-6">
          <div className="flex items-center bg-slate-900/60 border border-slate-800 focus-within:border-indigo-500 rounded-xl px-4 py-3 transition-all duration-200">
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

      <div className="bg-slate-900/40 p-5 rounded-2xl space-y-4 shadow-xl border border-slate-800">
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
                  onClick={() => {
                    setSelectedCountry(country === 'All' ? null : country);
                    setSelectedCity(null); 
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold shrink-0 transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md scale-105'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {country === 'All' ? '🌍 全部國家' : country}
                </button>
              );
            })}
          </div>
        </div>

        {selectedCountry && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
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
                        ? 'bg-indigo-500 text-white shadow-md'
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

      {isLoading && tripsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-600/30 border-t-indigo-500 animate-spin"></div>
          <span className="text-slate-400 text-sm font-semibold">讀取行程檔案中...</span>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
          <MapPin className="text-slate-600 mx-auto mb-3" size={40} />
          <h3 className="text-lg font-bold text-slate-300">找不到相符的行程</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            嘗試更換關鍵字、國家或城市，或者開始創建您的全新旅途吧！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map(trip => {
            const totalPlaces = (trip.days_data || []).reduce((acc, d) => acc + (d.places?.length || 0), 0);
            
            const isOwner = currentUser && (trip.user_id === currentUser.id || trip.user_id === currentUser.uid);

            return (
              <div
                key={trip.id}
                onClick={() => handleCardClick(trip)}
                className="group relative rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 shadow-lg overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {trip.country && (
                      <span className="px-2.5 py-1 rounded-md bg-indigo-950/40 border border-indigo-800/40 text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                        {trip.country}
                      </span>
                    )}
                    {trip.city && (
                      <span className="px-2.5 py-1 rounded-md bg-slate-950/40 border border-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {trip.city}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-extrabold text-white leading-snug group-hover:text-indigo-400 transition-colors duration-200">
                    {trip.title}
                  </h3>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-slate-500" />
                      <span>{trip.days_data?.length || 0} 天</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-500" />
                      <span>{totalPlaces} 個景點</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        onClick={(e) => handleDeleteTrip(e, trip)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white transition-all duration-200 font-semibold text-[11px]"
                        title="刪除此行程"
                      >
                        <Trash2 size={11} />
                        <span>刪除</span>
                      </button>
                    )}

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