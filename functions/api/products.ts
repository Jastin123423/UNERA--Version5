// functions/api/products.ts
import { withNewContentId } from "../utils/ids";

type PagesFunction = any;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const safeArray = (v: any) => (Array.isArray(v) ? v : []);

const safeParseJsonArray = (value: any) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeImageVariants = (input: any) => {
  const arr = safeParseJsonArray(input);

  return arr
    .map((item: any) => {
      if (!item || typeof item !== "object") return null;

      const thumb = String(item.thumb || item.thumbnail || "").trim();
      const feed = String(item.feed || item.url || item.full || "").trim();

      if (!feed) return null;

      return {
        thumb: thumb || feed,
        feed,
        full: feed, // product full = feed
        type: "image",
      };
    })
    .filter(Boolean);
};

const normalizeImagesFromBody = (images: any, imageVariants: any) => {
  const variants = normalizeImageVariants(imageVariants);

  if (variants.length > 0) {
    return variants.map((v: any) => v.feed).filter(Boolean);
  }

  const imgs = safeParseJsonArray(images)
    .map((x: any) => String(x || "").trim())
    .filter(Boolean);

  return imgs;
};

const buildReturnedProduct = (row: any) => {
  const image_variants = normalizeImageVariants(row?.image_variants);

  let images: string[] = [];
  try {
    const rawImages = typeof row?.images === "string" ? JSON.parse(row.images) : row?.images;
    images = Array.isArray(rawImages)
      ? rawImages.map((x: any) => String(x || "").trim()).filter(Boolean)
      : [];
  } catch {
    images = [];
  }

  if (!images.length && image_variants.length) {
    images = image_variants.map((v: any) => v.feed).filter(Boolean);
  }

  return {
    ...row,
    images,
    image_variants,
  };
};

export const onRequestPost: PagesFunction = async ({ request, env }: any) => {
  try {
    const body = await request.json().catch(() => ({}));

    const seller_id = Number(body.seller_id || 0);
    const title = String(body.title || "").trim();
    const category = String(body.category || "").trim();
    const description = String(body.description || "").trim();
    const country = String(body.country || "").trim();
    const address = String(body.address || "").trim();
    const main_price = Number(body.main_price);
    const discount_price =
      body.discount_price === null || body.discount_price === undefined
        ? null
        : Number(body.discount_price);
    const quantity = Number(body.quantity ?? 1);
    const phone_number = body.phone_number ? String(body.phone_number).trim() : null;

    const image_variants = normalizeImageVariants(body.image_variants);
    const images = normalizeImagesFromBody(body.images, image_variants);

    if (!seller_id || !title || !category || !description || !country || !address) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400, headers: cors }
      );
    }

    if (!Number.isFinite(main_price)) {
      return Response.json(
        { success: false, error: "Invalid main_price" },
        { status: 400, headers: cors }
      );
    }

    // ─────────────────────────────────────────────────────────
    // Column count check:
    //   id, seller_id, title, category, description,
    //   country, address, main_price, discount_price,
    //   quantity, phone_number, images, image_variants
    //   → 13 columns
    //   → 13 placeholders
    //   → 13 bind args
    // ─────────────────────────────────────────────────────────
    const { id } = await withNewContentId(async (id) => {
      return await env.DB.prepare(`
        INSERT INTO products
        (
          id,
          seller_id,
          title,
          category,
          description,
          country,
          address,
          main_price,
          discount_price,
          quantity,
          phone_number,
          images,
          image_variants
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          id,
          seller_id,
          title,
          category,
          description,
          country,
          address,
          main_price,
          discount_price,
          quantity,
          phone_number,
          JSON.stringify(images),
          JSON.stringify(image_variants)
        )
        .run();
    });

    const created = await env.DB.prepare(`
      SELECT
        p.*,
        u.name AS seller_name,
        u.username AS seller_username,
        u.profile_image_url AS seller_avatar
      FROM products p
      JOIN users u ON u.id = p.seller_id
      WHERE p.id = ?
    `)
      .bind(id)
      .first();

    return Response.json(
      {
        success: true,
        product: buildReturnedProduct(created),
      },
      { headers: cors }
    );
  } catch (e: any) {
    return Response.json(
      { success: false, error: e?.message || "Failed to create product" },
      { status: 500, headers: cors }
    );
  }
};

export const onRequestGet: PagesFunction = async ({ env }: any) => {
  try {
    const { results } = await env.DB.prepare(`
      SELECT
        p.*,
        u.name AS seller_name,
        u.username AS seller_username,
        u.profile_image_url AS seller_avatar
      FROM products p
      JOIN users u ON u.id = p.seller_id
      ORDER BY p.created_at DESC
    `).all();

    const normalized = safeArray(results).map((row: any) => buildReturnedProduct(row));

    return Response.json(normalized, { headers: cors });
  } catch (e: any) {
    return Response.json(
      { success: false, error: e?.message || "Failed to fetch products" },
      { status: 500, headers: cors }
    );
  }
};
