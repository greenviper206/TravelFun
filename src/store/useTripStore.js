import { create } from 'zustand';


// 預設精美 Mock Data，讓使用者在沒有設定 Supabase 時也能體驗所有功能
export const mockTrips = [
  {
    id: 'mock-trip-1',
    title: '東京櫻花季與潮流文化五日遊',
    country: '日本',
    city: '東京',
    is_public: true,
    user_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    days_data: [
      {
        day: 1,
        places: [
          { id: 'p1', time: '09:00', name: '淺草寺', description: '東京最古老的寺廟，品嚐雷門仲見世通小吃。', lat: 35.7147, lng: 139.7967 },
          { id: 'p2', time: '13:00', name: '東京晴空塔', description: '登上展望台俯瞰關東平原，並在下方商城享用午餐。', lat: 35.7100, lng: 139.8107 },
          { id: 'p3', time: '17:30', name: '上野恩賜公園', description: '漫步賞櫻（季節限定），接著漫步至阿美橫丁吃晚餐。', lat: 35.7140, lng: 139.7740 }
        ]
      },
      {
        day: 2,
        places: [
          { id: 'p4', time: '10:00', name: '明治神宮', description: '隱身在市中心的巨型綠洲，參拜鳥居並洗滌心靈。', lat: 35.6763, lng: 139.6993 },
          { id: 'p5', time: '13:30', name: '竹下通 & 表參道', description: '體驗原宿的極致原創潮流與表參道的精品下午茶。', lat: 35.6703, lng: 139.7063 },
          { id: 'p6', time: '18:00', name: '澀谷十字路口', description: '世界最繁忙的十字路口，站在 MARK CITY 觀景窗拍照。', lat: 35.6580, lng: 139.7016 }
        ]
      },
      {
        day: 3,
        places: [
          { id: 'p7', time: '09:00', name: '築地場外市場', description: '享用新鮮的玉子燒、生魚片丼飯與海鮮燒烤。', lat: 35.6655, lng: 139.7705 }
        ]
      }
    ]
  },
  {
    id: 'mock-trip-2',
    title: '台北美食與懷舊文青三日遊',
    country: '台灣',
    city: '台北',
    is_public: true,
    user_id: 'mock-user-2',
    created_at: new Date().toISOString(),
    days_data: [
      {
        day: 1,
        places: [
          { id: 'p8', time: '10:00', name: '台北101', description: '登上觀景台看市景，接著在信義商圈逛街。', lat: 25.0339, lng: 121.5644 },
          { id: 'p9', time: '14:30', name: '國立故宮博物院', description: '觀賞翠玉白菜與東坡肉石，體驗歷史文化薰陶。', lat: 25.1023, lng: 121.5487 },
          { id: 'p10', time: '18:30', name: '士林夜市', description: '晚餐吃大腸包小腸、豪大大雞排及雪花冰。', lat: 25.0877, lng: 121.5244 }
        ]
      },
      {
        day: 2,
        places: [
          { id: 'p11', time: '09:30', name: '中正紀念堂', description: '觀看整點的三軍儀隊交接儀式，花園散步。', lat: 25.0358, lng: 121.5222 },
          { id: 'p12', time: '12:00', name: '永康街商圈', description: '品嚐鼎泰豐小籠包、芒果冰與特色文青茶館。', lat: 25.0315, lng: 121.5298 }
        ]
      }
    ]
  },
  {
    id: 'mock-trip-3',
    title: '京都古都漫步與神社巡禮四日',
    country: '日本',
    city: '京都',
    is_public: true,
    user_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    days_data: [
      {
        day: 1,
        places: [
          { id: 'p13', time: '08:30', name: '伏見稻荷大社', description: '挑戰千本鳥居步道，購買狐狸御守。', lat: 34.9671, lng: 135.7727 },
          { id: 'p14', time: '13:00', name: '清水寺', description: '參拜清水舞台，漫步二年坂與三年坂尋訪古都風味。', lat: 34.9949, lng: 135.7850 }
        ]
      }
    ]
  },
  {
    id: 'mock-trip-4',
    title: '高雄港都夕陽與文創藝術之旅',
    country: '台灣',
    city: '高雄',
    is_public: true,
    user_id: 'mock-user-3',
    created_at: new Date().toISOString(),
    days_data: [
      {
        day: 1,
        places: [
          { id: 'p15', time: '11:00', name: '駁二藝術特區', description: '探索舊倉庫群改建的文創小店、公共藝術與市集。', lat: 22.6203, lng: 120.2816 },
          { id: 'p16', time: '16:30', name: '西子灣夕陽', description: '漫步英國領事館，眺望高雄港與美麗的落日。', lat: 22.6186, lng: 120.2646 }
        ]
      }
    ]
  }
];

