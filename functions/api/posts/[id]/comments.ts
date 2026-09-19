// functions/api/posts/[id]/comments.ts
import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../../utils/createNotification";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
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

const toIntOrNull = (v: any) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.startsWith("tmp-")) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const postId = toInt((params as any)?.id, 0);
    if (!postId) return json({ error: "Invalid post id" }, 400);

    const url = new URL(request.url);
    const viewerId = toInt(url.searchParams.get("viewerId"), 0);

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

    const { results } = await env.DB.prepare(q).bind(viewerId || 0, postId).all();

    return json(Array.isArray(results) ? results : []);
  } catch (err: any) {
    return json({ error: "Backend crash", message: String(err?.message ?? err) }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const postId = toInt((params as any)?.id, 0);
    if (!postId) return json({ error: "Invalid post id" }, 400);

    const body = await request.json().catch(() => ({}));
    const text = String(body.text ?? "").trim();
    const headerUserId = toInt(request.headers.get("x-user-id"), 0);
    const bodyUserId = toInt(body.user_id, 0);
    const userId = headerUserId || bodyUserId || 0;

    const parentCommentId = toIntOrNull(body.parent_comment_id);

    if (!text) return json({ error: "text is required" }, 400);
    if (!userId) return json({ error: "user_id is required" }, 400);

    const post: any = await env.DB.prepare(
      `SELECT id, user_id, content FROM posts WHERE id = ? LIMIT 1`
    ).bind(postId).first();

    if (!post) {
      return json({ error: "Post not found" }, 404);
    }

    if (parentCommentId) {
      const parentComment: any = await env.DB.prepare(
        `SELECT id, post_id, user_id FROM post_comments WHERE id = ? LIMIT 1`
      ).bind(parentCommentId).first();

      if (!parentComment) return json({ error: "Parent comment not found" }, 400);
      if (Number(parentComment.post_id) !== postId) {
        return json({ error: "Parent comment does not belong to this post" }, 400);
      }
    }

    const insert = await env.DB.prepare(
      `INSERT INTO post_comments (post_id, user_id, text, parent_comment_id)
       VALUES (?, ?, ?, ?)`
    )
      .bind(postId, userId, text, parentCommentId)
      .run();

    const insertedId = Number(insert.meta?.last_row_id);
    if (!insertedId) {
      return json({ error: "Failed to create comment" }, 500);
    }

    const postOwnerId = toInt(post?.user_id, 0);
    if (parentCommentId) {
      await createNotification(
        env,
        postOwnerId,
        userId,
        "reply",
        "comment",
        parentCommentId,
        `post_comment:${parentCommentId}:reply`,
        "replied in Discuss"
      );
    } else if (postOwnerId && postOwnerId !== userId) {
      await createNotification(
        env,
        postOwnerId,
        userId,
        "discuss",
        "post",
        postId,
        `post:${postId}:discuss`,
        "discussed your post"
      );
    }

    const comment = await env.DB.prepare(
      `SELECT
          pc.id,
          pc.post_id,
          pc.user_id,
          pc.text,
          pc.created_at,
          pc.parent_comment_id,
          u.username as author_name,
          u.profile_image_url as author_image
       FROM post_comments pc
       LEFT JOIN users u ON u.id = pc.user_id
       WHERE pc.id = ?`
    )
      .bind(insertedId)
      .first();

    return json({ success: true, comment: comment ?? null }, 201);
  } catch (err: any) {
    return json({ error: "Backend crash", message: String(err?.message ?? err) }, 500);
  }
};

