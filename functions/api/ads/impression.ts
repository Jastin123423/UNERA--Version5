import type { PagesFunction } from '@cloudflare/workers-types';

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,x-user-id",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {

    const userId = Number(request.headers.get("x-user-id"));
    const body = await request.json();
    const { ad_id } = body;

    await env.DB.prepare(`
      INSERT INTO ad_impressions (ad_id, user_id)
      VALUES (?, ?)
    `)
      .bind(ad_id, userId)
      .run();

    return json({ success: true });

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
};
