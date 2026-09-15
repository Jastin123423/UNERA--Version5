import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../../utils/createNotification";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const product_id = Number((params as any)?.id);
  const body = await request.json();
  const user_id = Number(body.user_id);
  const type = String(body.type || "like");

  if (!product_id || !user_id) {
    return Response.json({ error: "Invalid data" }, { headers: cors });
  }

  // Check if reaction exists
  const existing = await env.DB.prepare(`
    SELECT type FROM product_reactions 
    WHERE product_id = ? AND user_id = ?
  `)
    .bind(product_id, user_id)
    .first();

  if (existing) {
    // Remove reaction (unreact)
    await env.DB.prepare(`
      DELETE FROM product_reactions
      WHERE product_id = ? AND user_id = ?
    `)
      .bind(product_id, user_id)
      .run();

    // Decrement reactions count
    await env.DB.prepare(`
      UPDATE products 
      SET reactions_count = reactions_count - 1 
      WHERE id = ?
    `)
      .bind(product_id)
      .run();

  } else {
    // Add new reaction
    await env.DB.prepare(`
      INSERT INTO product_reactions (product_id, user_id, type)
      VALUES (?, ?, ?)
    `)
      .bind(product_id, user_id, type)
      .run();

    // Increment reactions count
    await env.DB.prepare(`
      UPDATE products 
      SET reactions_count = reactions_count + 1 
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
        product.seller_id,  // recipient_id
        user_id,            // actor_id
        "react",            // type
        "product",          // entity_type
        product_id,         // entity_id
        `react_product_${product_id}`  // group_key
      );
    }
  }

  // Get updated count
  const count = await env.DB.prepare(`
    SELECT COUNT(*) as c FROM product_reactions WHERE product_id = ?
  `)
    .bind(product_id)
    .first();

  // Get my reaction status
  const myReaction = await env.DB.prepare(`
    SELECT type FROM product_reactions 
    WHERE product_id = ? AND user_id = ?
  `)
    .bind(product_id, user_id)
    .first();

  return Response.json({
    success: true,
    reactions_count: count.c,
    my_reaction: myReaction?.type || null
  }, { headers: cors });
};
