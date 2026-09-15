

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
  const product_id = Number((params as any)?.id);
  const body = await request.json();
  const user_id = Number(body.user_id);
  const text = String(body.text || "").trim();
  const parent_comment_id = body.parent_comment_id ? Number(body.parent_comment_id) : null;

  if (!product_id || !user_id || !text) {
    return Response.json({ error: "Invalid data" }, { headers: cors });
  }

  // Insert comment/review
  const result = await env.DB.prepare(`
    INSERT INTO product_comments (product_id, user_id, parent_comment_id, text)
    VALUES (?, ?, ?, ?)
    RETURNING id
  `)
    .bind(product_id, user_id, parent_comment_id, text)
    .first();

  // Increment comments count
  await env.DB.prepare(`
    UPDATE products 
    SET comments_count = comments_count + 1 
    WHERE id = ?
  `)
    .bind(product_id)
    .run();

  // Get product owner for notification
  const product = await env.DB.prepare(`
    SELECT seller_id FROM products WHERE id = ?
  `)
    .bind(product_id)
    .first();

  // Notify product owner (if not self)
  if (product && product.seller_id !== user_id) {
    await createNotification(
      env,
      product.seller_id,     // recipient_id
      user_id,               // actor_id
      "comment",             // type
      "product",             // entity_type
      product_id,            // entity_id
      `comment_product_${product_id}`  // group_key
    );
  }

  // If reply, notify original comment author
  if (parent_comment_id) {
    const parentComment = await env.DB.prepare(`
      SELECT user_id FROM product_comments WHERE id = ?
    `)
      .bind(parent_comment_id)
      .first();

    if (parentComment && parentComment.user_id !== user_id) {
      await createNotification(
        env,
        parentComment.user_id,     // recipient_id
        user_id,                   // actor_id
        "reply",                   // type
        "product_comment",         // entity_type
        parent_comment_id,         // entity_id
        `reply_comment_${parent_comment_id}`  // group_key
      );
    }
  }

  // Get full comment with user details
  const comment = await env.DB.prepare(`
    SELECT 
      pc.id,
      pc.user_id,
      pc.text,
      pc.parent_comment_id,
      pc.created_at,
      pc.likes_count,
      users.name as author_name,
      users.username as author_username,
      users.profile_image_url as author_image,
      0 as liked_by_me
    FROM product_comments pc
    JOIN users ON users.id = pc.user_id
    WHERE pc.id = ?
  `)
    .bind(result.id)
    .first();

  return Response.json({
    success: true,
    comment
  }, { headers: cors });
};
