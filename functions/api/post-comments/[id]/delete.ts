import type { PagesFunction } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,DELETE,OPTIONS",
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

const handle = async (
  request: Request,
  env: Env,
  params: any
): Promise<Response> => {
  if (!env.DB) return json({ success: false, error: "DB binding missing" }, 500);

  const commentId = toNum(params?.id, 0);
  if (!commentId) return json({ success: false, error: "Invalid comment id" }, 400);

  const url = new URL(request.url);
  const headerUserId = toNum(request.headers.get("x-user-id"), 0);
  const queryUserId = toNum(url.searchParams.get("user_id"), 0);

  let bodyUserId = 0;
  if (request.method !== "GET") {
    const body: any = await request.json().catch(() => ({}));
    bodyUserId = toNum(body.user_id, 0);
  }

  const userId = headerUserId || bodyUserId || queryUserId || 0;
  if (!userId) return json({ success: false, error: "user_id is required" }, 400);

  // Load comment
  const comment = await env.DB
    .prepare(
      `SELECT id FROM post_comments
       WHERE id = ? AND COALESCE(is_deleted, 0) = 0
       LIMIT 1`
    )
    .bind(commentId)
    .first<any>();

  if (!comment) return json({ success: false, error: "Comment not found" }, 404);

  // Must be admin
  const user = await env.DB
    .prepare(`SELECT id, role FROM users WHERE id = ? LIMIT 1`)
    .bind(userId)
    .first<any>();

  const role = String(user?.role || "").toLowerCase();
  const isAdmin = ["admin", "superadmin", "moderator", "owner"].includes(role);

  if (!isAdmin) {
    return json({ success: false, error: "Only admins can delete" }, 403);
  }

  // Soft delete
  await env.DB
    .prepare(
      `UPDATE post_comments
       SET is_deleted = 1,
           deleted_by = ?,
           deleted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(userId, commentId)
    .run();

  return json({
    success: true,
    comment_id: commentId,
    deleted: true,
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) =>
  handle(request, env, params);

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) =>
  handle(request, env, params);
