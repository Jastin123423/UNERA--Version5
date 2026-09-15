import type { PagesFunction } from "@cloudflare/workers-types";
import { cors, ok, bad, server } from "./_cors";
import { createNotification } from "../utils/createNotification";

type Env = { DB: D1Database };

const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

// CREATE comment
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json().catch(() => ({} as any));
    const headerUserId = toNum(request.headers.get("x-user-id"), 0);
    const bodyUserId = toNum(body.user_id, 0);
    const user_id = headerUserId || bodyUserId || 0;

    const post_id = toNum(body.post_id, 0);
    const parent_comment_id =
      body.parent_comment_id == null ? null : toNum(body.parent_comment_id, 0);
    const text = String(body.text || "").trim();

    if (!user_id || !post_id || !text) {
      return bad("user_id, post_id, text are required");
    }

    // Ensure group post exists and get owner
    const post = await env.DB.prepare(
      `SELECT id, group_id, user_id
       FROM group_posts
       WHERE id = ?
       LIMIT 1`
    )
      .bind(post_id)
      .first();

    if (!post?.group_id) return bad("Group post not found", 404);

    // Ensure user is member of group
    const mem = await env.DB.prepare(
      `SELECT 1
       FROM group_members
       WHERE group_id = ? AND user_id = ?
       LIMIT 1`
    )
      .bind(Number(post.group_id), user_id)
      .first();

    if (!mem) return bad("User is not a member of this group", 403);

    let parentComment: any = null;

    if (parent_comment_id) {
      parentComment = await env.DB.prepare(
        `SELECT id, group_post_id, user_id
         FROM group_post_comments
         WHERE id = ?
         LIMIT 1`
      )
        .bind(parent_comment_id)
        .first();

      if (!parentComment) return bad("Parent comment not found", 404);
      if (toNum(parentComment.group_post_id, 0) !== post_id) {
        return bad("Parent comment does not belong to this group post", 400);
      }
    }

    const insert = await env.DB.prepare(
      `INSERT INTO group_post_comments (user_id, group_post_id, parent_comment_id, text)
       VALUES (?, ?, ?, ?)`
    )
      .bind(user_id, post_id, parent_comment_id, text)
      .run();

    const commentId = toNum(insert.meta?.last_row_id, 0);

    // Notifications
    const postOwnerId = toNum((post as any).user_id, 0);

    if (parent_comment_id && parentComment) {
      const parentOwnerId = toNum((parentComment as any).user_id, 0);

      await createNotification(
        env,
        parentOwnerId,
        user_id,
        "reply",
        "group_comment",
        parent_comment_id,
        `group_post_comment:${parent_comment_id}:reply`,
        "replied in Discuss"
      );
    } else {
      await createNotification(
        env,
        postOwnerId,
        user_id,
        "discuss",
        "group_post",
        post_id,
        `group_post:${post_id}:discuss`,
        "discussed your group post"
      );
    }

    const comment = await env.DB.prepare(
      `SELECT
         c.*,
         u.username,
         u.name,
         u.profile_image_url,
         u.is_verified,
         u.role
       FROM group_post_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?
       LIMIT 1`
    )
      .bind(commentId)
      .first();

    return ok({ comment: comment || {} });
  } catch (e: any) {
    return server(e?.message || "Failed to comment");
  }
};

// LIST comments: /api/group-post-comments?post_id=99
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const post_id = Number(url.searchParams.get("post_id") || 0);
    if (!post_id) return bad("post_id is required");

    const { results } = await env.DB.prepare(
      `SELECT
         c.*,
         u.username,
         u.name,
         u.profile_image_url,
         u.is_verified,
         u.role
       FROM group_post_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.group_post_id = ?
       ORDER BY c.created_at ASC`
    )
      .bind(post_id)
      .all();

    return ok({ comments: results || [] });
  } catch (e: any) {
    return server(e?.message || "Failed to fetch comments");
  }
};
