import React, { createContext, useReducer, useEffect, useContext, ReactNode, useState, useRef } from 'react';
import { AppState, Action, Trip, AppSettings, ItineraryItem, Expense, Recommendation, Note } from './types';
import { generateId, generateShortId } from './utils';
import { useAuth } from './AuthContext';

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
  trips: [], // Start empty, load from server
  itinerary: [],
  expenses: [],
  recommendations: [],
  notes: [],
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
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from LocalStorage just to have Settings, but Trips should come from Server for this User
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (initial) => {
    // We can persist settings, but trip data is now user-scoped. 
    // If we load "all trips" from LS, they might belong to another user if we shared this browser?
    // Safer: Only load settings from LS. Trips load from API.
    // BUT for offline support/optimistic, we might want to cache user-specific data.
    // For MVP: Let's trust the server.
    return initial;
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    // We can cache to LS here if we want, but careful with multi-user.
  }, [state]);

  const API_BASE = 'https://tripplanner-api.tehsuan-tht.workers.dev';

  // Fetch Trips when Token changes
  const loadTrips = async () => {
    if (!token) {
      // Clear trips if no token
      dispatch({ type: 'SET_STATE', payload: { ...INITIAL_STATE, settings: state.settings } });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/trips`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const remoteTrips: Trip[] = await res.json();
        const fullState: AppState = { ...INITIAL_STATE, settings: state.settings, trips: remoteTrips };

        if (remoteTrips.length > 0) {
          fullState.itinerary = [];
          fullState.expenses = [];
          fullState.recommendations = [];
          fullState.notes = [];

          await Promise.all(remoteTrips.map(async (t) => {
            try {
              const detRes = await fetch(`${API_BASE}/api/trips/${t.id}/full`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (detRes.ok) {
                const det = await detRes.json();
                fullState.itinerary.push(...det.itinerary);
                fullState.expenses.push(...det.expenses);
                fullState.recommendations.push(...det.recommendations);
                fullState.notes.push(...det.notes);
              }
            } catch (e) { console.error('Failed to load details for', t.id) }
          }));
        }

        dispatch({ type: 'SET_STATE', payload: fullState });
      }
    } catch (e) {
      console.error("Failed to load trips", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [token]);


  // --- SYNC ---

  const performSync = async (tripId: string) => {
    if (!token) return;
    const currentState = stateRef.current;
    const trip = currentState.trips.find(t => t.id === tripId);
    if (!trip) return;

    const data = {
      trip,
      itinerary: currentState.itinerary.filter(i => i.tripId === tripId),
      expenses: currentState.expenses.filter(e => e.tripId === tripId),
      recommendations: currentState.recommendations.filter(r => r.tripId === tripId),
      notes: currentState.notes.filter(n => n.tripId === tripId),
    };

    try {
      await fetch(`${API_BASE}/api/sync`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log("Synced", tripId);
    } catch (e) { console.error("Sync failed", e); }
  }

  const [dirtyTripId, setDirtyTripId] = useState<string | null>(null);

  useEffect(() => {
    if (dirtyTripId) {
      const timer = setTimeout(() => {
        performSync(dirtyTripId);
        setDirtyTripId(null);
      }, 2000); // 2s debounce
      return () => clearTimeout(timer);
    }
  }, [dirtyTripId]);

  const deleteTripApi = async (tripId: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/trips/${tripId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error("Delete failed", e); }
  };

  const dispatchWithSync = (action: Action) => {
    dispatch(action);

    let tid: string | undefined;
    // Extract Trip ID logic
    if (action.type === 'ADD_TRIP' || action.type === 'UPDATE_TRIP') tid = action.payload.id;
    else if (['ADD_ITEM', 'UPDATE_ITEM', 'SWAP_DAYS', 'ADD_EXPENSE', 'UPDATE_EXPENSE', 'ADD_REC', 'UPDATE_REC', 'ADD_NOTE', 'UPDATE_NOTE'].includes(action.type)) {
      // @ts-ignore
      tid = action.payload.tripId || (action.payload as any).id;
      if (!tid && 'tripId' in action.payload) tid = (action.payload as any).tripId;
    }

    if (action.type === 'DELETE_TRIP') {
      deleteTripApi(action.payload);
      return;
    }

    if (action.type.startsWith('DELETE_') && action.type !== 'DELETE_TRIP') {
      const id = action.payload as string;
      let found;
      if (action.type === 'DELETE_ITEM') found = state.itinerary.find(i => i.id === id);
      else if (action.type === 'DELETE_EXPENSE') found = state.expenses.find(e => e.id === id);
      else if (action.type === 'DELETE_REC') found = state.recommendations.find(r => r.id === id);
      else if (action.type === 'DELETE_NOTE') found = state.notes.find(n => n.id === id);

      if (found) tid = (found as any).tripId;
    }

    if (action.type.startsWith('REORDER_')) {
      const { id } = action.payload as { id: string };
      let found;
      if (action.type === 'REORDER_REC') found = state.recommendations.find(r => r.id === id);
      else if (action.type === 'REORDER_NOTE') found = state.notes.find(n => n.id === id);
      if (found) tid = (found as any).tripId;
    }

    if (tid) setDirtyTripId(tid);
  };

  const importTripById = async (shortId: string): Promise<boolean> => {
    if (!token) return false;
    setIsLoading(true);
    try {
      // New "Join" Flow:
      const res = await fetch(`${API_BASE}/api/trips/join`, {
        method: 'POST',
        body: JSON.stringify({ shortId }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        // Maybe already member?
        const data = await res.json();
        if (res.status === 200 && data.message === 'Already a member') {
          // Already member, just reload to be sure
          await loadTrips();
          return true;
        }
        return false;
      }

      // Success Joined
      await loadTrips(); // Reload all trips to get the new one fully
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
    if (joinId && token) { // Import only if logged in
      importTripById(joinId);
      window.history.replaceState({}, document.title, "/");
    }
  }, [token]); // Run when token available

  return (
    <StoreContext.Provider value={{ state, dispatch: dispatchWithSync, syncTrip: performSync, importTripById, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
