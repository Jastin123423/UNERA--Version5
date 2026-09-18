import type { PagesFunction } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

/* =========================================================
   POST /api/group-events/:id/attend
   body: { action: "attend" | "remove" }  (default: "attend")
   ========================================================= */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const eventId = toNum((params as any)?.id, 0);
    const body: any = await request.json().catch(() => ({}));

    const headerUserId = toNum(request.headers.get("x-user-id"), 0);
    const bodyUserId = toNum(body.user_id, 0);
    const userId = headerUserId || bodyUserId || 0;

    const rawAction = String(body.action ?? "attend").trim().toLowerCase();
    const isAdd = ["attend", "going", "add"].includes(rawAction);
    const isRemove = ["remove", "cancel", "not_going"].includes(rawAction);

    if (!eventId) return json({ success: false, error: "Invalid event id" }, 400);
    if (!userId)  return json({ success: false, error: "user_id missing" }, 400);
    if (!isAdd && !isRemove) {
      return json({ success: false, error: "Invalid action" }, 400);
    }

    // Event + group check
    const event = await env.DB
      .prepare(`SELECT id, group_id FROM group_events WHERE id = ? AND COALESCE(is_deleted,0)=0 LIMIT 1`)
      .bind(eventId)
      .first<any>();

    if (!event) return json({ success: false, error: "Event not found" }, 404);

    // Must be a member of the group
    const member = await env.DB
      .prepare(`SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? LIMIT 1`)
      .bind(event.group_id, userId)
      .first();

    if (!member) {
      return json({ success: false, error: "Not a member of this group" }, 403);
    }

    if (isAdd) {
      const already = await env.DB
        .prepare(`SELECT 1 AS ok FROM group_event_attendees WHERE group_event_id = ? AND user_id = ? LIMIT 1`)
        .bind(eventId, userId)
        .first<{ ok: number }>();

      if (!already) {
        await env.DB
          .prepare(`INSERT INTO group_event_attendees (group_event_id, user_id) VALUES (?, ?)`)
          .bind(eventId, userId)
          .run();

        // mutual exclusion
        await env.DB
          .prepare(`DELETE FROM group_event_interested WHERE group_event_id = ? AND user_id = ?`)
          .bind(eventId, userId)
          .run();
      }
    } else {
      await env.DB
        .prepare(`DELETE FROM group_event_attendees WHERE group_event_id = ? AND user_id = ?`)
        .bind(eventId, userId)
        .run();
    }

    const attendingRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM group_event_attendees WHERE group_event_id = ?`)
      .bind(eventId)
      .first<{ c: number }>();

    const interestedRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM group_event_interested WHERE group_event_id = ?`)
      .bind(eventId)
      .first<{ c: number }>();

    const isGoing = await env.DB
      .prepare(`SELECT 1 AS ok FROM group_event_attendees WHERE group_event_id = ? AND user_id = ? LIMIT 1`)
      .bind(eventId, userId)
      .first();

    const isInterested = await env.DB
      .prepare(`SELECT 1 AS ok FROM group_event_interested WHERE group_event_id = ? AND user_id = ? LIMIT 1`)
      .bind(eventId, userId)
      .first();

    const my_status = isGoing ? "going" : isInterested ? "interested" : "";

    return json({
      success: true,
      event_id: eventId,
      attending_count: Number(attendingRow?.c ?? 0),
      interested_count: Number(interestedRow?.c ?? 0),
      my_status,
    });
  } catch (err: any) {
    return json(
      { success: false, error: err?.message || "Failed to attend" },
      500
    );
  }
};
