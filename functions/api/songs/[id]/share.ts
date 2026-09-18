import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../utils/createNotification";

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
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toText = (v: any, fallback = "") =>
  typeof v === "string" ? v.trim() : fallback;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.DB) {
      return json({ success: false, error: "DB binding missing (DB)" }, 500);
    }

    const body = await request.json().catch(() => ({} as any));

    const headerUserId = toNum(request.headers.get("x-user-id"), 0);
    const bodyUserId = toNum(body.user_id, 0);
    const userId = headerUserId || bodyUserId || 0;

    const songId = toNum(body.song_id, 0);
    const destination = toText(body.destination, "feed").toLowerCase() || "feed";
    const itemType = toText(body.item_type, "music").toLowerCase() || "music";
    const sharedAt = toText(body.shared_at);
    const message = toText(body.message) || null;

    if (!songId) {
      return json({ success: false, error: "song_id missing" }, 400);
    }

    if (!userId) {
      return json({ success: false, error: "user_id missing" }, 400);
    }

    const song = await env.DB.prepare(
      `SELECT id, user_id
       FROM songs
       WHERE id = ?
       LIMIT 1`
    ).bind(songId).first();

    if (!song) {
      return json({ success: false, error: "Song not found" }, 404);
    }

    const songOwnerId = toNum((song as any)?.user_id, 0);

    const ins = await env.DB.prepare(
      `
      INSERT INTO song_shares (
        song_id,
        user_id,
        destination,
        item_type,
        shared_at,
        message
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `
    ).bind(
      songId,
      userId,
      destination,
      itemType || "music",
      sharedAt || null,
      message
    ).run();

    const shareId = toNum(ins.meta?.last_row_id, 0);

    const share = await env.DB.prepare(
      `
      SELECT
        id,
        song_id,
        user_id,
        destination,
        item_type,
        shared_at,
        message
      FROM song_shares
      WHERE id = ?
      LIMIT 1
      `
    ).bind(shareId).first();

    await createNotification(
      env,
      songOwnerId,
      userId,
      "share",
      "song",
      songId,
      `song:${songId}:share`,
      "shared your song"
    );

    const countRow = await env.DB.prepare(
      `
      SELECT COUNT(*) AS shares_count
      FROM song_shares
      WHERE song_id = ?
      `
    ).bind(songId).first();

    return json({
      success: true,
      share: share ?? null,
      shares_count: toNum((countRow as any)?.shares_count, 0),
    });
  } catch (err: any) {
    return json(
      { success: false, error: err?.message || "Failed to share song" },
      500
    );
  }
};
