import type { PagesFunction } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const str = (v: any) => String(v ?? "").trim();
const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* =========================================================
   GET /api/groups/:id/event
   Returns all events for the group, hydrated with:
   - attendees / interested_ids
   - attending_count / interested_count
   - my_status (going | interested | "")
   ========================================================= */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const groupId = toNum((params as any)?.id, 0);
    if (!groupId) return json({ success: false, error: "Invalid group id" }, 400);

    const url = new URL(request.url);
    const viewerId = toNum(
      request.headers.get("x-user-id") || url.searchParams.get("viewerId") || 0,
      0
    );

    // Load events for the group
    const events = await env.DB.prepare(
      `SELECT e.*
       FROM events e
       WHERE e.group_id = ?
       ORDER BY e.event_date DESC, e.id DESC
       LIMIT 200`
    )
      .bind(groupId)
      .all();

    const list = (events.results || []) as any[];

    const eventIds = list.map((e) => Number(e.id)).filter(Boolean);
    if (!eventIds.length) return json({ success: true, events: [] });

    const idPlaceholders = eventIds.map(() => "?").join(",");

    // Attendees
    const attendeesRows = await env.DB.prepare(
      `SELECT event_id, user_id
       FROM event_attendees
       WHERE event_id IN (${idPlaceholders})`
    )
      .bind(...eventIds)
      .all();

    // Interested
    const interestedRows = await env.DB.prepare(
      `SELECT event_id, user_id
       FROM event_interested
       WHERE event_id IN (${idPlaceholders})`
    )
      .bind(...eventIds)
      .all();

    // Build maps
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

    // Hydrate
    const hydrated = list.map((e) => {
      const eid = Number(e.id);
      const attendeeIds = attendeesMap.get(eid) || [];
      const interestedIds = interestedMap.get(eid) || [];

      const isGoing = viewerId > 0 && attendeeIds.includes(viewerId);
      const isInterested = viewerId > 0 && interestedIds.includes(viewerId);

      return {
        ...e,
        attendees: attendeeIds,
        interested_ids: interestedIds,
        attending_count: attendeeIds.length,
        interested_count: interestedIds.length,
        my_status: isGoing ? "going" : isInterested ? "interested" : "",
        organizerId: e.creator_id,
        date: e.event_date,
        image: e.cover_url,
      };
    });

    return json({ success: true, events: hydrated });
  } catch (err: any) {
    return json(
      { success: false, error: err?.message || "Failed to load group events" },
      500
    );
  }
};

/* =========================================================
   POST /api/groups/:id/event
   Creates a new event inside the group.
   - Requires caller to be a member of the group
   - Validates date
   - Uses x-user-id header with body fallback
   ========================================================= */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const groupId = toNum((params as any)?.id, 0);
    if (!groupId) return json({ success: false, error: "Invalid group id" }, 400);

    const body: any = await request.json().catch(() => ({}));

    // Header first, body fallback
    const headerUserId = toNum(request.headers.get("x-user-id"), 0);
    const bodyUserId = toNum(
      body.creator_id ?? body.organizerId ?? body.user_id ?? 0,
      0
    );
    const creator_id = headerUserId || bodyUserId || 0;

    const title = str(body.title);
    const description = str(body.description);
    const event_date = str(body.event_date ?? body.date);
    const location = str(body.location);
    const cover_url = str(body.cover_url ?? body.image ?? body.cover_image ?? "");
    const visibility = str(body.visibility || "worldwide") || "worldwide";

    if (!creator_id) return json({ success: false, error: "creator_id missing" }, 400);
    if (!title) return json({ success: false, error: "title missing" }, 400);
    if (!event_date) return json({ success: false, error: "event_date missing" }, 400);

    // Validate date
    const parsedDate = Date.parse(event_date);
    if (isNaN(parsedDate)) {
      return json({ success: false, error: "Invalid event_date" }, 400);
    }

    // ✅ Must be a member of the group
    const member = await env.DB
      .prepare(`SELECT 1 FROM group_members WHERE group_id=? AND user_id=? LIMIT 1`)
      .bind(groupId, creator_id)
      .first();

    if (!member) {
      return json({ success: false, error: "Not a member of this group" }, 403);
    }

    // Confirm the group exists (defensive)
    const group = await env.DB
      .prepare(`SELECT id FROM groups WHERE id=? LIMIT 1`)
      .bind(groupId)
      .first();

    if (!group) {
      return json({ success: false, error: "Group not found" }, 404);
    }

    const created_at = new Date().toISOString();

    const ins = await env.DB.prepare(
      `INSERT INTO events
        (creator_id, title, description, event_date, location, cover_url, visibility, group_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
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

    const id = toNum(ins.meta?.last_row_id, 0);

    const row = await env.DB
      .prepare(`SELECT * FROM events WHERE id=?`)
      .bind(id)
      .first<any>();

    return json(
      {
        success: true,
        event: {
          ...(row ?? {}),
          attendees: [],
          interested_ids: [],
          attending_count: 0,
          interested_count: 0,
          my_status: "",
          organizerId: (row as any)?.creator_id ?? creator_id,
          date: (row as any)?.event_date ?? event_date,
          image: (row as any)?.cover_url ?? cover_url,
        },
      },
      201
    );
  } catch (err: any) {
    return json(
      { success: false, error: err?.message || "Failed to create group event" },
      500
    );
  }
};
