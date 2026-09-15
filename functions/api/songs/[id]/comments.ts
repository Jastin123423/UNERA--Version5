import type { PagesFunction } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
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

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    if (!env.DB) {
      return json({ success: false, error: "DB binding missing (DB)" }, 500);
    }

    const songId = toNum((params as any)?.id, 0);
    const url = new URL(request.url);

    const viewerId =
      toNum(request.headers.get("x-user-id"), 0) ||
      toNum(url.searchParams.get("viewerId"), 0);

    if (!songId) {
      return json({ success: false, error: "Invalid song id" }, 400);
    }

    const song = await env.DB.prepare(
      `SELECT id FROM songs WHERE id = ? LIMIT 1`
    ).bind(songId).first();

    if (!song) {
      return json({ success: false, error: "Song not found" }, 404);
    }

    const { results } = await env.DB.prepare(
      `
      SELECT
        sc.id,
        sc.song_id,
        sc.user_id,
        sc.parent_comment_id,
        sc.text,
        sc.image_url,
        sc.created_at,
        sc.updated_at,

        u.name,
        u.username,
        u.profile_image_url,
        u.role,
        u.is_verified,

        (
          SELECT COUNT(*)
          FROM song_comment_likes scl
          WHERE scl.comment_id = sc.id
        ) AS likes_count,

        (
          SELECT COUNT(*)
          FROM song_comments child
          WHERE child.parent_comment_id = sc.id
            AND COALESCE(child.is_deleted, 0) = 0
        ) AS replies_count,

        CASE
          WHEN ? > 0 AND EXISTS (
            SELECT 1
            FROM song_comment_likes mine
            WHERE mine.comment_id = sc.id
              AND mine.user_id = ?
          ) THEN 1
          ELSE 0
        END AS liked_by_me

      FROM song_comments sc
      LEFT JOIN users u ON u.id = sc.user_id
      WHERE sc.song_id = ?
        AND COALESCE(sc.is_deleted, 0) = 0
      ORDER BY sc.created_at ASC, sc.id ASC
      `
    )
      .bind(viewerId, viewerId, songId)
      .all();

    return json({
      success: true,
      comments: Array.isArray(results) ? results : [],
    });
  } catch (err: any) {
    return json(
      { success: false, error: err?.message || "Failed to fetch song comments" },
      500
    );
  }
};