export const useTripStore = create((set, get) => {
  // Try to load Mapbox token from localStorage if available (client side only)
  let initialToken = null;
  if (typeof window !== 'undefined') {
    initialToken = localStorage.getItem('travel_fun_mapbox_token') || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || null;
  }

  return {
    // Initial State
    tripsList: mockTrips,
    filteredTrips: mockTrips,
    currentTrip: null,
    currentUser: null,
    isLoading: false,
    isAuthModalOpen: false,
    searchQuery: '',
    selectedCountry: null,
    selectedCity: null,
    mapboxToken: initialToken,
    mapFocusedPlaceId: null,

    // Actions
    setTripsList: (trips) => {
      set({ tripsList: trips });
      get().applyFilters();
    },

    setCurrentTrip: (trip) => set({ currentTrip: trip }),

    updateCurrentTrip: (updates) => {
      const { currentTrip } = get();
      if (!currentTrip) return;
      set({ currentTrip: { ...currentTrip, ...updates } });
    },

    updateDaysData: (daysData) => {
      const { currentTrip } = get();
      if (!currentTrip) return;
      set({ currentTrip: { ...currentTrip, days_data: daysData } });
    },

    setCurrentUser: (user) => set({ currentUser: user }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
    
    setSearchQuery: (query) => {
      set({ searchQuery: query });
      get().applyFilters();
    },

    setSelectedCountry: (country) => {
      set({ selectedCountry: country, selectedCity: null }); // Reset city when country changes
      get().applyFilters();
    },

    setSelectedCity: (city) => {
      set({ selectedCity: city });
      get().applyFilters();
    },

    setMapboxToken: (token) => {
      if (typeof window !== 'undefined') {
        if (token) {
          localStorage.setItem('travel_fun_mapbox_token', token);
        } else {
          localStorage.removeItem('travel_fun_mapbox_token');
        }
      }
      set({ mapboxToken: token });
    },

    setMapFocusedPlaceId: (id) => set({ mapFocusedPlaceId: id }),

    applyFilters: () => {
      const { tripsList, searchQuery, selectedCountry, selectedCity } = get();
      
      let filtered = [...tripsList];

      // 1. Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(trip => 
          trip.title.toLowerCase().includes(query) ||
          trip.country.toLowerCase().includes(query) ||
          trip.city.toLowerCase().includes(query)
        );
      }

      // 2. Country Filter
      if (selectedCountry && selectedCountry !== 'All') {
        filtered = filtered.filter(trip => trip.country === selectedCountry);
      }

      // 3. City Filter
      if (selectedCity && selectedCity !== 'All') {
        filtered = filtered.filter(trip => trip.city === selectedCity);
      }

      set({ filteredTrips: filtered });
    },

    // Helper actions for editor
    addNewDay: () => {
      const { currentTrip } = get();
      if (!currentTrip) return;
      
      const newDayNum = currentTrip.days_data.length + 1;
      const newDaysData = [
        ...currentTrip.days_data,
        { day: newDayNum, places: [] }
      ];
      
      set({ currentTrip: { ...currentTrip, days_data: newDaysData } });
    },

    deleteDay: (dayNum) => {
      const { currentTrip } = get();
      if (!currentTrip) return;
      if (currentTrip.days_data.length <= 1) return; // Must have at least 1 day

      // Filter out the day and shift later days down by 1
      const newDaysData = currentTrip.days_data
        .filter(d => d.day !== dayNum)
        .map((d, index) => ({
          ...d,
          day: index + 1
        }));
      
      set({ currentTrip: { ...currentTrip, days_data: newDaysData } });
    },

    addPlaceToDay: (dayNum, place) => {
      const { currentTrip } = get();
      if (!currentTrip) return;

      const newPlace = {
        ...place,
        id: `place-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const newDaysData = currentTrip.days_data.map(d => {
        if (d.day === dayNum) {
          return {
            ...d,
            places: [...d.places, newPlace]
          };
        }
        return d;
      });

      set({ currentTrip: { ...currentTrip, days_data: newDaysData } });
    },

    removePlaceFromDay: (dayNum, placeId) => {
      const { currentTrip } = get();
      if (!currentTrip) return;

      const newDaysData = currentTrip.days_data.map(d => {
        if (d.day === dayNum) {
          return {
            ...d,
            places: d.places.filter(p => p.id !== placeId)
          };
        }
        return d;
      });

      set({ currentTrip: { ...currentTrip, days_data: newDaysData } });
    },

    updatePlaceInDay: (dayNum, placeId, updates) => {
      const { currentTrip } = get();
      if (!currentTrip) return;

      const newDaysData = currentTrip.days_data.map(d => {
        if (d.day === dayNum) {
          return {
            ...d,
            places: d.places.map(p => p.id === placeId ? { ...p, ...updates } : p)
          };
        }
        return d;
      });

      set({ currentTrip: { ...currentTrip, days_data: newDaysData } });
    },

    reorderPlacesInDay: (dayNum, startIndex, endIndex) => {
      const { currentTrip } = get();
      if (!currentTrip) return;

      const newDaysData = currentTrip.days_data.map(d => {
        if (d.day === dayNum) {
          const result = Array.from(d.places);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          return {
            ...d,
            places: result
          };
        }
        return d;
      });

      set({ currentTrip: { ...currentTrip, days_data: newDaysData } });
    }
  };
});
