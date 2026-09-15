import type { PagesFunction } from '@cloudflare/workers-types';
import { createNotification } from '../../../utils/createNotification';

type Env = { DB: D1Database };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const reel_id = toNum((params as any)?.id, 0);

    if (!reel_id) {
      return json({ success: false, error: 'Invalid reel id' }, 400);
    }

    const body = await request.json().catch(() => ({} as any));

    const user_id =
      toNum(request.headers.get('x-user-id'), 0) ||
      toNum((body as any).user_id, 0);

    if (!user_id) {
      return json({ success: false, error: 'user_id required' }, 400);
    }

    const destination =
      typeof (body as any)?.destination === 'string'
        ? String((body as any).destination).trim()
        : null;

    const reel = await env.DB
      .prepare(`SELECT id, user_id FROM reels WHERE id = ? LIMIT 1`)
      .bind(reel_id)
      .first();

    if (!reel) {
      return json({ success: false, error: 'Reel not found' }, 404);
    }

    const reelOwnerId = toNum((reel as any)?.user_id, 0);

    const result = await env.DB
      .prepare(`
        INSERT INTO reel_shares (reel_id, user_id, destination)
        VALUES (?, ?, ?)
      `)
      .bind(reel_id, user_id, destination)
      .run();

    const share_id = toNum(result?.meta?.last_row_id, 0);

    const share = await env.DB
      .prepare(`
        SELECT id, reel_id, user_id, destination, created_at
        FROM reel_shares
        WHERE id = ?
        LIMIT 1
      `)
      .bind(share_id)
      .first();

    if (reelOwnerId && reelOwnerId !== user_id) {
      await createNotification(
        env,
        reelOwnerId,
        user_id,
        'share',
        'reel',
        reel_id,
        `reel:${reel_id}:share`,
        'shared your reel'
      );
    }

    const countRow = await env.DB
      .prepare(`
        SELECT COUNT(*) as cnt
        FROM reel_shares
        WHERE reel_id = ?
      `)
      .bind(reel_id)
      .first();

    return json({
      success: true,
      share,
      shares_count: toNum((countRow as any)?.cnt, 0),
    });
  } catch (err: any) {
    return json({ success: false, error: err?.message || 'Server error' }, 500);
  }
};
