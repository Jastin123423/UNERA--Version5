// functions/api/events.ts
import type { PagesFunction } from "@cloudflare/workers-types";
import { withNewContentId } from "../utils/ids";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const str = (v: any) => String(v ?? "").trim();

// Helper to parse numeric group ID from path
const getGroupIdFromPath = (path: string): number | null => {
  const match = path.match(/\/api\/groups\/(\d+)\/events$/);
  return match ? parseInt(match[1], 10) : null;
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  if (method === "GET" && path === "/api/events") return handleGetAllEvents(env);

  if (method === "GET" && path.match(/^\/api\/groups\/\d+\/events$/)) {
    const groupId = getGroupIdFromPath(path);
    if (!groupId) return json({ success: false, error: "Invalid group ID" }, 400);
    return handleGetGroupEvents(env, groupId);
  }

  if (method === "POST" && path === "/api/events") return handleCreateEvent(request, env);

  if (method === "POST" && path.match(/^\/api\/groups\/\d+\/events$/)) {
    const groupId = getGroupIdFromPath(path);
    if (!groupId) return json({ success: false, error: "Invalid group ID" }, 400);
    return handleCreateGroupEvent(request, env, groupId);
  }

  return json({ success: false, error: "Not found" }, 404);
};

async function handleGetAllEvents(env: Env) {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const events = await env.DB.prepare(
      `SELECT e.*
       FROM events e
       ORDER BY e.event_date DESC, e.id DESC
       LIMIT 200`
    ).all();

    const list = (events.results || []) as any[];
    const eventIds = list.map((e) => Number(e.id)).filter(Boolean);
    if (!eventIds.length) return json({ success: true, events: [] });

    const idPlaceholders = eventIds.map(() => "?").join(",");

    const attendeesRows = await env.DB.prepare(
      `SELECT event_id, user_id FROM event_attendees WHERE event_id IN (${idPlaceholders})`
    ).bind(...eventIds).all();

    const interestedRows = await env.DB.prepare(
      `SELECT event_id, user_id FROM event_interested WHERE event_id IN (${idPlaceholders})`
    ).bind(...eventIds).all();

    const attendeesMap = new Map<number, number[]>();
    for (const r of (attendeesRows.results || []) as any[]) {
      const eid = Number(r.event_id);
      const uid = Number(r.user_id);
      if (!attendeesMap.has(eid)) attendeesMap.set(eid, []);
      attendeesMap.get(eid)!.push(uid);
    }

    const interestedMap = new Map<number, number[]>();
    for (const r of (interestedRows.results || []) as any[]) {
      const eid = Number(r.event_id);
      const uid = Number(r.user_id);
      if (!interestedMap.has(eid)) interestedMap.set(eid, []);
      interestedMap.get(eid)!.push(uid);
    }

    const hydrated = list.map((e) => ({
      ...e,
      attendees: attendeesMap.get(Number(e.id)) || [],
      interested_ids: interestedMap.get(Number(e.id)) || [],
      organizerId: e.creator_id,
      date: e.event_date,
      image: e.cover_url,
    }));

    return json({ success: true, events: hydrated });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Failed to load events" }, 500);
  }
}

async function handleGetGroupEvents(env: Env, groupId: number) {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const events = await env.DB.prepare(
      `SELECT e.*
       FROM events e
       WHERE e.group_id = ?
       ORDER BY e.event_date DESC, e.id DESC
       LIMIT 200`
    ).bind(groupId).all();

    const list = (events.results || []) as any[];
    const eventIds = list.map((e) => Number(e.id)).filter(Boolean);
    if (!eventIds.length) return json({ success: true, events: [] });

    const idPlaceholders = eventIds.map(() => "?").join(",");

    const attendeesRows = await env.DB.prepare(
      `SELECT event_id, user_id FROM event_attendees WHERE event_id IN (${idPlaceholders})`
    ).bind(...eventIds).all();

    const interestedRows = await env.DB.prepare(
      `SELECT event_id, user_id FROM event_interested WHERE event_id IN (${idPlaceholders})`
    ).bind(...eventIds).all();

    const attendeesMap = new Map<number, number[]>();
    for (const r of (attendeesRows.results || []) as any[]) {
      const eid = Number(r.event_id);
      const uid = Number(r.user_id);
      if (!attendeesMap.has(eid)) attendeesMap.set(eid, []);
      attendeesMap.get(eid)!.push(uid);
    }

    const interestedMap = new Map<number, number[]>();
    for (const r of (interestedRows.results || []) as any[]) {
      const eid = Number(r.event_id);
      const uid = Number(r.user_id);
      if (!interestedMap.has(eid)) interestedMap.set(eid, []);
      interestedMap.get(eid)!.push(uid);
    }

    const hydrated = list.map((e) => ({
      ...e,
      attendees: attendeesMap.get(Number(e.id)) || [],
      interested_ids: interestedMap.get(Number(e.id)) || [],
      organizerId: e.creator_id,
      date: e.event_date,
      image: e.cover_url,
    }));

    return json({ success: true, events: hydrated });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Failed to load group events" }, 500);
  }
}

