import React, { createContext, useReducer, useEffect, useContext, ReactNode } from 'react';
import { AppState, Action, Trip, AppSettings, ItineraryItem, Expense, Recommendation, Note } from './types';
import { generateId } from './utils';

// Default Settings with Icons
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

const INITIAL_STATE: AppState = {
  trips: [],
  itinerary: [],
  expenses: [],
  recommendations: [],
  notes: [],
  settings: DEFAULT_SETTINGS
};

// Updated key to force load the new template data
const STORAGE_KEY = 'travel_planner_template_tokyo_v1';

const StoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({
  state: INITIAL_STATE,
  dispatch: () => null
});

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, action.payload] };
    case 'DELETE_TRIP':
      return { ...state, trips: state.trips.filter(t => t.id !== action.payload) };
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
      const newItinerary = state.itinerary.map(item => {
        if (item.tripId !== tripId) return item;
        if (item.dayIndex === dayIndexA) return { ...item, dayIndex: dayIndexB };
        if (item.dayIndex === dayIndexB) return { ...item, dayIndex: dayIndexA };
        return item;
      });
      return { ...state, itinerary: newItinerary };
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
        const targetRec = state.recommendations.find(r => r.id === id);
        if (!targetRec) return state;

        const tripRecs = state.recommendations
            .filter(r => r.tripId === targetRec.tripId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const index = tripRecs.findIndex(r => r.id === id);
        if (index === -1) return state;
        if (direction === 'up' && index === 0) return state;
        if (direction === 'down' && index === tripRecs.length - 1) return state;

        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        const swapRec = tripRecs[swapIndex];
        
        const newOrder1 = swapRec.order || 0;
        const newOrder2 = targetRec.order || 0;

        const updatedRecs = state.recommendations.map(r => {
            if (r.id === targetRec.id) return { ...r, order: newOrder1 };
            if (r.id === swapRec.id) return { ...r, order: newOrder2 };
            return r;
        });
        return { ...state, recommendations: updatedRecs };
    }

    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.payload] };
    case 'UPDATE_NOTE':
      return { ...state, notes: state.notes.map(n => n.id === action.payload.id ? action.payload : n) };
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter(n => n.id !== action.payload) };
    case 'REORDER_NOTE': {
      const { id, direction } = action.payload;
      const targetNote = state.notes.find(n => n.id === id); 
      if (!targetNote) return state;
      
      const tripNotes = state.notes.filter(n => n.tripId === targetNote.tripId).sort((a, b) => a.order - b.order);
      const index = tripNotes.findIndex(n => n.id === id);
      
      if (index === -1) return state;
      if (direction === 'up' && index === 0) return state;
      if (direction === 'down' && index === tripNotes.length - 1) return state;

      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      const swapNote = tripNotes[swapIndex];

      const newOrder1 = swapNote.order;
      const newOrder2 = targetNote.order;

      const updatedNotes = state.notes.map(n => {
        if (n.id === targetNote.id) return { ...n, order: newOrder1 };
        if (n.id === swapNote.id) return { ...n, order: newOrder2 };
        return n;
      });

      return { ...state, notes: updatedNotes };
    }

    case 'UPDATE_SETTINGS':
        return { ...state, settings: action.payload };

    default:
      return state;
  }
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (initial) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
          const parsed = JSON.parse(stored);
          
          // Migration logic: Add icons if missing
          const migrateCategories = (cats: any[], defaultCats: any[]) => {
              if(!cats) return defaultCats;
              return cats.map((c: any, i: number) => ({
                  ...c,
                  icon: c.icon || defaultCats[i % defaultCats.length]?.icon || 'tag'
              }));
          };

          const settings = parsed.settings || DEFAULT_SETTINGS;
          
          return { 
              ...parsed, 
              settings: {
                  scheduleCategories: migrateCategories(settings.scheduleCategories, DEFAULT_SETTINGS.scheduleCategories),
                  recCategories: migrateCategories(settings.recCategories, DEFAULT_SETTINGS.recCategories),
                  noteCategories: migrateCategories(settings.noteCategories, DEFAULT_SETTINGS.noteCategories),
              }
          };
      }
      return initial;
    } catch (e) {
      console.error("Failed to load state", e);
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Seed data for Tokyo 4-Day Template
  useEffect(() => {
    if (state.trips.length === 0) {
      const tripId = 'template-tokyo-1';
      
      // 1. Create Trip
      const templateTrip: Trip = {
        id: tripId,
        title: '東京4天3夜 (Template)',
        days: 4,
        participants: ['小明', '小美', '小華'],
        startDate: '2024-12-01',
        endDate: '2024-12-04'
      };
      dispatch({ type: 'ADD_TRIP', payload: templateTrip });

      // 2. Add Itinerary Items
      const itineraryItems: ItineraryItem[] = [
          // Day 1 (Index 0): 12/01
          { id: generateId(), tripId, dayIndex: 0, time: '09:00', title: '飛機去程', location: '桃園機場 -> 成田機場', content: 'BR198', type: 'transport' },
          { id: generateId(), tripId, dayIndex: 0, time: '14:00', title: '淺草寺', location: '淺草雷門', content: '參拜、逛仲見世通', type: 'sightseeing' },
          { id: generateId(), tripId, dayIndex: 0, time: '16:00', title: '前往飯店', location: '', content: '搭乘地鐵', type: 'transport' },
          { id: generateId(), tripId, dayIndex: 0, time: '18:00', title: '晚餐：一蘭拉麵', location: '上野店', content: '記得加辣', type: 'food' },
          { id: generateId(), tripId, dayIndex: 0, time: '21:00', title: '入住飯店', location: '上野 APA Hotel', content: 'Check-in', type: 'accommodation' },

          // Day 2 (Index 1): 12/02
          { id: generateId(), tripId, dayIndex: 1, time: '09:00', title: 'SHIBUYA SKY', location: '澀谷 Scramble Square', content: '觀景台拍照', type: 'sightseeing' },
          { id: generateId(), tripId, dayIndex: 1, time: '12:30', title: '午餐：敘敘苑燒肉', location: '澀谷店', content: '商業午餐', type: 'food' },
          { id: generateId(), tripId, dayIndex: 1, time: '15:00', title: '前往原宿', location: '', content: '山手線', type: 'transport' },
          { id: generateId(), tripId, dayIndex: 1, time: '22:00', title: '返回飯店', location: '上野', content: '', type: 'accommodation' },

          // Day 3 (Index 2): 12/03
          { id: generateId(), tripId, dayIndex: 2, time: '10:00', title: '東京迪士尼樂園', location: '舞濱', content: '全日遊', type: 'sightseeing' },
          { id: generateId(), tripId, dayIndex: 2, time: '13:00', title: '樂園午餐', location: '紅心女王宴會大廳', content: '', type: 'food' },
          { id: generateId(), tripId, dayIndex: 2, time: '21:30', title: '返回市區', location: '', content: 'JR 京葉線', type: 'transport' },
          { id: generateId(), tripId, dayIndex: 2, time: '23:00', title: '休息', location: '上野', content: '', type: 'accommodation' },

          // Day 4 (Index 3): 12/04
          { id: generateId(), tripId, dayIndex: 3, time: '09:00', title: '築地場外市場', location: '築地', content: '吃玉子燒、海鮮丼', type: 'sightseeing' },
          { id: generateId(), tripId, dayIndex: 3, time: '14:00', title: '飛機回程', location: '成田機場 -> 桃園機場', content: 'BR197', type: 'transport' },
      ];
      itineraryItems.forEach(item => dispatch({ type: 'ADD_ITEM', payload: item }));

      // 3. Add Expenses
      const expenses: Expense[] = [
          { 
              id: generateId(), 
              tripId, 
              title: '飯店住宿費', 
              amount: 20000, 
              payer: '小美', 
              splitType: 'even', 
              customSplits: {}, 
              date: Date.now() 
          },
          { 
              id: generateId(), 
              tripId, 
              title: '計程車費', 
              amount: 2100, 
              payer: '小明', 
              splitType: 'even', 
              customSplits: {}, 
              date: Date.now() - 1000 
          },
          { 
              id: generateId(), 
              tripId, 
              title: '章魚燒', 
              amount: 700, 
              payer: '小明', 
              splitType: 'custom', 
              customSplits: { '小明': 350, '小美': 350 }, 
              date: Date.now() - 2000 
          },
      ];
      expenses.forEach(exp => dispatch({ type: 'ADD_EXPENSE', payload: exp }));

      // 4. Add Recommendations
      const recs: Recommendation[] = [
          { id: generateId(), tripId, title: 'Tokyo Banana', content: '東京必買經典伴手禮，香蕉卡士達蛋糕。', type: 'shopping', images: [], order: 0 },
          { id: generateId(), tripId, title: 'New York Perfect Cheese', content: '超人氣起司奶油脆餅，要在車站排隊買。', type: 'shopping', images: [], order: 1 },
          { id: generateId(), tripId, title: '迪士尼門票 Coupon', content: 'Klook 購票優惠連結', type: 'other', url: 'https://www.klook.com', images: [], order: 2 },
      ];
      recs.forEach(rec => dispatch({ type: 'ADD_REC', payload: rec }));

      // 5. Add Notes
      const note: Note = {
          id: generateId(),
          tripId,
          title: 'Suica 快速交通卡教學 (iOS)',
          content: '1. 打開 iPhone 的「錢包 (Wallet)」App。\n2. 點擊右上角的「+」號。\n3. 選擇「交通卡」。\n4. 在搜尋欄輸入「Suica」。\n5. 點擊 Suica 並依照指示加值金額即可使用。\n(進出站時不用解鎖手機，直接感應即可)',
          type: 'transport',
          url: 'https://mrmad.com.tw/iphone-suica',
          images: [],
          order: 0
      };
      dispatch({ type: 'ADD_NOTE', payload: note });
    }
  }, [state.trips.length]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);