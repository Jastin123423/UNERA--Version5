import type { PagesFunction } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const json = (data: any, status = 200) =>
  Response.json(data, { status, headers: cors });

const toInt = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const normType = (v: any) => String(v ?? "like").trim().toLowerCase() || "like";

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
    const post_id = toInt((params as any)?.id);
    if (!post_id) return json({ success: false, error: "Invalid post id" }, 400);

    const url = new URL(request.url);
    const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 100), 1), 500);
    const offset = Math.max(toInt(url.searchParams.get("offset"), 0), 0);

    // List reactions + user info (if your users table has these columns)
    const list = await env.DB.prepare(
      `
      SELECT
        pr.user_id,
        pr.type,
        pr.created_at,
        u.id as id,
        u.name as name,
        u.username as username,
        u.profile_image_url as profile_image_url
      FROM post_reactions pr
      LEFT JOIN users u ON u.id = pr.user_id
      WHERE pr.post_id = ?
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
      `
    )
      .bind(post_id, limit, offset)
      .all();

    const reactions = (list?.results || []).map((r: any) => ({
      user_id: toInt(r.user_id),
      type: normType(r.type),
      created_at: r.created_at,
      user: r.id
        ? {
            id: toInt(r.id),
            name: String(r.name ?? ""),
            username: String(r.username ?? ""),
            profile_image_url: r.profile_image_url ? String(r.profile_image_url) : null,
          }
        : null,
    }));

    // Total count (for your UI count)
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM post_reactions WHERE post_id = ?`
    )
      .bind(post_id)
      .first();

    const reactions_count = toInt((countRow as any)?.c);

    return json({
      success: true,
      post_id,
      reactions_count,
      reactions,
      limit,
      offset,
    });
  } catch (e: any) {
    return json({ success: false, error: e?.message || "Failed to load reactions" }, 500);
  }
};
