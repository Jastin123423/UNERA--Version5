import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../../utils/createNotification";

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

const ALLOWED_DESTINATIONS = new Set([
  "feed","story","message","copy_link","group","external",
]);

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

    const postId = toNum((params as any)?.id, 0);
    const body: any = await request.json().catch(() => ({}));

    const headerUserId = toNum(request.headers.get("x-user-id"), 0);
    const bodyUserId = toNum(body.user_id, 0);
    const userId = headerUserId || bodyUserId || 0;

    const destination = String(body.destination || "feed").trim().toLowerCase();
    const message = typeof body.message === "string" ? body.message.trim() : null;

    if (!postId) return json({ success: false, error: "Invalid post id" }, 400);
    if (!userId)  return json({ success: false, error: "user_id is required" }, 400);
    if (!ALLOWED_DESTINATIONS.has(destination)) {
      return json({ success: false, error: `Invalid destination: ${destination}` }, 400);
    }
    if (message && message.length > 1000) {
      return json({ success: false, error: "Message is too long" }, 400);
    }

    // Verify post exists
    const post = await env.DB
      .prepare(`SELECT id, user_id FROM posts WHERE id = ? LIMIT 1`)
      .bind(postId)
      .first<any>();

    if (!post) return json({ success: false, error: "Post not found" }, 404);

    // Record the share
    const ins = await env.DB
      .prepare(`
        INSERT INTO post_shares (post_id, user_id, destination, message)
        VALUES (?, ?, ?, ?)
      `)
      .bind(postId, userId, destination, message)
      .run();

    // Keep the denormalized counter in sync (best-effort)
    try {
      await env.DB
        .prepare(`UPDATE posts SET shares = COALESCE(shares, 0) + 1 WHERE id = ?`)
        .bind(postId)
        .run();
    } catch (_) {}

    // Notify post owner (never self)
    const ownerId = toNum(post.user_id, 0);
    if (ownerId && ownerId !== userId) {
      try {
        await createNotification(
          env,
          ownerId,
          userId,
          "share",
          "post",
          postId,
          `share_post_${postId}`
        );
      } catch (_) {}
    }

    // Return fresh count
    const countRow = await env.DB
      .prepare(`SELECT COUNT(*) AS c FROM post_shares WHERE post_id = ?`)
      .bind(postId)
      .first<{ c: number }>();

    return json({
      success: true,
      share_id: toNum(ins.meta?.last_row_id, 0),
      post_id: postId,
      destination,
      shares_count: toNum(countRow?.c, 0),
    });
  } catch (err: any) {
    return json(
      { success: false, error: err?.message || "Failed to share post" },
      500
    );
  }
};
