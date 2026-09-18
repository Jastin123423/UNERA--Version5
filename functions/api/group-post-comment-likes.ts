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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env?.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const body: any = await request.json().catch(() => ({}));

    const headerUserId = toNum(request.headers.get("x-user-id"), 0);
    const bodyUserId = toNum(body.user_id, 0);
    const userId = headerUserId || bodyUserId || 0;
    const commentId = toNum(body.comment_id, 0);

    if (!userId || !commentId) {
      return json({ success: false, error: "user_id and comment_id are required" }, 400);
    }

    // Confirm comment exists
    const comment = await env.DB
      .prepare(`SELECT id FROM group_post_comments WHERE id = ? LIMIT 1`)
      .bind(commentId)
      .first();

    if (!comment) {
      return json({ success: false, error: "Comment not found" }, 404);
    }

    const existing = await env.DB
      .prepare(`SELECT id FROM group_post_comment_likes WHERE comment_id = ? AND user_id = ? LIMIT 1`)
      .bind(commentId, userId)
      .first<any>();

    let liked = false;

    if (existing?.id) {
      await env.DB
        .prepare(`DELETE FROM group_post_comment_likes WHERE comment_id = ? AND user_id = ?`)
        .bind(commentId, userId)
        .run();
      liked = false;
    } else {
      await env.DB
        .prepare(`INSERT INTO group_post_comment_likes (comment_id, user_id) VALUES (?, ?)`)
        .bind(commentId, userId)
        .run();
      liked = true;
    }

    const count = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM group_post_comment_likes WHERE comment_id = ?`)
      .bind(commentId)
      .first<{ c: number }>();

    return json({
      success: true,
      comment_id: commentId,
      liked,
      likes_count: Number(count?.c ?? 0),
    });
  } catch (err: any) {
    return json(
      { success: false, error: err?.message || "Failed to like comment" },
      500
    );
  }
};
