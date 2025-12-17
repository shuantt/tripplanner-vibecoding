import React, { createContext, useReducer, useEffect, useContext, ReactNode } from 'react';
import { AppState, Action, Trip, AppSettings } from './types';

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

// Renamed key to reflect "DB" nature, though still using localStorage for now
const STORAGE_KEY = 'travel_planner_db_v1';

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

  // Seed data if empty for demo purposes
  useEffect(() => {
    if (state.trips.length === 0) {
      const demoTripId = 'demo-trip-1';
      const demoTrip: Trip = {
        id: demoTripId,
        title: '東京冒險之旅 🇯🇵',
        days: 5,
        participants: ['小明', '小華', '美美'],
        startDate: new Date().toISOString().split('T')[0]
      };
      dispatch({ type: 'ADD_TRIP', payload: demoTrip });
    }
  }, [state.trips.length]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);