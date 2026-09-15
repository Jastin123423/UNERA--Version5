// functions/api/posts/[id]/comments.ts
import type { PagesFunction } from "@cloudflare/workers-types";
type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const toInt = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const postId = toInt((params as any)?.id, 0);
    if (!postId) return json({ error: "Invalid post id" }, 400);

    const url = new URL(request.url);
    const viewerId = toInt(url.searchParams.get("viewerId"), 0); // ✅ who is viewing

    const q = `
      SELECT
        pc.id, pc.post_id, pc.user_id, pc.text, pc.created_at, pc.parent_comment_id,
        u.username as author_name, u.profile_image_url as author_image,

        (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = pc.id) AS likes_count,

        (SELECT 1
           FROM comment_likes cl
          WHERE cl.comment_id = pc.id
            AND cl.user_id = ?
          LIMIT 1
        ) AS liked_by_me

      FROM post_comments pc
      LEFT JOIN users u ON u.id = pc.user_id
      WHERE pc.post_id = ?
      ORDER BY pc.created_at ASC
    `;

    // ✅ IMPORTANT: bind viewerId first, then postId (matches the ? order)
    const { results } = await env.DB.prepare(q).bind(viewerId || 0, postId).all();

    return json(Array.isArray(results) ? results : []);
  } catch (err: any) {
    return json({ error: "Backend crash", message: String(err?.message ?? err) }, 500);
  }
};
