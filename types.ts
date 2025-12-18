// --- Database Schema Types ---
export type SplitType = 'even' | 'custom';
export type ItemType = string; 
export type NoteType = string;
export type RecType = string;

export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface AppSettings {
  scheduleCategories: Category[];
  recCategories: Category[];
  noteCategories: Category[];
}

export interface Trip {
  id: string;           
  shortId: string;      // TK-8F2A 格式的分享碼
  title: string;
  days: number;
  participants: string[];
  startDate: string;
  endDate?: string;
  lastSync?: number;    // 同步時間戳
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  dayIndex: number;
  time: string;
  title: string;
  location: string;
  mapUrl?: string; // Google Maps specific URL
  content: string;
  type: ItemType;
  url?: string; // General related link
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  payer: string;
  splitType: SplitType;
  customSplits: { [participantName: string]: number };
  date: number;
}

export interface Recommendation {
  id: string;
  tripId: string;
  title: string;
  content: string;
  type: RecType;
  url?: string;
  images: string[];
  order: number;
}

export interface Note {
  id: string;
  tripId: string;
  title: string;
  content: string;
  type: NoteType;
  url?: string;
  images: string[];
  order: number;
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}

export interface AppState {
  trips: Trip[];
  itinerary: ItineraryItem[];
  expenses: Expense[];
  recommendations: Recommendation[];
  notes: Note[];
  settings: AppSettings;
}

export type Action =
  | { type: 'ADD_TRIP'; payload: Trip }
  | { type: 'DELETE_TRIP'; payload: string }
  | { type: 'UPDATE_TRIP'; payload: Trip }
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_ITEM'; payload: ItineraryItem }
  | { type: 'UPDATE_ITEM'; payload: ItineraryItem }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'ADD_REC'; payload: Recommendation }
  | { type: 'UPDATE_REC'; payload: Recommendation }
  | { type: 'DELETE_REC'; payload: string }
  | { type: 'REORDER_REC'; payload: { id: string; direction: 'up' | 'down' } }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'REORDER_NOTE'; payload: { id: string; direction: 'up' | 'down' } }
  | { type: 'SWAP_DAYS'; payload: { tripId: string; dayIndexA: number; dayIndexB: number } }
  | { type: 'UPDATE_SETTINGS'; payload: AppSettings };