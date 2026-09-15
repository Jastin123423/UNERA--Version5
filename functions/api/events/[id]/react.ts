import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../../utils/createNotification";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeType = (v: any) => String(v || "like").toLowerCase();

const ALLOWED = [
  "like","love","haha","wow","sad","angry",
  "fire","party","clap","star","thinking",
  "crying","heart_eyes","kiss","sunglasses",
  "rocket","trophy","crown"
];

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const eventId = toNum((params as any)?.id, 0);
    const body = await request.json().catch(() => ({}));

    const headerUserId = toNum(request.headers.get("x-user-id"), 0);
    const bodyUserId = toNum(body.user_id, 0);
    const userId = headerUserId || bodyUserId;

    const type = normalizeType(body.type);

    if (!eventId) return json({ error: "Invalid event id" }, 400);
    if (!userId) return json({ error: "user_id required" }, 400);
    if (!ALLOWED.includes(type)) return json({ error: "Invalid reaction" }, 400);

    // Ensure event exists
    const event = await env.DB.prepare(
      `SELECT id, user_id FROM events WHERE id=? LIMIT 1`
    ).bind(eventId).first();

    if (!event) return json({ error: "Event not found" }, 404);

    // Check existing
    const existing = await env.DB.prepare(
      `SELECT id, type FROM event_reactions WHERE event_id=? AND user_id=?`
    ).bind(eventId, userId).first();

    let reacted = false;
    let finalType: string | null = null;

    if (existing?.id) {
      const prev = normalizeType(existing.type);

      if (prev === type) {
        // toggle OFF
        await env.DB.prepare(
          `DELETE FROM event_reactions WHERE event_id=? AND user_id=?`
        ).bind(eventId, userId).run();

        reacted = false;
        finalType = null;
      } else {
        // update
        await env.DB.prepare(
          `UPDATE event_reactions SET type=?, created_at=datetime('now') WHERE id=?`
        ).bind(type, existing.id).run();

        reacted = true;
        finalType = type;
      }
    } else {
      // insert
      await env.DB.prepare(
        `INSERT INTO event_reactions (event_id, user_id, type) VALUES (?, ?, ?)`
      ).bind(eventId, userId, type).run();

      reacted = true;
      finalType = type;

      // 🔔 NOTIFICATION
      await createNotification(
        env,
        event.user_id,
        userId,
        "reaction",
        "event",
        eventId,
        `event:${eventId}:reaction`,
        "reacted to your event"
      );
    }

    // Count
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) c FROM event_reactions WHERE event_id=?`
    ).bind(eventId).first();

    // Breakdown
    const { results } = await env.DB.prepare(`
      SELECT type, COUNT(*) as count
      FROM event_reactions
      WHERE event_id=?
      GROUP BY type
      ORDER BY count DESC
    `).bind(eventId).all();

    return json({
      success: true,
      reacted,
      type: finalType,
      reactions_count: Number(countRow?.c || 0),
      reactions_breakdown: results || []
    });

  } catch (err: any) {
    return json({ error: err?.message || "Server error" }, 500);
  }
};
