// functions/api/posts/[id].ts
import type { PagesFunction } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

/* =========================================================
   DELETE POST
========================================================= */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const postId = Number(params.id);
    const userId = Number(request.headers.get("x-user-id"));

    if (!postId) return json({ error: "Invalid post id" }, 400);
    if (!userId) return json({ error: "Login required" }, 401);

    const post = await env.DB.prepare(
      `SELECT user_id FROM posts WHERE id=?`
    )
      .bind(postId)
      .first();

    if (!post) return json({ error: "Post not found" }, 404);

    if (Number(post.user_id) !== userId)
      return json({ error: "Not allowed" }, 403);

    await env.DB.prepare(`DELETE FROM posts WHERE id=?`)
      .bind(postId)
      .run();

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};

/* =========================================================
   EDIT POST
========================================================= */
export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const postId = Number(params.id);
    const userId = Number(request.headers.get("x-user-id"));
    const body = await request.json();

    if (!postId) return json({ error: "Invalid post id" }, 400);
    if (!userId) return json({ error: "Login required" }, 401);

    const post = await env.DB.prepare(
      `SELECT user_id FROM posts WHERE id=?`
    )
      .bind(postId)
      .first();

    if (!post) return json({ error: "Post not found" }, 404);

    if (Number(post.user_id) !== userId)
      return json({ error: "Not allowed" }, 403);

    const content = String(body.content || "").trim();

    await env.DB.prepare(
      `UPDATE posts SET content=? WHERE id=?`
    )
      .bind(content, postId)
      .run();

    return json({ success: true, content });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};
