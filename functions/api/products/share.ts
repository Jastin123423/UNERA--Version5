import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../utils/createNotification";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json();
  const user_id = Number(body.user_id);
  const product_id = Number(body.product_id);
  const destination = String(body.destination || "feed");

  if (!product_id || !user_id) {
    return Response.json({ error: "Invalid data" }, { headers: cors });
  }

  // Insert share record
  await env.DB.prepare(`
    INSERT INTO product_shares (product_id, user_id, destination, shared_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `)
    .bind(product_id, user_id, destination)
    .run();

  // Increment shares count
  await env.DB.prepare(`
    UPDATE products 
    SET shares_count = shares_count + 1 
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

  if (product && product.seller_id !== user_id) {
    await createNotification(
      env,
      product.seller_id,     // recipient_id
      user_id,               // actor_id
      "share",               // type
      "product",             // entity_type
      product_id,            // entity_id
      `share_product_${product_id}`  // group_key
    );
  }

  // Get updated count
  const count = await env.DB.prepare(`
    SELECT shares_count FROM products WHERE id = ?
  `)
    .bind(product_id)
    .first();

  return Response.json({
    success: true,
    shares: count.shares_count,
    share_count: count.shares_count
  }, { headers: cors });
};
