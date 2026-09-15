import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../../utils/createNotification";

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

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing (DB)" }, 500);

    const eventId = toNum((params as any)?.id, 0);
    if (!eventId) return json({ success: false, error: "Invalid event id" }, 400);

    const body = await request.json().catch(() => ({} as any));
    const headerUserId = toNum(request.headers.get("x-user-id"), 0);
    const bodyUserId = toNum(body.user_id, 0);
    const userId = headerUserId || bodyUserId || 0;

    if (!userId) return json({ success: false, error: "user_id missing" }, 400);

    const action = String(body.action ?? "interested").trim().toLowerCase(); // interested | remove

    const event = await env.DB.prepare(
      `SELECT id, user_id
       FROM events
       WHERE id = ?
       LIMIT 1`
    ).bind(eventId).first();

    if (!event) {
      return json({ success: false, error: "Event not found" }, 404);
    }

    const eventOwnerId = toNum((event as any)?.user_id, 0);

    if (action === "remove") {
      await env.DB.prepare(
        `DELETE FROM event_interested WHERE event_id=? AND user_id=?`
      ).bind(eventId, userId).run();
    } else {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO event_interested (event_id, user_id) VALUES (?, ?)`
      ).bind(eventId, userId).run();

      await env.DB.prepare(
        `DELETE FROM event_attendees WHERE event_id=? AND user_id=?`
      ).bind(eventId, userId).run();

      await createNotification(
        env,
        eventOwnerId,
        userId,
        "event",
        "event",
        eventId,
        `event:${eventId}:interested`,
        "is interested in your event"
      );
    }

    const attending = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM event_attendees WHERE event_id=?`
    ).bind(eventId).first<any>();

    const interested = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM event_interested WHERE event_id=?`
    ).bind(eventId).first<any>();

    const amGoing = await env.DB.prepare(
      `SELECT 1 as ok FROM event_attendees WHERE event_id=? AND user_id=? LIMIT 1`
    ).bind(eventId, userId).first<any>();

    const amInterested = await env.DB.prepare(
      `SELECT 1 as ok FROM event_interested WHERE event_id=? AND user_id=? LIMIT 1`
    ).bind(eventId, userId).first<any>();

    const my_rsvp_status = amGoing ? "going" : (amInterested ? "interested" : "");

    return json({
      success: true,
      event_id: eventId,
      my_rsvp_status,
      attending_count: Number(attending?.c ?? 0),
      interested_count: Number(interested?.c ?? 0),
    });
  } catch (err: any) {
    return json({ success: false, error: err?.message || "Failed to mark interested" }, 500);
  }
};
