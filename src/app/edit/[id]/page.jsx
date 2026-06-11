'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTripStore, mockTrips } from '../../../store/useTripStore';
import { db, hasValidFirebaseConfig } from '../../../lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Save, MapPin, Clock, Plus, Trash2, ArrowUp, ArrowDown, 
  Search, Check, Settings, Share2, Compass, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function TripEditor() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id;

  const {
    currentTrip,
    setCurrentTrip,
    updateCurrentTrip,
    currentUser,
    authInitialized,
    setAuthModalOpen,
    mapboxToken,
    setMapboxToken,
    mapFocusedPlaceId,
    setMapFocusedPlaceId,
    tripsList,
    setTripsList
  } = useTripStore();

  const [activeDay, setActiveDay] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editorLoading, setEditorLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Map Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Draw timeline connecting lines on Map
  function drawRoute(map, places) {
    if (places.length < 2) return;

    const coordinates = places.map(p => [p.lng, p.lat]);

    // Check if layer already exists
    if (map.getLayer('route-line')) return;

    map.addSource('route-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    });

    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route-source',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#6366f1',
        'line-width': 4,
        'line-opacity': 0.8,
        'line-dasharray': [2, 1]
      }
    });
  }

  // Redirect back to home and open AuthModal if user is not logged in
  useEffect(() => {
    if (authInitialized && !currentUser) {
      router.push('/');
      setAuthModalOpen(true);
    }
  }, [authInitialized, currentUser, router, setAuthModalOpen]);

  // Fetch or setup currentTrip
  useEffect(() => {
    const loadTrip = async () => {
      setEditorLoading(true);
      if (!tripId) return;

      // 1. Try fetching from Firebase if configured
      if (hasValidFirebaseConfig) {
        try {
          const docRef = doc(db, 'trips', tripId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() };
            setCurrentTrip(data);
            setEditorLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Could not load trip from Firebase, checking local/mock:', err);
        }
      }

      // 2. Check local store memory or mock trips
      const foundLocal = tripsList.find(t => t.id === tripId);
      if (foundLocal) {
        setCurrentTrip(foundLocal);
      } else {
        const foundMock = mockTrips.find(t => t.id === tripId);
        if (foundMock) {
          setCurrentTrip(foundMock);
        } else {
          // 3. Create a default trip if not found anywhere
          const newBlankTrip = {
            id: tripId,
            title: '全新冒險旅程 🗺️',
            country: '日本',
            city: '東京',
            is_public: false,
            user_id: currentUser?.id || 'guest',
            days_data: [{ day: 1, places: [] }]
          };
          setCurrentTrip(newBlankTrip);
        }
      }
      setEditorLoading(false);
    };

    loadTrip();
  }, [tripId, setCurrentTrip, currentUser, tripsList]);

  // Handle Map Initialization & Markers Redrawing
  useEffect(() => {
    if (editorLoading || !currentTrip) return;

    const tokenToUse = mapboxToken || '';
    
    // If no token or no map container, skip init
    if (!tokenToUse || !mapContainerRef.current) {
      // Clean up existing map if token is removed
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    mapboxgl.accessToken = tokenToUse;

    // Get current day places
    const currentDayData = currentTrip.days_data.find(d => d.day === activeDay);
    const places = currentDayData?.places || [];

    // Map Center logic: Center on focused place, first place, or default center (Taipei)
    let center = [121.5644, 25.0339]; // Default Taipei
    let zoom = 12;

    const focusedPlace = places.find(p => p.id === mapFocusedPlaceId);
    if (focusedPlace) {
      center = [focusedPlace.lng, focusedPlace.lat];
      zoom = 15;
    } else if (places.length > 0) {
      center = [places[0].lng, places[0].lat];
      zoom = 13;
    } else {
      // Fallback center by city names
      const city = currentTrip.city.toLowerCase();
      if (city.includes('東京') || city.includes('tokyo')) {
        center = [139.6917, 35.6895];
      } else if (city.includes('京都') || city.includes('kyoto')) {
        center = [135.7681, 35.0116];
      } else if (city.includes('首爾') || city.includes('seoul')) {
        center = [126.9780, 37.5665];
      }
    }

    try {
      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: center,
          zoom: zoom,
          attributionControl: false
        });
      } else {
        // Smooth pan to center if already exists
        mapRef.current.easeTo({
          center: center,
          zoom: zoom,
          duration: 1000
        });
      }

      const map = mapRef.current;

      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Remove previous path layers & sources
      if (map.isStyleLoaded()) {
        if (map.getLayer('route-line')) map.removeLayer('route-line');
        if (map.getSource('route-source')) map.removeSource('route-source');
      }

      // If style is not fully loaded, wait for it
      map.on('style.load', () => {
        drawRoute(map, places);
      });

      if (map.isStyleLoaded()) {
        drawRoute(map, places);
      }

      // Add Markers
      places.forEach((place, index) => {
        // Create custom element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerText = (index + 1).toString();
        
        // Highlight active focused item
        if (place.id === mapFocusedPlaceId) {
          el.style.transform = 'scale(1.25)';
          el.style.boxShadow = '0 0 18px #10b981';
          el.style.border = '2px solid #10b981';
        }

        el.addEventListener('click', () => {
          setMapFocusedPlaceId(place.id);
          // Scroll to the card
          const cardEl = document.getElementById(`place-card-${place.id}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([place.lng, place.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });

    } catch (err) {
      console.error('Error rendering Mapbox map:', err);
    }

  }, [currentTrip, activeDay, mapboxToken, mapFocusedPlaceId, editorLoading, setMapFocusedPlaceId, mapContainerRef]);



  // Geo-search using Photon API
  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=6`);
      const data = await res.json();
      if (data && data.features) {
        setSearchResults(data.features);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error fetching search results from Photon:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add Place from Search Results
  const handleAddSearchResult = (feature) => {
    if (!currentTrip) return;

    const coords = feature.geometry.coordinates; // [lng, lat]
    const props = feature.properties;
    
    // Format default place name: Combine name and city if available
    const name = props.name || '未知景點';
    const cityText = props.city ? `, ${props.city}` : '';
    const countryText = props.country ? `, ${props.country}` : '';
    const description = `探索 ${name}${cityText}${countryText}`;

    // Calculate default time based on last place
    const dayData = currentTrip.days_data.find(d => d.day === activeDay);
    let nextTime = '09:00';
    if (dayData && dayData.places.length > 0) {
      const lastTime = dayData.places[dayData.places.length - 1].time;
      const [h, m] = lastTime.split(':').map(Number);
      let newH = h + 2; // Default gap of 2 hours
      if (newH >= 24) newH = 23;
      nextTime = `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    const newPlace = {
      name: name,
      time: nextTime,
      description: description,
      lat: coords[1], // Latitude
      lng: coords[0]  // Longitude
    };

    // Use Zustand store action to add place
    // Add locally in UI
    const randomId = `place-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const placeWithId = { ...newPlace, id: randomId };

    const updatedDaysData = currentTrip.days_data.map(d => {
      if (d.day === activeDay) {
        return {
          ...d,
          places: [...d.places, placeWithId]
        };
      }
      return d;
    });

    updateCurrentTrip({ days_data: updatedDaysData });
    setMapFocusedPlaceId(placeWithId.id);
    
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
  };

  // Save Trip to Database (or Cache)
  const handleSaveTrip = async () => {
    if (!currentTrip) return;
    setSaveStatus('saving');
    setErrorMessage('');

    // Play confetti
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });

    if (hasValidFirebaseConfig) {
      try {
        await setDoc(doc(db, 'trips', currentTrip.id), {
          id: currentTrip.id,
          title: currentTrip.title,
          country: currentTrip.country,
          city: currentTrip.city,
          is_public: currentTrip.is_public,
          user_id: currentUser?.id || currentTrip.user_id || null,
          days_data: currentTrip.days_data,
          created_at: currentTrip.created_at || new Date().toISOString()
        }, { merge: true });

        setSaveStatus('success');
      } catch (err) {
        console.error('Error saving trip:', err);
        setSaveStatus('error');
        setErrorMessage(err.message || '儲存失敗，請檢查資料庫連線。');
      }
    } else {
      // Offline/Preview mode: Save to Zustand state store
      const updatedList = tripsList.map(t => t.id === currentTrip.id ? currentTrip : t);
      if (!tripsList.find(t => t.id === currentTrip.id)) {
        updatedList.push(currentTrip);
      }
      setTripsList(updatedList);
      setSaveStatus('success');
      
      // Auto transition to idle status
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  // Reorder buttons handlers
  const handleMovePlace = (index, direction) => {
    if (!currentTrip) return;
    const dayData = currentTrip.days_data.find(d => d.day === activeDay);
    if (!dayData) return;

    const places = [...dayData.places];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= places.length) return;

    // Swap elements
    const temp = places[index];
    places[index] = places[newIndex];
    places[newIndex] = temp;

    const updatedDaysData = currentTrip.days_data.map(d => {
      if (d.day === activeDay) {
        return { ...d, places };
      }
      return d;
    });

    updateCurrentTrip({ days_data: updatedDaysData });
  };

  // Delete Place
  const handleDeletePlace = (placeId) => {
    if (!currentTrip) return;
    const dayData = currentTrip.days_data.find(d => d.day === activeDay);
    if (!dayData) return;

    const updatedDaysData = currentTrip.days_data.map(d => {
      if (d.day === activeDay) {
        return {
          ...d,
          places: d.places.filter(p => p.id !== placeId)
        };
      }
      return d;
    });

    updateCurrentTrip({ days_data: updatedDaysData });
    if (mapFocusedPlaceId === placeId) setMapFocusedPlaceId(null);
  };

  // Update Place Details
  const handleUpdatePlaceDetail = (placeId, updates) => {
    if (!currentTrip) return;
    const updatedDaysData = currentTrip.days_data.map(d => {
      if (d.day === activeDay) {
        return {
          ...d,
          places: d.places.map(p => p.id === placeId ? { ...p, ...updates } : p)
        };
      }
      return d;
    });
    updateCurrentTrip({ days_data: updatedDaysData });
  };

  // Add a Day
  const handleAddNewDay = () => {
    if (!currentTrip) return;
    const newDayNum = currentTrip.days_data.length + 1;
    const updatedDaysData = [
      ...currentTrip.days_data,
      { day: newDayNum, places: [] }
    ];
    updateCurrentTrip({ days_data: updatedDaysData });
    setActiveDay(newDayNum);
  };

  // Delete a Day
  const handleDeleteDay = (dayNum) => {
    if (!currentTrip) return;
    if (currentTrip.days_data.length <= 1) return; // Limit min 1 day

    const updatedDaysData = currentTrip.days_data
      .filter(d => d.day !== dayNum)
      .map((d, index) => ({
        ...d,
        day: index + 1
      }));

    updateCurrentTrip({ days_data: updatedDaysData });
    setActiveDay(1);
  };

  // Custom Mapbox Token submission
  const handleSaveCustomToken = () => {
    if (customTokenInput.trim()) {
      setMapboxToken(customTokenInput.trim());
      setShowTokenSettings(false);
      setCustomTokenInput('');
    }
  };

  if (editorLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-600/30 border-t-indigo-500 animate-spin"></div>
        <span className="text-slate-400 font-semibold text-sm">載入行程編輯器中...</span>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800 max-w-lg mx-auto">
        <AlertTriangle className="text-red-500 mx-auto mb-3" size={40} />
        <h3 className="text-lg font-bold text-slate-300">查無此行程資料</h3>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          返回探索大廳
        </button>
      </div>
    );
  }

  const activeDayData = currentTrip.days_data.find(d => d.day === activeDay);
  const places = activeDayData?.places || [];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16">
      
      {/* Top Action Panel */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="返回大廳"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block">
              行程編輯面板
            </span>
            <input
              type="text"
              value={currentTrip.title}
              onChange={(e) => updateCurrentTrip({ title: e.target.value })}
              className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-xl md:text-2xl font-extrabold text-white focus:outline-none py-0.5 transition-all duration-200 w-[300px] md:w-[450px] truncate"
              placeholder="輸入行程標題..."
            />
          </div>
        </div>

        {/* Save & Public Toggle */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Country / City tags editors */}
          <div className="flex items-center gap-2 mr-2">
            <input
              type="text"
              value={currentTrip.country}
              onChange={(e) => updateCurrentTrip({ country: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 text-center w-20 focus:outline-none focus:border-indigo-500"
              placeholder="國家"
              title="一級標籤 (國家)"
            />
            <input
              type="text"
              value={currentTrip.city}
              onChange={(e) => updateCurrentTrip({ city: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 text-center w-20 focus:outline-none focus:border-indigo-500"
              placeholder="城市"
              title="二級標籤 (城市)"
            />
          </div>

          {/* Public Toggle */}
          <button
            onClick={() => updateCurrentTrip({ is_public: !currentTrip.is_public })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
              currentTrip.is_public
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title={currentTrip.is_public ? '已公開發布至大廳' : '私密規劃中'}
          >
            {currentTrip.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{currentTrip.is_public ? '公開共享' : '個人私密'}</span>
          </button>

          {/* Token Settings Button */}
          <button
            onClick={() => setShowTokenSettings(!showTokenSettings)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="地圖金鑰設定"
          >
            <Settings size={16} />
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveTrip}
            disabled={saveStatus === 'saving'}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-lg text-sm font-semibold gradient-brand text-white hover:opacity-95 shadow-md shadow-indigo-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 glow-btn"
          >
            <Save size={16} />
            <span>{saveStatus === 'saving' ? '儲存中...' : '儲存行程'}</span>
          </button>
        </div>
      </div>

      {/* Mapbox Token config dropdown block */}
      {showTokenSettings && (
        <div className="glass p-5 rounded-2xl border-indigo-500/30 animate-fade-in space-y-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <Settings size={18} />
            <h4 className="font-bold text-sm">地圖 Mapbox Access Token 設定</h4>
          </div>
          <p className="text-xs text-slate-400">
            Mapbox 地圖功能需要 Access Token。您可在下方輸入您個人的 Mapbox Token，它將保存在瀏覽器的 LocalStorage 中。
            <br />
            若未設定 Token，地圖面板將以「預覽引導畫面」呈現，方便您專注於時間軸景點管理與 Photon 地名搜尋。
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="pk.eyJ1Ijoi..."
              value={customTokenInput}
              onChange={(e) => setCustomTokenInput(e.target.value)}
              className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
            />
            <button
              onClick={handleSaveCustomToken}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors duration-200"
            >
              儲存 Token
            </button>
            {mapboxToken && (
              <button
                onClick={() => { setMapboxToken(null); setShowTokenSettings(false); }}
                className="px-3 py-2 border border-red-900/40 text-red-400 hover:bg-red-950/20 rounded-lg text-xs font-semibold transition-colors duration-200"
              >
                清除金鑰
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save status notification popup */}
      {saveStatus === 'success' && (
        <div className="glass bg-emerald-500/10 border-emerald-500/30 p-3 rounded-lg text-emerald-400 text-xs font-bold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span>行程已成功儲存！所有天數、位置資訊與時間軸已成功寫入。</span>
          </div>
          <button onClick={() => setSaveStatus('idle')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="glass bg-red-500/10 border-red-500/30 p-3 rounded-lg text-red-400 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>儲存失敗：{errorMessage}</span>
          </div>
          <button onClick={() => setSaveStatus('idle')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Editor Double Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN: Timeline Editor (Col span: 7) */}
        <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
          
          {/* Day Selection Tab Row */}
          <div className="glass p-4 rounded-2xl flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin max-w-[75%]">
              {currentTrip.days_data.map(day => (
                <div key={day.day} className="flex items-center shrink-0">
                  <button
                    onClick={() => { setActiveDay(day.day); setMapFocusedPlaceId(null); }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                      activeDay === day.day
                        ? 'gradient-brand text-white shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    第 {day.day} 天
                  </button>
                  {currentTrip.days_data.length > 1 && (
                    <button
                      onClick={() => handleDeleteDay(day.day)}
                      className="p-1 text-slate-500 hover:text-red-400 -ml-1 mr-1 transition-colors"
                      title="刪除此天行程"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddNewDay}
              className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-all duration-200 shrink-0"
            >
              <Plus size={14} />
              <span>新增一天</span>
            </button>
          </div>

          {/* Timeline Node List */}
          <div className="glass p-6 rounded-2xl space-y-6 flex-1 min-h-[400px] shadow-lg relative">
            <h3 className="text-base font-extrabold text-white mb-2 flex items-center gap-2">
              <Clock size={16} className="text-indigo-400" />
              <span>第 {activeDay} 天行程景點時間軸</span>
            </h3>

            {places.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-950/20">
                <MapPin className="text-slate-600 mb-3 animate-float" size={36} />
                <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                  這天還沒有排入任何景點！
                  請在下方輸入關鍵字搜尋世界著名景點，一鍵新增至您的行程表中。
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {places.map((place, index) => {
                  const isFocused = place.id === mapFocusedPlaceId;
                  return (
                    <div
                      key={place.id}
                      id={`place-card-${place.id}`}
                      onClick={() => setMapFocusedPlaceId(place.id)}
                      className={`relative flex gap-4 p-4 rounded-xl border transition-all duration-300 ${
                        isFocused 
                          ? 'bg-indigo-950/30 border-indigo-500/80 shadow-md shadow-indigo-500/5' 
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Vertical line connector decorator */}
                      {index < places.length - 1 && (
                        <div className="absolute left-[30px] top-12 bottom-[-16px] w-[2px] bg-indigo-500/20 pointer-events-none"></div>
                      )}

                      {/* Timeline Dot with sequence number */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow ${
                          isFocused ? 'gradient-brand animate-pulse-slow' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {index + 1}
                        </div>
                      </div>

                      {/* Place details inputs */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <input
                            type="text"
                            value={place.name}
                            onChange={(e) => handleUpdatePlaceDetail(place.id, { name: e.target.value })}
                            className="bg-transparent text-sm font-extrabold text-white focus:outline-none border-b border-transparent focus:border-indigo-500 w-[180px] md:w-[220px]"
                            placeholder="景點名稱..."
                          />

                          {/* Time and Reorder actions */}
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-500" />
                            <input
                              type="text"
                              value={place.time}
                              onChange={(e) => handleUpdatePlaceDetail(place.id, { time: e.target.value })}
                              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-xs text-slate-300 w-14 font-semibold focus:outline-none focus:border-indigo-500"
                              placeholder="09:00"
                            />
                            
                            {/* Reorder Buttons */}
                            <div className="flex bg-slate-950 border border-slate-800 rounded overflow-hidden">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePlace(index, 'up'); }}
                                disabled={index === 0}
                                className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                                title="上移"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePlace(index, 'down'); }}
                                disabled={index === places.length - 1}
                                className="p-1 border-l border-slate-800 hover:bg-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                                title="下移"
                              >
                                <ArrowDown size={11} />
                              </button>
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePlace(place.id); }}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-950 rounded transition-colors"
                              title="移除景點"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <textarea
                          value={place.description}
                          onChange={(e) => handleUpdatePlaceDetail(place.id, { description: e.target.value })}
                          rows={2}
                          className="w-full bg-slate-950/60 border border-slate-850 focus:border-indigo-500/50 rounded-lg p-2 text-xs text-slate-400 focus:outline-none resize-none"
                          placeholder="寫下對景點的備註、必吃美食或門票細節..."
                        />
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                          <MapPin size={9} />
                          <span>緯度: {place.lat.toFixed(4)} / 經度: {place.lng.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Photon Geocoder Panel */}
          <div className="glass p-5 rounded-2xl space-y-3.5 shadow-md">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Search size={14} className="text-indigo-400" />
              <span>新增世界景點至時間軸 (地理搜尋器)</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchPlaces()}
                placeholder="搜尋想要新增的國家、城市、地標名稱..."
                className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
              />
              <button
                onClick={handleSearchPlaces}
                disabled={isSearching}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
              >
                {isSearching ? '搜尋中...' : '搜尋景點'}
              </button>
            </div>

            {/* Search Results Display */}
            {searchResults.length > 0 && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl divide-y divide-slate-900 max-h-48 overflow-y-auto z-10 animate-fade-in shadow-2xl">
                {searchResults.map((feature, i) => {
                  const props = feature.properties;
                  const coords = feature.geometry.coordinates;
                  const subtitle = [props.city, props.state, props.country].filter(Boolean).join(', ');
                  
                  return (
                    <div
                      key={i}
                      onClick={() => handleAddSearchResult(feature)}
                      className="p-3 hover:bg-indigo-600/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <p className="font-extrabold text-white text-xs">{props.name || '未知名稱'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{subtitle || '無地理說明'}</p>
                      </div>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold">
                        <Plus size={10} />
                        <span>新增</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Map Panel (Col span: 5) */}
        <div className="lg:col-span-5 h-[450px] lg:h-auto min-h-[400px] flex flex-col">
          {mapboxToken ? (
            <div className="relative flex-1 w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-slate-950" />
              {/* Map Floating Banner */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 pointer-events-none">
                <MapPin size={10} className="text-indigo-400 animate-bounce" />
                <span>Mapbox Live 航線地圖</span>
              </div>
            </div>
          ) : (
            /* Premium Placeholder when Mapbox token is missing */
            <div className="relative flex-1 w-full h-full rounded-2xl glass p-8 flex flex-col items-center justify-center text-center shadow-xl border-dashed border-slate-800">
              <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-white mb-5 shadow-lg shadow-indigo-500/10 animate-float">
                <Compass size={32} />
              </div>
              <h3 className="text-base font-extrabold text-white">啟動 Mapbox 航線地圖</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                地圖視覺化（Marker 繪製與路徑折線）基於 Mapbox GL JS 打造。您可在右上角設定按鈕輸入金鑰。
              </p>
              
              <div className="w-full max-w-xs mt-6 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 text-left">
                  快速貼上金鑰
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    placeholder="pk.eyJ1Ijoi..."
                    onChange={(e) => setCustomTokenInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none"
                  />
                  <button
                    onClick={handleSaveCustomToken}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors"
                  >
                    載入
                  </button>
                </div>
              </div>
              
              <div className="mt-5 text-[10px] text-slate-500">
                <span>提示：沒有金鑰嗎？您仍可在此頁面完全自由地增刪天數與編輯景點時間軸。</span>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
