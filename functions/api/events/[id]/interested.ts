import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../utils/createNotification";

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

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const toInt = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: any) => String(v ?? "").trim();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing (DB)" }, 500);

    const body: any = await request.json().catch(() => ({}));

    const headerUserId = toInt(request.headers.get("x-user-id"), 0);
    const bodyUserId = toInt(body.user_id, 0);
    const userId = headerUserId || bodyUserId || 0;

    const eventId = toInt(body.event_id, 0);
    const rawAction = str(body.action || "add").toLowerCase();

    const isAdd = ["add", "interested", "attend"].includes(rawAction);
    const isRemove = ["remove", "cancel", "uninterested"].includes(rawAction);

    if (!eventId) return json({ success: false, error: "event_id missing" }, 400);
    if (!userId)  return json({ success: false, error: "user_id missing" }, 400);
    if (!isAdd && !isRemove) {
      return json({ success: false, error: "Invalid action" }, 400);
    }

    // ✅ creator_id (not user_id)
    const event = await env.DB
      .prepare(`SELECT id, creator_id FROM events WHERE id = ? LIMIT 1`)
      .bind(eventId)
      .first<any>();

    if (!event) return json({ success: false, error: "Event not found" }, 404);

    const eventOwnerId = toInt(event.creator_id, 0);

    if (isAdd) {
      // Was the user already interested?
      const already = await env.DB
        .prepare(`SELECT 1 AS ok FROM event_interested WHERE event_id=? AND user_id=? LIMIT 1`)
        .bind(eventId, userId)
        .first<{ ok: number }>();

      if (!already) {
        await env.DB
          .prepare(`INSERT INTO event_interested (event_id, user_id) VALUES (?, ?)`)
          .bind(eventId, userId)
          .run();

        // mutual exclusion: interested removes going
        await env.DB
          .prepare(`DELETE FROM event_attendees WHERE event_id=? AND user_id=?`)
          .bind(eventId, userId)
          .run();

        // notify only on first-time interest, never self
        if (eventOwnerId && eventOwnerId !== userId) {
          try {
            await createNotification(
              env,
              eventOwnerId,
              userId,
              "interested",
              "event",
              eventId,
              `event:${eventId}:interested`,
              "marked interested in your event"
            );
          } catch (_) {}
        }
      }
    } else {
      await env.DB
        .prepare(`DELETE FROM event_interested WHERE event_id=? AND user_id=?`)
        .bind(eventId, userId)
        .run();
    }

    const attendingRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM event_attendees WHERE event_id=?`)
      .bind(eventId)
      .first<{ c: number }>();

    const interestedRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM event_interested WHERE event_id=?`)
      .bind(eventId)
      .first<{ c: number }>();

    const isGoing = await env.DB
      .prepare(`SELECT 1 AS ok FROM event_attendees WHERE event_id=? AND user_id=? LIMIT 1`)
      .bind(eventId, userId)
      .first();

    const isInterested = await env.DB
      .prepare(`SELECT 1 AS ok FROM event_interested WHERE event_id=? AND user_id=? LIMIT 1`)
      .bind(eventId, userId)
      .first();

    const my_status = isGoing ? "going" : (isInterested ? "interested" : "");

    return json({
      success: true,
      event_id: eventId,
      attending_count: Number(attendingRow?.c ?? 0),
      interested_count: Number(interestedRow?.c ?? 0),
      my_status,
    });
  } catch (err: any) {
    return json(
      { success: false, error: err?.message || "Failed to mark interested" },
      500
    );
  }
};
