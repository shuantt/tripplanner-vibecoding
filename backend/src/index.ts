
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

  await db.prepare('INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, email, storedValue, name || email.split('@')[0], Date.now())
    .run();

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

  // Return trips where user is Member (Owner/Editor/Viewer)
  const { results } = await c.env.DB.prepare(`
    SELECT t.* 
    FROM trips t 
    JOIN trip_members tm ON t.id = tm.trip_id 
    WHERE tm.user_id = ? 
    ORDER BY t.start_date DESC
  `).bind(user.sub).all();

  return c.json(results)
})

app.delete('/api/trips/:id', async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const tripId = c.req.param('id');
  const db = c.env.DB;

  const member = await db.prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?').bind(tripId, user.sub).first();
  if (!member || member.role !== 'OWNER') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await db.prepare('DELETE FROM trips WHERE id = ?').bind(tripId).run();
  return c.json({ message: 'Trip deleted' })
})

app.post('/api/trips/join', async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { shortId } = await c.req.json();
  if (!shortId) return c.json({ error: 'Short ID required' }, 400);

  const db = c.env.DB;
  const trip = await db.prepare('SELECT id, title FROM trips WHERE short_id = ?').bind(shortId.toUpperCase()).first();
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
  const existingTrip = await db.prepare('SELECT id FROM trips WHERE id = ?').bind(tripId).first();
  if (existingTrip) {
    const member = await db.prepare('SELECT role FROM trip_members WHERE trip_id = ? AND user_id = ?').bind(tripId, user.sub).first();
    // Allow Owner or Editor to sync
    if (!member || (member.role !== 'OWNER' && member.role !== 'EDITOR')) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  try {
    const batch = [];

    batch.push(db.prepare(`
      INSERT INTO trips (id, short_id, title, days, start_date, end_date, cover_image, last_sync) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        short_id=excluded.short_id,
        title=excluded.title,
        days=excluded.days,
        start_date=excluded.start_date,
        end_date=excluded.end_date,
        cover_image=excluded.cover_image,
        last_sync=excluded.last_sync
    `).bind(trip.id, trip.shortId, trip.title, trip.days, trip.startDate, trip.endDate, null, Date.now()));

    // Make sure I am member if I just created it (Implicitly I am, but code ensures it)
    if (!existingTrip) {
      batch.push(db.prepare(`INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'OWNER')`).bind(tripId, user.sub));
    }

    // Clear & Re-Insert Children
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

  const trip = await c.env.DB.prepare('SELECT * FROM trips WHERE id = ?').bind(tripId).first()
  if (!trip) return c.json({ error: 'Trip not found' }, 404)

  const [items, exps, recs, notes] = await Promise.all([
    db.prepare('SELECT * FROM itinerary_items WHERE trip_id = ?').bind(tripId).all(),
    db.prepare('SELECT * FROM expenses WHERE trip_id = ?').bind(tripId).all(),
    db.prepare('SELECT * FROM recommendations WHERE trip_id = ? ORDER BY sort_order').bind(tripId).all(),
    db.prepare('SELECT * FROM notes WHERE trip_id = ? ORDER BY sort_order').bind(tripId).all()
  ]);

  return c.json({
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
  const trip = await db.prepare('SELECT * FROM trips WHERE short_id = ?').bind(shortId).first();
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
      participants: [],
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

app.get('/', (c) => c.json({ message: 'Trip Planner API v3 (Auth Enabled)' }));

export default app
