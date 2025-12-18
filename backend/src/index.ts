
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

// --- CRYPTO HELPERS ---
async function hashPassword(password: string, salt: string | null = null): Promise<{ hash: string, salt: string }> {
  const enc = new TextEncoder();
  const saltBuffer = salt ? (Uint8Array.from(atob(salt), c => c.charCodeAt(0))) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", key);
  const hashStr = btoa(String.fromCharCode(...new Uint8Array(exported)));
  const saltStr = btoa(String.fromCharCode(...saltBuffer));
  return { hash: hashStr, salt: saltStr };
}

async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}

// --- TEMPLATE DATA ---
function getTemplateData(userId: string) {
  const tripId = crypto.randomUUID();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let shortId = '';
  for (let i = 0; i < 3; i++) shortId += chars.charAt(Math.floor(Math.random() * chars.length));
  shortId += '-';
  for (let i = 0; i < 4; i++) shortId += chars.charAt(Math.floor(Math.random() * chars.length));

  // Start next month 1st
  const start = new Date();
  start.setMonth(start.getMonth() + 1);
  start.setDate(1);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);

  return {
    trip: {
      id: tripId,
      shortId: shortId,
      title: '東京 4 天 3 夜 (新手範本)',
      days: 4,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      participants: "我,朋友A"
    },
    itinerary: [
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 0, time: '14:00', title: '成田機場接機', location: 'Narita Airport', content: '搭乘京成電鐵 Skyliner 前往新宿', type: 'transport' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 0, time: '16:30', title: '新宿飯店 Check-in', location: 'Shinjuku Prince Hotel', content: '確認碼：ABC12345', type: 'accommodation' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 0, time: '19:00', title: '六歌仙燒肉', location: '新宿', content: '已訂位 19:00，晚餐放題', type: 'food' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 1, time: '09:00', title: '明治神宮', location: '原宿', content: '參觀大鳥居與森林步道', type: 'sightseeing' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 1, time: '13:00', title: '竹下通逛街', location: '原宿', content: '買可麗餅吃', type: 'other' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 1, time: '18:00', title: '澀谷 Sky 看夕陽', location: 'Shibuya Scramble Square', content: '需提前一個月訂票', type: 'sightseeing' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 2, time: '10:00', title: '淺草寺', location: '雷門', content: '抽籤、吃人形燒', type: 'sightseeing' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 2, time: '15:00', title: '晴空塔', location: '墨田區', content: '看夜景、逛龍貓商店', type: 'sightseeing' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 3, time: '11:00', title: '築地市場', location: '築地', content: '吃早午餐壽司', type: 'food' },
      { id: crypto.randomUUID(), trip_id: tripId, day_index: 3, time: '15:00', title: '前往機場', location: '東京車站', content: '搭乘 N-EX', type: 'transport' }
    ],
    expenses: [
      { id: crypto.randomUUID(), trip_id: tripId, title: '六歌仙燒肉', amount: 24000, payer: '我', split_type: 'even', custom_splits: '{}', date: Date.now() },
      { id: crypto.randomUUID(), trip_id: tripId, title: '澀谷 Sky 門票', amount: 6000, payer: '朋友A', split_type: 'even', custom_splits: '{}', date: Date.now() },
    ],
    recommendations: [
      { id: crypto.randomUUID(), trip_id: tripId, title: '阿夫利拉麵 (AFURI)', content: '必點柚子鹽口味，非常清爽。', type: 'food', url: 'https://afuri.com/', sort_order: 0 },
      { id: crypto.randomUUID(), trip_id: tripId, title: '銀座伊東屋 Itoya', content: '文具控的天堂。', type: 'shopping', url: '', sort_order: 1 }
    ],
    notes: [
      { id: crypto.randomUUID(), trip_id: tripId, title: '打包清單', content: '1. 護照\n2. 換日幣\n3. 行動電源', type: 'general', url: '', sort_order: 0 },
    ]
  };
}


// --- AUTH MIDDLEWARE ---
async function getUser(c: any) {
  const auth = c.req.header('Authorization');
  if (!auth) return null;
  const token = auth.split(' ')[1];
  try {
    const secret = c.env.JWT_SECRET || 'fallback_dev_secret';
    const payload = await verify(token, secret);
    return payload;
  } catch (e) {
    return null;
  }
}


