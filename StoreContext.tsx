import React, { createContext, useReducer, useEffect, useContext, ReactNode, useState } from 'react';
import { AppState, Action, Trip, AppSettings, ItineraryItem, Expense, Recommendation, Note } from './types';
import { generateId, generateShortId } from './utils';

const DEFAULT_SETTINGS: AppSettings = {
  scheduleCategories: [
    { id: 'sightseeing', label: '景點', color: 'bg-blue-100 text-blue-700', icon: 'camera' },
    { id: 'food', label: '美食', color: 'bg-green-100 text-green-700', icon: 'utensils' },
    { id: 'transport', label: '交通', color: 'bg-red-100 text-red-700', icon: 'train' },
    { id: 'accommodation', label: '住宿', color: 'bg-stone-100 text-stone-800', icon: 'bed' },
    { id: 'other', label: '其他', color: 'bg-gray-100 text-gray-700', icon: 'tag' },
  ],
  recCategories: [
    { id: 'spot', label: '景點', color: 'bg-blue-100 text-blue-700', icon: 'map-pin' },
    { id: 'food', label: '美食', color: 'bg-orange-100 text-orange-700', icon: 'coffee' },
    { id: 'shopping', label: '購物', color: 'bg-purple-100 text-purple-700', icon: 'shopping-bag' },
    { id: 'other', label: '其他', color: 'bg-gray-100 text-gray-700', icon: 'star' },
  ],
  noteCategories: [
    { id: 'general', label: '一般', color: 'bg-gray-100 text-gray-600', icon: 'info' },
    { id: 'ticket', label: '票券', color: 'bg-purple-100 text-purple-600', icon: 'ticket' },
    { id: 'accommodation', label: '住宿', color: 'bg-indigo-100 text-indigo-600', icon: 'bed' },
    { id: 'transport', label: '交通', color: 'bg-red-100 text-red-600', icon: 'bus' },
  ]
};

// --- Full Tokyo Template Data ---
const TEMPLATE_TRIP_ID = 'template-trip-tokyo';
const TOKYO_TEMPLATE_TRIP: Trip = {
  id: TEMPLATE_TRIP_ID,
  shortId: 'TY-TK01',
  title: '東京 4 天 3 夜 (Template)',
  days: 4,
  participants: ['明明', '小美', '華仔'],
  startDate: '2025-04-01',
  endDate: '2025-04-04'
};

