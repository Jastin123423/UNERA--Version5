

import type { PagesFunction } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const product_id = Number((params as any)?.id);
  const url = new URL(request.url);
  const viewerId = url.searchParams.get("viewerId") ? Number(url.searchParams.get("viewerId")) : null;

  if (!product_id) {
    return Response.json({ error: "Product ID required" }, { headers: cors });
  }

  // Get all top-level comments with their replies
  const comments = await env.DB.prepare(`
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
      CASE WHEN ? IS NOT NULL THEN 
        EXISTS(SELECT 1 FROM product_comment_likes WHERE comment_id = pc.id AND user_id = ?)
        ELSE 0 END as liked_by_me,
      (SELECT COUNT(*) FROM product_comments WHERE parent_comment_id = pc.id) as replies_count
    FROM product_comments pc
    JOIN users ON users.id = pc.user_id
    WHERE pc.product_id = ? AND pc.parent_comment_id IS NULL
    ORDER BY pc.created_at DESC
  `)
    .bind(viewerId, viewerId, product_id)
    .all();

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(
    comments.results.map(async (comment) => {
      const replies = await env.DB.prepare(`
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
          CASE WHEN ? IS NOT NULL THEN 
            EXISTS(SELECT 1 FROM product_comment_likes WHERE comment_id = pc.id AND user_id = ?)
            ELSE 0 END as liked_by_me
        FROM product_comments pc
        JOIN users ON users.id = pc.user_id
        WHERE pc.parent_comment_id = ?
        ORDER BY pc.created_at ASC
      `)
        .bind(viewerId, viewerId, comment.id)
        .all();

      return {
        ...comment,
        liked_by_me: Boolean(comment.liked_by_me),
        replies: replies.results.map(r => ({
          ...r,
          liked_by_me: Boolean(r.liked_by_me)
        }))
      };
    })
  );

  return Response.json({
    success: true,
    comments: commentsWithReplies
  }, { headers: cors });
};
