
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Hello from Trip Planner API! V2' })
})

// --- SYNC ENDPOINT (The Core Logic) ---
// Currently, frontend sends: { trip, itinerary, expenses, recommendations, notes }
// We will replace all data for this trip ID to ensure consistency.

app.post('/api/sync', async (c) => {
  const body = await c.req.json()
  const { trip, itinerary, expenses, recommendations, notes } = body
  const tripId = trip.id;
  const db = c.env.DB;

  try {
    // Start Transaction
    const batch = [];

    // 1. Upsert Trip
    // If trip exists, update it. If not, insert it.
    // We check existence first or use INSERT OR REPLACE if we don't care about overwriting owner_id (we should care!)
    // For MVP without real auth, let's just Upsert everything.

    // Note: owner_id is needed. If we don't have auth yet, we leave it NULL or rely on existing linkage.
    // Since this is a "blind sync" from frontend, we trust the frontend state for now.

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

    // 2. Clear existing child items to avoid duplicates/orphans (Simplest Sync Strategy)
    batch.push(db.prepare('DELETE FROM itinerary_items WHERE trip_id = ?').bind(tripId));
    batch.push(db.prepare('DELETE FROM expenses WHERE trip_id = ?').bind(tripId));
    batch.push(db.prepare('DELETE FROM recommendations WHERE trip_id = ?').bind(tripId));
    batch.push(db.prepare('DELETE FROM notes WHERE trip_id = ?').bind(tripId));
    // batch.push(db.prepare('DELETE FROM images WHERE trip_id = ?').bind(tripId)); // Images detached? careful.

    // 3. Insert Itinerary
    if (itinerary && itinerary.length > 0) {
      const stmt = db.prepare(`INSERT INTO itinerary_items (id, trip_id, day_index, time, title, location, map_url, content, type, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      itinerary.forEach((item: any) => {
        batch.push(stmt.bind(item.id, tripId, item.dayIndex, item.time, item.title, item.location, item.mapUrl, item.content, item.type, item.url));
      });
    }

    // 4. Insert Expenses
    if (expenses && expenses.length > 0) {
      const stmt = db.prepare(`INSERT INTO expenses (id, trip_id, title, amount, payer, split_type, custom_splits, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      expenses.forEach((ex: any) => {
        batch.push(stmt.bind(ex.id, tripId, ex.title, ex.amount, ex.payer, ex.splitType, JSON.stringify(ex.customSplits), ex.date));
      });
    }

    // 5. Insert Recommendations
    if (recommendations && recommendations.length > 0) {
      const stmt = db.prepare(`INSERT INTO recommendations (id, trip_id, title, content, type, url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      recommendations.forEach((rec: any) => {
        batch.push(stmt.bind(rec.id, tripId, rec.title, rec.content, rec.type, rec.url, rec.order));
        // TODO: Handle rec.images -> insert into images table
      });
    }

    // 6. Insert Notes
    if (notes && notes.length > 0) {
      const stmt = db.prepare(`INSERT INTO notes (id, trip_id, title, content, type, url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      notes.forEach((note: any) => {
        batch.push(stmt.bind(note.id, tripId, note.title, note.content, note.type, note.url, note.order));
        // TODO: Handle note.images -> insert into images table
      });
    }

    await db.batch(batch);
    return c.json({ success: true, message: 'Synced successfully' });

  } catch (err: any) {
    console.error(err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// --- IMPORT TRIP (By Short ID) ---
app.get('/api/trip/:shortId', async (c) => {
  const shortId = c.req.param('shortId').toUpperCase();
  const db = c.env.DB;

  // 1. Get Trip
  const trip = await db.prepare('SELECT * FROM trips WHERE short_id = ?').bind(shortId).first();
  if (!trip) return c.json({ error: 'Trip not found' }, 404);

  // Map snake_case to camelCase for Frontend
  const mappedTrip = {
    id: trip.id,
    shortId: trip.short_id,
    title: trip.title,
    days: trip.days,
    participants: [], // TODO: fetch from trip_members if we implemented that
    startDate: trip.start_date,
    endDate: trip.end_date,
    lastSync: trip.last_sync
  };

  const tripId = trip.id;

  // 2. Fetch all children
  const [items, exps, recs, notes] = await Promise.all([
    db.prepare('SELECT * FROM itinerary_items WHERE trip_id = ?').bind(tripId).all(),
    db.prepare('SELECT * FROM expenses WHERE trip_id = ?').bind(tripId).all(),
    db.prepare('SELECT * FROM recommendations WHERE trip_id = ? ORDER BY sort_order').bind(tripId).all(),
    db.prepare('SELECT * FROM notes WHERE trip_id = ? ORDER BY sort_order').bind(tripId).all()
  ]);

  // Map children
  const mappedItems = items.results.map((i: any) => ({
    id: i.id, tripId, dayIndex: i.day_index, time: i.time, title: i.title, location: i.location, mapUrl: i.map_url, content: i.content, type: i.type, url: i.url
  }));

  const mappedExpenses = exps.results.map((e: any) => ({
    id: e.id, tripId, title: e.title, amount: e.amount, payer: e.payer, splitType: e.split_type, customSplits: JSON.parse(e.custom_splits || '{}'), date: e.date
  }));

  const mappedRecs = recs.results.map((r: any) => ({
    id: r.id, tripId, title: r.title, content: r.content, type: r.type, url: r.url, order: r.sort_order, images: [] // TODO fetch images
  }));

  const mappedNotes = notes.results.map((n: any) => ({
    id: n.id, tripId, title: n.title, content: n.content, type: n.type, url: n.url, order: n.sort_order, images: [] // TODO fetch images
  }));

  return c.json({
    trip: mappedTrip,
    itinerary: mappedItems,
    expenses: mappedExpenses,
    recommendations: mappedRecs,
    notes: mappedNotes
  });
});

export default app