// --- AUTH ENDPOINTS ---

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json();
  const { email, password, name } = body;
  if (!email || !password) return c.json({ error: 'Missing fields' }, 400);

  const db = c.env.DB;
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'User already exists' }, 409);

  const { hash, salt } = await hashPassword(password);
  const storedValue = `${salt}:${hash}`;
  const userId = crypto.randomUUID();

  // Insert User
  await db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, email, storedValue, name || email.split('@')[0], Date.now())
    .run();

  // --- SEED TEMPLATE TRIP ---
  try {
    const { trip, itinerary, expenses, recommendations, notes } = getTemplateData(userId);
    const batch = [];

    // 1. Trip (With Participants)
    batch.push(db.prepare(`INSERT INTO trips (id, short_id, title, days, start_date, end_date, cover_image, participants, last_sync) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(trip.id, trip.shortId, trip.title, trip.days, trip.start_date, trip.end_date, null, trip.participants, Date.now()));

    // 2. Member (Owner)
    batch.push(db.prepare(`INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'OWNER')`).bind(trip.id, userId));

    // 3. Items
    const stmtItem = db.prepare(`INSERT INTO itinerary_items (id, trip_id, day_index, time, title, location, map_url, content, type, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    itinerary.forEach((i: any) => batch.push(stmtItem.bind(i.id, i.trip_id, i.day_index, i.time, i.title, i.location, '', i.content, i.type, '')));

    const stmtExp = db.prepare(`INSERT INTO expenses (id, trip_id, title, amount, payer, split_type, custom_splits, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    expenses.forEach((e: any) => batch.push(stmtExp.bind(e.id, e.trip_id, e.title, e.amount, e.payer, e.split_type, e.custom_splits, e.date)));

    const stmtRec = db.prepare(`INSERT INTO recommendations (id, trip_id, title, content, type, url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    recommendations.forEach((r: any) => batch.push(stmtRec.bind(r.id, r.trip_id, r.title, r.content, r.type, r.url, r.sort_order)));

    const stmtNote = db.prepare(`INSERT INTO notes (id, trip_id, title, content, type, url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    notes.forEach((n: any) => batch.push(stmtNote.bind(n.id, n.trip_id, n.title, n.content, n.type, n.url, n.sort_order)));

    await db.batch(batch);

  } catch (e) {
    console.error("Failed to seed template", e);
  }

  return c.json({ success: true, userId });
});

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;
  const db = c.env.DB;
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  const [salt, hash] = (user.password_hash as string).split(':');
  if (!salt || !hash) return c.json({ error: 'Invalid stored credential format' }, 500);

  const isValid = await verifyPassword(password, hash, salt);
  if (!isValid) return c.json({ error: 'Invalid credentials' }, 401);

  // Issue Token
  const secret = c.env.JWT_SECRET || 'fallback_dev_secret';
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  const token = await sign(payload, secret);

  return c.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});


// --- TRIPS ENDPOINTS (Protected) ---

app.get('/api/trips', async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Return trips where user is Member AND NOT Deleted
  const { results } = await c.env.DB.prepare(`
    SELECT t.*, tm.role 
    FROM trips t 
    JOIN trip_members tm ON t.id = tm.trip_id 
    WHERE tm.user_id = ? AND (t.deleted_at IS NULL OR t.deleted_at = 0)
    ORDER BY t.start_date DESC
  `).bind(user.sub).all();

  // Parse participants and add Role
  const trips = results.map((t: any) => ({
    ...t,
    participants: t.participants ? t.participants.split(',') : [],
    role: t.role // Return Role to frontend
  }));

  return c.json(trips)
})

app.delete('/api/trips/:id', async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const tripId = c.req.param('id');
  const db = c.env.DB;

  const member = await db.prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?').bind(tripId, user.sub).first();
  if (!member || member.role !== 'OWNER') {
    return c.json({ error: 'Forbidden. Only Owner can delete.' }, 403);
  }

  // Soft Delete
  await db.prepare('UPDATE trips SET deleted_at = ? WHERE id = ?').bind(Date.now(), tripId).run();
  return c.json({ message: 'Trip deleted' })
})

app.post('/api/trips/join', async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { shortId } = await c.req.json();
  if (!shortId) return c.json({ error: 'Short ID required' }, 400);

  const db = c.env.DB;
  // Check if trip exists and not deleted
  const trip = await db.prepare('SELECT id, title FROM trips WHERE short_id = ? AND (deleted_at IS NULL OR deleted_at = 0)').bind(shortId.toUpperCase()).first();
  if (!trip) return c.json({ error: 'Trip not found' }, 404);

  const existing = await db.prepare('SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?').bind(trip.id, user.sub).first();
  if (existing) {
    return c.json({ message: 'Already a member', tripId: trip.id });
  }

  await db.prepare('INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)')
    .bind(trip.id, user.sub, 'EDITOR')
    .run();

  return c.json({ success: true, tripId: trip.id, title: trip.title });
});


// --- SYNC (Protected) ---
app.post('/api/sync', async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json()
  const { trip, itinerary, expenses, recommendations, notes } = body
  const tripId = trip.id;
  const db = c.env.DB;

  // Check Exists & Permission
  const existingTrip = await db.prepare('SELECT id, participants FROM trips WHERE id = ?').bind(tripId).first();
  let role = 'OWNER';

  if (existingTrip) {
    const member = await db.prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?').bind(tripId, user.sub).first();
    // Allow Owner or Editor to sync items
    if (!member || (member.role !== 'OWNER' && member.role !== 'EDITOR')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    role = member.role as string;
  } else {
    // Create new trip: Must check if user is allowed? 
    // For sync endpoint, we usually assume if it doesn't exist, we create it (if ID matches generation).
    // But if it's a NEW trip, the user is OWNER.
  }

  try {
    const batch = [];
    const participantsStr = Array.isArray(trip.participants) ? trip.participants.join(',') : trip.participants;

    if (role === 'OWNER') {
      // Owner: Update Everything including Metadata
      batch.push(db.prepare(`
          INSERT INTO trips (id, short_id, title, days, start_date, end_date, cover_image, participants, last_sync, deleted_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
          ON CONFLICT(id) DO UPDATE SET
            short_id=excluded.short_id,
            title=excluded.title,
            days=excluded.days,
            start_date=excluded.start_date,
            end_date=excluded.end_date,
            cover_image=excluded.cover_image,
            participants=excluded.participants,
            last_sync=excluded.last_sync,
            deleted_at=NULL
        `).bind(trip.id, trip.shortId, trip.title, trip.days, trip.startDate, trip.endDate, null, participantsStr, Date.now()));

      if (!existingTrip) {
        batch.push(db.prepare(`INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'OWNER')`).bind(tripId, user.sub));
      }

    } else {
      // Editor: Update ONLY last_sync. Do NOT update title/days/participants.
      // We use UPDATE here to avoid overwriting metadata.
      if (existingTrip) {
        batch.push(db.prepare(`UPDATE trips SET last_sync = ? WHERE id = ?`).bind(Date.now(), tripId));
      } else {
        // Editor cannot create new trip via Sync (should not happen in normal flow as they Join)
        return c.json({ error: 'Forbidden. Editors cannot create new trips.' }, 403);
      }
    }

    // Clear & Re-Insert Children (Allowed for both Owner and Editor)
    batch.push(db.prepare('DELETE FROM itinerary_items WHERE trip_id = ?').bind(tripId));
    batch.push(db.prepare('DELETE FROM expenses WHERE trip_id = ?').bind(tripId));
    batch.push(db.prepare('DELETE FROM recommendations WHERE trip_id = ?').bind(tripId));
    batch.push(db.prepare('DELETE FROM notes WHERE trip_id = ?').bind(tripId));

    if (itinerary?.length > 0) {
      const stmt = db.prepare(`INSERT INTO itinerary_items (id, trip_id, day_index, time, title, location, map_url, content, type, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      itinerary.forEach((item: any) => batch.push(stmt.bind(item.id, tripId, item.dayIndex, item.time, item.title, item.location, item.mapUrl, item.content, item.type, item.url)));
    }
    if (expenses?.length > 0) {
      const stmt = db.prepare(`INSERT INTO expenses (id, trip_id, title, amount, payer, split_type, custom_splits, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      expenses.forEach((ex: any) => batch.push(stmt.bind(ex.id, tripId, ex.title, ex.amount, ex.payer, ex.splitType, JSON.stringify(ex.customSplits), ex.date)));
    }
    if (recommendations?.length > 0) {
      const stmt = db.prepare(`INSERT INTO recommendations (id, trip_id, title, content, type, url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      recommendations.forEach((rec: any) => batch.push(stmt.bind(rec.id, tripId, rec.title, rec.content, rec.type, rec.url, rec.order)));
    }
    if (notes?.length > 0) {
      const stmt = db.prepare(`INSERT INTO notes (id, trip_id, title, content, type, url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      notes.forEach((note: any) => batch.push(stmt.bind(note.id, tripId, note.title, note.content, note.type, note.url, note.order)));
    }

    await db.batch(batch);
    return c.json({ success: true, message: 'Synced successfully' });
  } catch (err: any) {
    console.error(err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// --- FETCH FULL TRIP (Protected) ---
app.get('/api/trips/:tripId/full', async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const tripId = c.req.param('tripId')
  const db = c.env.DB;

  const member = await db.prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?').bind(tripId, user.sub).first();
  if (!member) return c.json({ error: 'Forbidden' }, 403);

  // Check Soft Delete
  const trip = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ? AND (deleted_at IS NULL OR deleted_at = 0)').bind(tripId).first()
  if (!trip) return c.json({ error: 'Trip not found' }, 404)

  const [items, exps, recs, notes] = await Promise.all([
    db.prepare('SELECT * FROM itinerary_items WHERE trip_id = ?').bind(tripId).all(),
    db.prepare('SELECT * FROM expenses WHERE trip_id = ?').bind(tripId).all(),
    db.prepare('SELECT * FROM recommendations WHERE trip_id = ? ORDER BY sort_order').bind(tripId).all(),
    db.prepare('SELECT * FROM notes WHERE trip_id = ? ORDER BY sort_order').bind(tripId).all()
  ]);

  // Also return Metadata including participants
  return c.json({
    // We don't really use this top level logic in loadTrips heavily (we use /api/trips for metadata), 
    // but updated for consistency if we want to reload details.
    metadata: {
      ...trip,
      participants: (trip.participants as string || '').split(',')
    },
    itinerary: items.results.map((i: any) => ({
      id: i.id, tripId, dayIndex: i.day_index, time: i.time, title: i.title, location: i.location, mapUrl: i.map_url, content: i.content, type: i.type, url: i.url
    })),
    expenses: exps.results.map((e: any) => ({
      id: e.id, tripId, title: e.title, amount: e.amount, payer: e.payer, splitType: e.split_type, customSplits: JSON.parse(e.custom_splits || '{}'), date: e.date
    })),
    recommendations: recs.results.map((r: any) => ({
      id: r.id, tripId, title: r.title, content: r.content, type: r.type, url: r.url, order: r.sort_order, images: []
    })),
    notes: notes.results.map((n: any) => ({
      id: n.id, tripId, title: n.title, content: n.content, type: n.type, url: n.url, order: n.sort_order, images: []
    }))
  });
})

// --- READ PUBLIC TRIP (By Short ID) ---
app.get('/api/trip/:shortId', async (c) => {
  const shortId = c.req.param('shortId').toUpperCase();
  const db = c.env.DB;
  const trip = await db.prepare('SELECT * FROM trips WHERE short_id = ? AND (deleted_at IS NULL OR deleted_at = 0)').bind(shortId).first();
  if (!trip) return c.json({ error: 'Trip not found' }, 404);

  const tripId = trip.id;
  const [items, exps, recs, notes] = await Promise.all([
    db.prepare('SELECT * FROM itinerary_items WHERE trip_id = ?').bind(tripId).all(),
    db.prepare('SELECT * FROM expenses WHERE trip_id = ?').bind(tripId).all(),
    db.prepare('SELECT * FROM recommendations WHERE trip_id = ? ORDER BY sort_order').bind(tripId).all(),
    db.prepare('SELECT * FROM notes WHERE trip_id = ? ORDER BY sort_order').bind(tripId).all()
  ]);

  return c.json({
    trip: {
      id: trip.id,
      shortId: trip.short_id,
      title: trip.title,
      days: trip.days,
      participants: (trip.participants as string || '').split(','),
      startDate: trip.start_date,
      endDate: trip.end_date,
      lastSync: trip.last_sync
    },
    itinerary: items.results.map((i: any) => ({
      id: i.id, tripId, dayIndex: i.day_index, time: i.time, title: i.title, location: i.location, mapUrl: i.map_url, content: i.content, type: i.type, url: i.url
    })),
    expenses: exps.results.map((e: any) => ({
      id: e.id, tripId, title: e.title, amount: e.amount, payer: e.payer, splitType: e.split_type, customSplits: JSON.parse(e.custom_splits || '{}'), date: e.date
    })),
    recommendations: recs.results.map((r: any) => ({
      id: r.id, tripId, title: r.title, content: r.content, type: r.type, url: r.url, order: r.sort_order, images: []
    })),
    notes: notes.results.map((n: any) => ({
      id: n.id, tripId, title: n.title, content: n.content, type: n.type, url: n.url, order: n.sort_order, images: []
    }))
  });
});

app.get('/', (c) => c.json({ message: 'Trip Planner API v3 (Auth Enabled + Template + SoftDelete)' }));

export default app
