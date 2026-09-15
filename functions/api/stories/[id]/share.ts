import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../../utils/createNotification";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

const toInt = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    if (!env.DB) return json({ success: false, error: "DB binding missing (DB)" }, 500);

    const storyId = toInt((params as any)?.id, 0);
    const body = await request.json().catch(() => ({} as any));

    const headerUserId = toInt(request.headers.get("x-user-id"), 0);
    const bodyUserId = toInt(body.user_id, 0);
    const userId = headerUserId || bodyUserId || 0;

    if (!storyId) return json({ success: false, error: "Invalid story id" }, 400);
    if (!userId) return json({ success: false, error: "user_id is required" }, 400);

    const story = await env.DB.prepare(
      `SELECT id, user_id
       FROM stories
       WHERE id = ?
       LIMIT 1`
    ).bind(storyId).first();

    if (!story) {
      return json({ success: false, error: "Story not found" }, 404);
    }

    await env.DB.prepare(
      `
      INSERT INTO story_shares (story_id, user_id)
      VALUES (?, ?)
      `
    ).bind(storyId, userId).run();

    const storyOwnerId = toInt((story as any)?.user_id, 0);

    await createNotification(
      env,
      storyOwnerId,
      userId,
      "share",
      "story",
      storyId,
      `story:${storyId}:share`,
      "shared your story"
    );

    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as shares_count
       FROM story_shares
       WHERE story_id = ?`
    ).bind(storyId).first();

    return json({
      success: true,
      shares_count: Number((countRow as any)?.shares_count || 0),
    });
  } catch (err: any) {
    return json(
      { success: false, error: "Backend crash", message: String(err?.message ?? err) },
      500
    );
  }
};
