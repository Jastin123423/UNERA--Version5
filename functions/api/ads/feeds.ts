import type { PagesFunction } from '@cloudflare/workers-types';

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {

    const ads = await env.DB.prepare(`
      SELECT *
      FROM ads
      WHERE status='active'
      AND datetime(start_date) <= datetime('now')
      AND datetime(end_date) >= datetime('now')
      ORDER BY RANDOM()
      LIMIT 3
    `).all();

    return json({ ads: ads.results });

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
};
