import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../../utils/createNotification";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const comment_id = Number((params as any)?.id);
  const body = await request.json();
  const user_id = Number(body.user_id);

  if (!comment_id || !user_id) {
    return Response.json({ error: "Invalid data" }, { headers: cors });
  }

  // Check if like exists
  const existing = await env.DB.prepare(`
    SELECT id FROM product_comment_likes 
    WHERE comment_id = ? AND user_id = ?
  `)
    .bind(comment_id, user_id)
    .first();

  if (existing) {
    // Unlike
    await env.DB.prepare(`
      DELETE FROM product_comment_likes
      WHERE comment_id = ? AND user_id = ?
    `)
      .bind(comment_id, user_id)
      .run();

    await env.DB.prepare(`
      UPDATE product_comments 
      SET likes_count = likes_count - 1 
      WHERE id = ?
    `)
      .bind(comment_id)
      .run();

  } else {
    // Like
    await env.DB.prepare(`
      INSERT INTO product_comment_likes (comment_id, user_id)
      VALUES (?, ?)
    `)
      .bind(comment_id, user_id)
      .run();

    await env.DB.prepare(`
      UPDATE product_comments 
      SET likes_count = likes_count + 1 
      WHERE id = ?
    `)
      .bind(comment_id)
      .run();

    // Get comment author for notification
    const comment = await env.DB.prepare(`
      SELECT user_id FROM product_comments WHERE id = ?
    `)
      .bind(comment_id)
      .first();

    if (comment && comment.user_id !== user_id) {
      await createNotification(
        env,
        comment.user_id,        // recipient_id
        user_id,                // actor_id
        "like",                 // type
        "product_comment",      // entity_type
        comment_id,             // entity_id
        `like_comment_${comment_id}`  // group_key
      );
    }
  }

  // Get updated like count
  const count = await env.DB.prepare(`
    SELECT likes_count FROM product_comments WHERE id = ?
  `)
    .bind(comment_id)
    .first();

  return Response.json({
    success: true,
    likes_count: count.likes_count
  }, { headers: cors });
};
