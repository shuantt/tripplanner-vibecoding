
-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at INTEGER
);

-- Trips
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  short_id TEXT UNIQUE,
  owner_id TEXT, -- Link to users table
  title TEXT NOT NULL,
  days INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  cover_image TEXT,
  participants TEXT, -- JSON string of participant names
  deleted_at INTEGER, -- Soft delete timestamp
  last_sync INTEGER,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Trip Members (Collaborators)
CREATE TABLE IF NOT EXISTS trip_members (
  trip_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT, -- 'OWNER', 'EDITOR', 'VIEWER'
  PRIMARY KEY (trip_id, user_id),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Itinerary Items
CREATE TABLE IF NOT EXISTS itinerary_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  time TEXT,
  title TEXT,
  location TEXT,
  map_url TEXT,
  content TEXT,
  type TEXT,
  url TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  payer TEXT,
  split_type TEXT,
  custom_splits TEXT, -- JSON string can remain for complex split logic, or normalize further if needed. JSON is often practical here.
  date INTEGER,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  type TEXT,
  url TEXT,
  sort_order INTEGER,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  type TEXT,
  url TEXT,
  sort_order INTEGER,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- Images (New table as requested)
-- Links images to specific parent entities (recs, notes, etc.)
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL, -- ID of Recommendation or Note
  parent_type TEXT NOT NULL, -- 'RECOMMENDATION', 'NOTE', 'TRIP_COVER'
  url TEXT NOT NULL,
  storage_key TEXT, -- For R2 reference
  created_at INTEGER
  -- No Foreign Key enforced on parent_id because it could be different tables. 
  -- Alternatively, use separate join tables, but this is simpler for generic attachments.
);

-- Settings (New table for AppState.settings)
-- Assuming settings are per-user or global? The frontend 'AppSettings' structure suggests configurable categories.
-- If these are per-user settings matching AppSettings:
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  schedule_categories TEXT, -- JSON structure for categories
  rec_categories TEXT,
  note_categories TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