const INITIAL_STATE: AppState = {
  trips: [TOKYO_TEMPLATE_TRIP],
  itinerary: [
    // Day 1
    { id: 'it-1', tripId: TEMPLATE_TRIP_ID, dayIndex: 0, time: '14:00', title: '成田機場接機', location: 'Narita Airport', content: '搭乘京成電鐵 Skyliner 前往新宿', type: 'transport' },
    { id: 'it-2', tripId: TEMPLATE_TRIP_ID, dayIndex: 0, time: '16:30', title: '新宿飯店 Check-in', location: 'Shinjuku Prince Hotel', content: '確認碼：ABC12345', type: 'accommodation' },
    { id: 'it-3', tripId: TEMPLATE_TRIP_ID, dayIndex: 0, time: '19:00', title: '六歌仙燒肉', location: '新宿', content: '已訂位 19:00，晚餐放題', type: 'food' },
    // Day 2
    { id: 'it-4', tripId: TEMPLATE_TRIP_ID, dayIndex: 1, time: '09:00', title: '明治神宮', location: '原宿', content: '參觀大鳥居與森林步道', type: 'sightseeing' },
    { id: 'it-5', tripId: TEMPLATE_TRIP_ID, dayIndex: 1, time: '13:00', title: '竹下通逛街', location: '原宿', content: '買可麗餅吃', type: 'other' },
    { id: 'it-6', tripId: TEMPLATE_TRIP_ID, dayIndex: 1, time: '18:00', title: '澀谷 Sky 看夕陽', location: 'Shibuya Scramble Square', content: '需提前一個月訂票', type: 'sightseeing' },
    // Day 3
    { id: 'it-7', tripId: TEMPLATE_TRIP_ID, dayIndex: 2, time: '10:00', title: '淺草寺', location: '雷門', content: '抽籤、吃人形燒', type: 'sightseeing' },
    { id: 'it-8', tripId: TEMPLATE_TRIP_ID, dayIndex: 2, time: '15:00', title: '晴空塔', location: '墨田區', content: '看夜景、逛龍貓商店', type: 'sightseeing' },
    // Day 4
    { id: 'it-9', tripId: TEMPLATE_TRIP_ID, dayIndex: 3, time: '11:00', title: '築地市場', location: '築地', content: '吃早午餐壽司', type: 'food' },
    { id: 'it-10', tripId: TEMPLATE_TRIP_ID, dayIndex: 3, time: '15:00', title: '前往機場', location: '東京車站', content: '搭乘 N-EX', type: 'transport' }
  ],
  expenses: [
    { id: 'ex-1', tripId: TEMPLATE_TRIP_ID, title: '六歌仙燒肉', amount: 24000, payer: '明明', splitType: 'even', customSplits: {}, date: Date.now() - 86400000 },
    { id: 'ex-2', tripId: TEMPLATE_TRIP_ID, title: '澀谷 Sky 門票', amount: 6000, payer: '小美', splitType: 'even', customSplits: {}, date: Date.now() - 43200000 },
    { id: 'ex-3', tripId: TEMPLATE_TRIP_ID, title: '計程車費', amount: 3000, payer: '華仔', splitType: 'custom', customSplits: { '明明': 1000, '小美': 1000, '華仔': 1000 }, date: Date.now() }
  ],
  recommendations: [
    { id: 'rc-1', tripId: TEMPLATE_TRIP_ID, title: '阿夫利拉麵 (AFURI)', content: '必點柚子鹽口味，非常清爽。新宿分店通常要排隊。', type: 'food', url: 'https://afuri.com/', images: [], order: 0 },
    { id: 'rc-2', tripId: TEMPLATE_TRIP_ID, title: '銀座伊東屋 Itoya', content: '文具控的天堂，整棟 12 層樓都是精美文具。', type: 'shopping', images: [], order: 1 }
  ],
  notes: [
    { id: 'nt-1', tripId: TEMPLATE_TRIP_ID, title: '打包清單', content: '1. 護照 2. 換日幣 3. 行動電源 4. 電壓轉接頭 5. eSim 卡號', type: 'general', images: [], order: 0 },
    { id: 'nt-2', tripId: TEMPLATE_TRIP_ID, title: '機場接送資訊', content: 'Skyliner 單程票已在 Klook 購買，到機場 QR Code 換票即可。', type: 'transport', images: [], order: 1 },
    { id: 'nt-3', tripId: TEMPLATE_TRIP_ID, title: 'Suica 快速交通卡教學 (iOS)', content: '1. 打開 iPhone 的「錢包 (Wallet)」App。\n2. 點擊右上角的「+」號。\n3. 選擇「交通卡」。\n4. 在搜尋欄輸入「Suica」。\n5. 點擊 Suica 並依照指示加值金額即可使用。\n(進出站時不用解鎖手機，直接感應即可)', type: 'transport', images: [], url: 'https://mrmad.com.tw/iphone-suica', order: 2 }
  ],
  settings: DEFAULT_SETTINGS
};

const STORAGE_KEY = 'travel_planner_v3';

const StoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
  syncTrip: (tripId: string) => Promise<void>;
  importTripById: (shortId: string) => Promise<boolean>;
  isLoading: boolean;
}>({
  state: INITIAL_STATE,
  dispatch: () => null,
  syncTrip: async () => { },
  importTripById: async () => false,
  isLoading: false
});

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, action.payload] };
    case 'DELETE_TRIP':
      return {
        ...state,
        trips: state.trips.filter(t => t.id !== action.payload),
        itinerary: state.itinerary.filter(i => i.tripId !== action.payload),
        expenses: state.expenses.filter(e => e.tripId !== action.payload),
        recommendations: state.recommendations.filter(r => r.tripId !== action.payload),
        notes: state.notes.filter(n => n.tripId !== action.payload)
      };
    case 'UPDATE_TRIP':
      return { ...state, trips: state.trips.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'ADD_ITEM':
      return { ...state, itinerary: [...state.itinerary, action.payload] };
    case 'UPDATE_ITEM':
      return { ...state, itinerary: state.itinerary.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'DELETE_ITEM':
      return { ...state, itinerary: state.itinerary.filter(i => i.id !== action.payload) };
    case 'SWAP_DAYS': {
      const { tripId, dayIndexA, dayIndexB } = action.payload;
      return {
        ...state, itinerary: state.itinerary.map(item => {
          if (item.tripId !== tripId) return item;
          if (item.dayIndex === dayIndexA) return { ...item, dayIndex: dayIndexB };
          if (item.dayIndex === dayIndexB) return { ...item, dayIndex: dayIndexA };
          return item;
        })
      };
    }
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload] };
    case 'UPDATE_EXPENSE':
      return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };
    case 'ADD_REC':
      return { ...state, recommendations: [...state.recommendations, action.payload] };
    case 'UPDATE_REC':
      return { ...state, recommendations: state.recommendations.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_REC':
      return { ...state, recommendations: state.recommendations.filter(r => r.id !== action.payload) };
    case 'REORDER_REC': {
      const { id, direction } = action.payload;
      const target = state.recommendations.find(r => r.id === id);
      if (!target) return state;
      const tripRecs = state.recommendations.filter(r => r.tripId === target.tripId).sort((a, b) => a.order - b.order);
      const idx = tripRecs.findIndex(r => r.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= tripRecs.length) return state;
      const swap = tripRecs[swapIdx];
      return {
        ...state, recommendations: state.recommendations.map(r => {
          if (r.id === target.id) return { ...r, order: swap.order };
          if (r.id === swap.id) return { ...r, order: target.order };
          return r;
        })
      };
    }
    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.payload] };
    case 'UPDATE_NOTE':
      return { ...state, notes: state.notes.map(n => n.id === action.payload.id ? action.payload : n) };
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter(n => n.id !== action.payload) };
    case 'REORDER_NOTE': {
      const { id, direction } = action.payload;
      const target = state.notes.find(n => n.id === id);
      if (!target) return state;
      const tripNotes = state.notes.filter(n => n.tripId === target.tripId).sort((a, b) => a.order - b.order);
      const idx = tripNotes.findIndex(n => n.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= tripNotes.length) return state;
      const swap = tripNotes[swapIdx];
      return {
        ...state, notes: state.notes.map(n => {
          if (n.id === target.id) return { ...n, order: swap.order };
          if (n.id === swap.id) return { ...n, order: target.order };
          return n;
        })
      };
    }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload };
    default:
      return state;
  }
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (initial) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initial;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const syncTrip = async (tripId: string) => {
    const trip = state.trips.find(t => t.id === tripId);
    if (!trip) return;
    const data = {
      trip,
      itinerary: state.itinerary.filter(i => i.tripId === tripId),
      expenses: state.expenses.filter(e => e.tripId === tripId),
      recommendations: state.recommendations.filter(r => r.tripId === tripId),
      notes: state.notes.filter(n => n.tripId === tripId),
    };
    try {
      await fetch('https://tripplanner-api.tehsuan-tht.workers.dev/api/sync', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) { console.error("Sync failed", e); }
  };

  const importTripById = async (shortId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://tripplanner-api.tehsuan-tht.workers.dev/api/trip/${shortId.toUpperCase()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!state.trips.find(t => t.id === data.trip.id)) {
        dispatch({ type: 'ADD_TRIP', payload: data.trip });
      }
      data.itinerary.forEach((i: any) => dispatch({ type: 'ADD_ITEM', payload: i }));
      data.expenses.forEach((e: any) => dispatch({ type: 'ADD_EXPENSE', payload: e }));
      data.recommendations.forEach((r: any) => dispatch({ type: 'ADD_REC', payload: r }));
      data.notes.forEach((n: any) => dispatch({ type: 'ADD_NOTE', payload: n }));
      return true;
    } catch (e) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get('join');
    if (joinId) {
      importTripById(joinId);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch, syncTrip, importTripById, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