async function handleCreateEvent(request: Request, env: Env) {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const body = await request.json().catch(() => ({}));
    const creator_id = Number(body.creator_id ?? body.organizerId ?? body.user_id ?? 0);

    const title = str(body.title);
    const description = str(body.description);
    const event_date = str(body.event_date ?? body.date);
    const location = str(body.location);
    const cover_url = str(body.cover_url ?? body.image ?? body.cover_image ?? "");
    const visibility = str(body.visibility || "worldwide") || "worldwide";
    const group_id = body.group_id != null ? Number(body.group_id) : null;

    if (!creator_id) return json({ success: false, error: "creator_id missing" }, 400);
    if (!title) return json({ success: false, error: "title missing" }, 400);
    if (!event_date) return json({ success: false, error: "event_date missing" }, 400);

    const created_at = new Date().toISOString();

    // ─────────────────────────────────────────────────────────
    // Columns (10): id, creator_id, title, description, event_date,
    //               location, cover_url, visibility, group_id, created_at
    // Placeholders (10): ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    // Bind args (10):    id + 9 original
    // ─────────────────────────────────────────────────────────
    const { id } = await withNewContentId(async (id) => {
      return await env.DB.prepare(
        `INSERT INTO events
           (id, creator_id, title, description, event_date,
            location, cover_url, visibility, group_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          creator_id,
          title,
          description,
          event_date,
          location,
          cover_url,
          visibility,
          group_id,
          created_at
        )
        .run();
    });

    const row = await env.DB.prepare(`SELECT * FROM events WHERE id=?`).bind(id).first();

    return json({
      success: true,
      event: {
        ...(row as any),
        attendees: [],
        interested_ids: [],
        organizerId: (row as any).creator_id,
        date: (row as any).event_date,
        image: (row as any).cover_url,
      },
    });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Failed to create event" }, 500);
  }
}

async function handleCreateGroupEvent(request: Request, env: Env, groupId: number) {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const body = await request.json().catch(() => ({}));
    const creator_id = Number(body.creator_id ?? body.organizerId ?? body.user_id ?? 0);

    const title = str(body.title);
    const description = str(body.description);
    const event_date = str(body.event_date ?? body.date);
    const location = str(body.location);
    const cover_url = str(body.cover_url ?? body.image ?? body.cover_image ?? "");
    const visibility = str(body.visibility || "worldwide") || "worldwide";

    if (!creator_id) return json({ success: false, error: "creator_id missing" }, 400);
    if (!title) return json({ success: false, error: "title missing" }, 400);
    if (!event_date) return json({ success: false, error: "event_date missing" }, 400);

    const created_at = new Date().toISOString();

    // Same column/placeholder arithmetic as handleCreateEvent:
    // 10 columns / 10 placeholders / 10 bind args
    const { id } = await withNewContentId(async (id) => {
      return await env.DB.prepare(
        `INSERT INTO events
           (id, creator_id, title, description, event_date,
            location, cover_url, visibility, group_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          creator_id,
          title,
          description,
          event_date,
          location,
          cover_url,
          visibility,
          groupId,
          created_at
        )
        .run();
    });

    const row = await env.DB.prepare(`SELECT * FROM events WHERE id=?`).bind(id).first();

    return json({
      success: true,
      event: {
        ...(row as any),
        attendees: [],
        interested_ids: [],
        organizerId: (row as any).creator_id,
        date: (row as any).event_date,
        image: (row as any).cover_url,
      },
    });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Failed to create group event" }, 500);
  }
}
