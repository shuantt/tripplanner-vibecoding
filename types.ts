// --- Database Schema Types (Prepared for Cloudflare D1) ---

// SQLite: TEXT ('even' | 'custom')
export type SplitType = 'even' | 'custom';

// SQLite: TEXT (Dynamic UUIDs for categories)
export type ItemType = string; 
export type NoteType = string;
export type RecType = string;

export interface Category {
  id: string;       // Primary Key
  label: string;    // TEXT
  color: string;    // TEXT (Tailwind Class)
  icon: string;     // TEXT (Lucide Icon Name)
}

export interface AppSettings {
  scheduleCategories: Category[];
  recCategories: Category[];
  noteCategories: Category[];
}

export interface Trip {
  id: string;           // Primary Key (UUID)
  title: string;        // TEXT
  days: number;         // INTEGER
  participants: string[]; // JSON TEXT: ["Alice", "Bob"]
  startDate: string;    // TEXT (ISO Date YYYY-MM-DD)
  endDate?: string;     // TEXT (ISO Date YYYY-MM-DD)
}

export interface ItineraryItem {
  id: string;           // Primary Key (UUID)
  tripId: string;       // Foreign Key -> Trip.id
  dayIndex: number;     // INTEGER
  time: string;         // TEXT (HH:mm)
  title: string;        // TEXT
  location: string;     // TEXT
  content: string;      // TEXT
  type: ItemType;       // Foreign Key -> Category.id (Logical)
  lat?: number;         // REAL
  lng?: number;         // REAL
  url?: string;         // TEXT
}

export interface Expense {
  id: string;           // Primary Key (UUID)
  tripId: string;       // Foreign Key -> Trip.id
  title: string;        // TEXT
  amount: number;       // REAL
  payer: string;        // TEXT
  splitType: SplitType; // TEXT
  customSplits: { [participantName: string]: number }; // JSON TEXT
  date: number;         // INTEGER (Timestamp)
}

export interface Recommendation {
  id: string;           // Primary Key (UUID)
  tripId: string;       // Foreign Key -> Trip.id
  title: string;        // TEXT
  content: string;      // TEXT
  type: RecType;        // Foreign Key -> Category.id (Logical)
  url?: string;         // TEXT
  images: string[];     // JSON TEXT (Initially Base64, Future R2 URLs)
  order: number;        // INTEGER
}

export interface Note {
  id: string;           // Primary Key (UUID)
  tripId: string;       // Foreign Key -> Trip.id
  title: string;        // TEXT
  content: string;      // TEXT
  type: NoteType;       // Foreign Key -> Category.id (Logical)
  url?: string;         // TEXT
  images: string[];     // JSON TEXT (Initially Base64, Future R2 URLs)
  order: number;        // INTEGER
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}

// In-Memory State (Acts as a local cache of the DB)
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