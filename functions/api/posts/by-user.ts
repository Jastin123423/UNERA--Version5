// functions/api/posts/by-user.ts
import type { PagesFunction } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const safeStr = (v: any) => String(v ?? "");

const normCreatedAt = (v: any) => {
  const s = safeStr(v).trim();
  return s || "1970-01-01 00:00:00";
};

const sortDescByCreatedAt = (a: any, b: any) =>
  normCreatedAt(b.created_at).localeCompare(normCreatedAt(a.created_at));

// --------------------
// Multi-media helpers
// --------------------
const cleanUrl = (v: any) => {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s === "null" || s === "undefined") return "";
  if (s.startsWith("data:")) return "";
  return s;
};

const isHttpUrl = (v: any) => {
  const s = String(v ?? "").trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const parseJsonArrayUrls = (raw: any, maxItems = 20): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map(cleanUrl)
      .filter((x) => isHttpUrl(x))
      .slice(0, maxItems);
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.length > 10000) return [];

    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed
            .map(cleanUrl)
            .filter((x) => isHttpUrl(x))
            .slice(0, maxItems);
        }
        return [];
      } catch {}
    }

    const one = cleanUrl(s);
    return one && isHttpUrl(one) ? [one] : [];
  }

  return [];
};

const parseJsonArrayStrings = (raw: any, maxItems = 20): string[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => String(x ?? "").trim())
      .filter((x) => x && x !== "null" && x !== "undefined")
      .slice(0, maxItems);
  }

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.length > 10000) return [];

    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed
            .map((x) => String(x ?? "").trim())
            .filter((x) => x && x !== "null" && x !== "undefined")
            .slice(0, maxItems);
        }
        return [];
      } catch {}
    }

    const one = String(s).trim();
    return one ? [one] : [];
  }

  return [];
};

const guessTypeFromUrl = (url: string) => {
  const u = String(url || "").toLowerCase();
  if (
    u.includes(".mp4") ||
    u.includes(".webm") ||
    u.includes(".mov") ||
    u.includes(".m4v") ||
    u.includes(".m3u8")
  ) {
    return "video";
  }
  if (
    u.includes(".mp3") ||
    u.includes(".wav") ||
    u.includes(".m4a") ||
    u.includes(".ogg") ||
    u.includes(".aac")
  ) {
    return "audio";
  }
  return "image";
};

const parseMediaMeta = (raw: any, maxItems = 20) => {
  let arr: any[] = [];

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    const s = raw.trim();
    if (s && s.length <= 100000) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) arr = parsed;
      } catch {}
    }
  }

  return arr
    .slice(0, maxItems)
    .map((m: any) => {
      const thumb = cleanUrl(m?.thumb || m?.thumbnail_url);
      const feed = cleanUrl(m?.feed || m?.feed_url || m?.url || m?.full || m?.full_url);
      const full = cleanUrl(m?.full || m?.full_url || m?.feed || m?.feed_url || m?.url || m?.thumb);
      const type = String(m?.type || "").trim().toLowerCase();

      const finalType =
        type === "image" || type === "video" || type === "audio"
          ? type
          : guessTypeFromUrl(full || feed || thumb);

      return {
        thumb: isHttpUrl(thumb) ? thumb : null,
        feed: isHttpUrl(feed) ? feed : null,
        full: isHttpUrl(full) ? full : null,
        type: finalType,
      };
    })
    .filter((m) => m.thumb || m.feed || m.full);
};

const normalizeMedia = (row: any) => {
  const meta = parseMediaMeta(row?.media_meta);

  if (meta.length > 0) {
    return {
      media: meta,
      media_url: meta[0]?.feed || meta[0]?.full || meta[0]?.thumb || null,
      media_urls: meta.map((m: any) => m.feed || m.full || m.thumb).filter(Boolean),
      media_types: meta.map(
        (m: any) => m.type || guessTypeFromUrl(m.feed || m.full || m.thumb)
      ),
      images: meta
        .filter((m: any) => (m.type || "").toLowerCase() === "image")
        .map((m: any) => m.feed || m.full || m.thumb)
        .filter(Boolean),
      thumb_url: meta[0]?.thumb || null,
      feed_url: meta[0]?.feed || null,
      full_url: meta[0]?.full || null,
    };
  }

  const single = cleanUrl(row?.media_url);
  const urls = parseJsonArrayUrls(row?.media_urls);
  const outUrls = urls.length ? urls : single ? [single] : [];

  const types = parseJsonArrayStrings(row?.media_types);
  let outTypes = types.length ? types : [];

  if (outUrls.length && outTypes.length !== outUrls.length) {
    outTypes = outUrls.map(guessTypeFromUrl);
  }

  const media = outUrls.map((url, i) => {
    const type = outTypes[i] || guessTypeFromUrl(url);
    return {
      thumb: type === "image" ? url : null,
      feed: url,
      full: url,
      type,
    };
  });

  return {
    media,
    media_url: single || outUrls[0] || null,
    media_urls: outUrls,
    media_types: outTypes,
    images: outUrls,
    thumb_url: media[0]?.thumb || null,
    feed_url: media[0]?.feed || null,
    full_url: media[0]?.full || null,
  };
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.DB) {
      return json({ success: false, error: "DB binding missing (DB)" }, 500);
    }

    const url = new URL(request.url);

    const userId = toInt(url.searchParams.get("userId"), 0);
    const viewerId = toInt(url.searchParams.get("viewerId"), 0);
    const limit = clamp(toInt(url.searchParams.get("limit"), 20), 1, 50);
    const cursorRaw = url.searchParams.get("cursor");
    const cursor = cursorRaw && cursorRaw.trim() ? cursorRaw.trim() : null;

    if (!userId) {
      return json({ success: false, error: "Missing userId" }, 400);
    }

    const perType = clamp(Math.ceil((limit + 1) * 1.5), 10, 80);

    const cursorWhere = cursor ? `AND created_at < ?` : "";

    const qPosts = `
      SELECT
        'post' AS source,
        'post' AS item_type,
        p.id AS id,
        ('post:' || CAST(p.id AS TEXT)) AS feed_key,
        p.created_at AS created_at,

        p.id AS post_id,
        NULL AS reel_id,
        NULL AS song_id2,
        NULL AS podcast_id,
        NULL AS event_id,
        NULL AS group_post_id,
        NULL AS product_id2,

        p.user_id AS user_id,
        COALESCE(NULLIF(TRIM(u.username), ''), 'user') AS username,
        COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(u.username), ''), 'User') AS name,

        CASE
          WHEN u.profile_image_url LIKE 'data:%' THEN NULL
          WHEN length(u.profile_image_url) > 300 THEN NULL
          ELSE u.profile_image_url
        END AS profile_image_url,

        COALESCE(u.is_verified, 0) AS is_verified,
        COALESCE(u.role, 'user') AS role,

        p.content AS content,
        p.visibility AS visibility,
        p.views AS views,
        p.shares AS shares,

        CASE
          WHEN p.media_url LIKE 'data:%' THEN NULL
          WHEN length(p.media_url) > 300 THEN NULL
          ELSE p.media_url
        END AS media_url,

        CASE
          WHEN p.media_url LIKE 'data:%' THEN NULL
          WHEN length(p.media_url) > 300 THEN NULL
          ELSE p.media_type
        END AS media_type,

        CASE
          WHEN p.media_urls LIKE 'data:%' THEN NULL
          WHEN length(p.media_urls) > 5000 THEN NULL
          ELSE p.media_urls
        END AS media_urls,

        CASE
          WHEN length(p.media_types) > 5000 THEN NULL
          ELSE p.media_types
        END AS media_types,

        CASE
          WHEN length(p.media_meta) > 100000 THEN NULL
          ELSE p.media_meta
        END AS media_meta,

        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id) AS reactions_count,
        (SELECT pr.type FROM post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = ? LIMIT 1) AS my_reaction,

        (
          SELECT COALESCE(NULLIF(TRIM(u2.name), ''), NULLIF(TRIM(u2.username), ''), '')
          FROM post_reactions pr2
          JOIN users u2 ON u2.id = pr2.user_id
          WHERE pr2.post_id = p.id
          ORDER BY pr2.created_at DESC, pr2.id DESC
          LIMIT 1
        ) AS reactor_name,

        (
          SELECT json_group_array(
            json_object(
              'user_id', x.user_id,
              'type', x.type,
              'name', x.name,
              'profile_image_url', x.profile_image_url
            )
          )
          FROM (
            SELECT
              pr3.user_id AS user_id,
              LOWER(COALESCE(pr3.type,'like')) AS type,
              COALESCE(NULLIF(TRIM(u3.name), ''), NULLIF(TRIM(u3.username), ''), '') AS name,
              CASE
                WHEN u3.profile_image_url LIKE 'data:%' THEN NULL
                WHEN length(u3.profile_image_url) > 300 THEN NULL
                ELSE u3.profile_image_url
              END AS profile_image_url
            FROM post_reactions pr3
            LEFT JOIN users u3 ON u3.id = pr3.user_id
            WHERE pr3.post_id = p.id
            ORDER BY pr3.created_at DESC, pr3.id DESC
            LIMIT 30
          ) x
        ) AS reactions_preview,

        (
          SELECT json_group_array(json_object('type', t.type, 'count', t.c))
          FROM (
            SELECT LOWER(COALESCE(type,'like')) AS type, COUNT(*) AS c
            FROM post_reactions
            WHERE post_id = p.id
            GROUP BY LOWER(COALESCE(type,'like'))
            ORDER BY c DESC
          ) t
        ) AS reactions_by_type,

        NULL AS video_url,
        NULL AS caption,
        NULL AS song_name,
        NULL AS audio_url,
        0 AS audio_start,
        0 AS audio_end,
        NULL AS location,
        NULL AS sound_key,
        NULL AS sound_id,

        NULL AS song_title,
        NULL AS song_artist_name,
        NULL AS song_album_name,
        NULL AS song_cover_image_url,
        NULL AS song_duration_seconds,
        NULL AS song_genre,
        NULL AS song_likes_count,
        NULL AS song_plays_count,

        NULL AS podcast_title,
        NULL AS podcast_description,
        NULL AS podcast_audio_url,
        NULL AS podcast_cover_url,
        NULL AS podcast_plays_count,

        NULL AS type,
        NULL AS post_type,
        NULL AS kind,
        NULL AS meta,

        NULL AS group_id,
        NULL AS group_name,
        NULL AS group_image

      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE
        p.user_id = ?
        AND (
          p.visibility IS NULL OR p.visibility = 'public' OR p.visibility = '' OR p.visibility = 'Public'
        )
        AND (
          COALESCE(LOWER(p.media_type), '') NOT LIKE '%video%'
          AND COALESCE(LOWER(p.media_url), '') NOT LIKE '%.mp4%'
          AND COALESCE(LOWER(p.media_url), '') NOT LIKE '%.webm%'
          AND COALESCE(LOWER(p.media_url), '') NOT LIKE '%.mov%'
          AND COALESCE(LOWER(p.media_url), '') NOT LIKE '%.m4v%'
          AND COALESCE(LOWER(p.media_url), '') NOT LIKE '%.m3u8%'
          AND COALESCE(LOWER(p.media_urls), '') NOT LIKE '%.mp4%'
          AND COALESCE(LOWER(p.media_urls), '') NOT LIKE '%.webm%'
          AND COALESCE(LOWER(p.media_urls), '') NOT LIKE '%.mov%'
          AND COALESCE(LOWER(p.media_urls), '') NOT LIKE '%.m4v%'
          AND COALESCE(LOWER(p.media_urls), '') NOT LIKE '%.m3u8%'
          AND (p.media_meta IS NULL OR LOWER(p.media_meta) NOT LIKE '%"type":"video"%')
        )
        ${cursor ? `AND p.created_at < ?` : ""}
      ORDER BY p.created_at DESC
      LIMIT ?
    `;

    const qSongs = `
      SELECT
        'song' AS source,
        'song' AS item_type,
        s.id AS id,
        ('song:' || CAST(s.id AS TEXT)) AS feed_key,
        s.created_at AS created_at,

        NULL AS post_id,
        NULL AS reel_id,
        s.id AS song_id2,
        NULL AS podcast_id,
        NULL AS event_id,
        NULL AS group_post_id,
        NULL AS product_id2,

        s.uploader_id AS user_id,
        COALESCE(NULLIF(TRIM(u.username), ''), 'user') AS username,
        COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(u.username), ''), 'User') AS name,

        CASE
          WHEN u.profile_image_url LIKE 'data:%' THEN NULL
          WHEN length(u.profile_image_url) > 300 THEN NULL
          ELSE u.profile_image_url
        END AS profile_image_url,

        COALESCE(u.is_verified, 0) AS is_verified,
        COALESCE(u.role, 'user') AS role,

        COALESCE(s.title,'') || CASE
          WHEN s.artist_name IS NOT NULL AND s.artist_name != '' THEN ' — ' || s.artist_name
          ELSE ''
        END AS content,

        'public' AS visibility,
        0 AS views,
        0 AS shares,

        s.audio_url AS media_url,
        'audio/mpeg' AS media_type,

        CASE
          WHEN s.cover_image_url IS NOT NULL AND s.cover_image_url != ''
          THEN json_array(s.cover_image_url)
          ELSE NULL
        END AS media_urls,

        CASE
          WHEN s.cover_image_url IS NOT NULL AND s.cover_image_url != ''
          THEN json_array('image')
          ELSE NULL
        END AS media_types,

        NULL AS media_meta,
        0 AS comments_count,

        (SELECT COUNT(*) FROM song_likes sl WHERE sl.song_id = s.id) AS reactions_count,
        (SELECT 'like' FROM song_likes sl WHERE sl.song_id = s.id AND sl.user_id = ? LIMIT 1) AS my_reaction,

        NULL AS reactor_name,
        NULL AS reactions_preview,
        NULL AS reactions_by_type,

        NULL AS video_url,
        NULL AS caption,
        NULL AS song_name,
        s.audio_url AS audio_url,
        0 AS audio_start,
        0 AS audio_end,
        NULL AS location,
        NULL AS sound_key,
        NULL AS sound_id,

        s.title AS song_title,
        s.artist_name AS song_artist_name,
        s.album_name AS song_album_name,
        s.cover_image_url AS song_cover_image_url,
        s.duration_seconds AS song_duration_seconds,
        s.genre AS song_genre,

        (SELECT COUNT(*) FROM song_likes sl WHERE sl.song_id = s.id) AS song_likes_count,
        (
          (SELECT COUNT(*) FROM song_play_events spe WHERE spe.song_id = s.id)
          +
          (SELECT COUNT(*) FROM song_plays sp WHERE sp.song_id = s.id)
        ) AS song_plays_count,

        NULL AS podcast_title,
        NULL AS podcast_description,
        NULL AS podcast_audio_url,
        NULL AS podcast_cover_url,
        NULL AS podcast_plays_count,

        NULL AS type,
        NULL AS post_type,
        NULL AS kind,
        NULL AS meta,

        NULL AS group_id,
        NULL AS group_name,
        NULL AS group_image

      FROM songs s
      LEFT JOIN users u ON u.id = s.uploader_id
      WHERE s.uploader_id = ?
      ${cursor ? `AND s.created_at < ?` : ""}
      ORDER BY s.created_at DESC
      LIMIT ?
    `;

    const qPodcasts = `
      SELECT
        'podcast' AS source,
        'podcast' AS item_type,
        pc.id AS id,
        ('podcast:' || CAST(pc.id AS TEXT)) AS feed_key,
        pc.created_at AS created_at,

        NULL AS post_id,
        NULL AS reel_id,
        NULL AS song_id2,
        pc.id AS podcast_id,
        NULL AS event_id,
        NULL AS group_post_id,
        NULL AS product_id2,

        pc.creator_id AS user_id,
        COALESCE(NULLIF(TRIM(u.username), ''), 'user') AS username,
        COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(u.username), ''), 'User') AS name,

        CASE
          WHEN u.profile_image_url LIKE 'data:%' THEN NULL
          WHEN length(u.profile_image_url) > 300 THEN NULL
          ELSE u.profile_image_url
        END AS profile_image_url,

        COALESCE(u.is_verified, 0) AS is_verified,
        COALESCE(u.role, 'user') AS role,

        COALESCE(pc.title,'Podcast') AS content,
        'public' AS visibility,
        0 AS views,
        0 AS shares,

        pc.audio_url AS media_url,
        'audio/mpeg' AS media_type,

        CASE
          WHEN pc.cover_url IS NOT NULL AND pc.cover_url != ''
          THEN json_array(pc.cover_url)
          ELSE NULL
        END AS media_urls,

        CASE
          WHEN pc.cover_url IS NOT NULL AND pc.cover_url != ''
          THEN json_array('image')
          ELSE NULL
        END AS media_types,

        NULL AS media_meta,
        0 AS comments_count,
        0 AS reactions_count,
        NULL AS my_reaction,

        NULL AS reactor_name,
        NULL AS reactions_preview,
        NULL AS reactions_by_type,

        NULL AS video_url,
        NULL AS caption,
        NULL AS song_name,
        pc.audio_url AS audio_url,
        0 AS audio_start,
        0 AS audio_end,
        NULL AS location,
        NULL AS sound_key,
        NULL AS sound_id,

        NULL AS song_title,
        NULL AS song_artist_name,
        NULL AS song_album_name,
        NULL AS song_cover_image_url,
        NULL AS song_duration_seconds,
        NULL AS song_genre,
        NULL AS song_likes_count,
        NULL AS song_plays_count,

        pc.title AS podcast_title,
        pc.description AS podcast_description,
        pc.audio_url AS podcast_audio_url,
        pc.cover_url AS podcast_cover_url,
        COALESCE(pc.plays_count, 0) AS podcast_plays_count,

        NULL AS type,
        NULL AS post_type,
        NULL AS kind,
        NULL AS meta,

        NULL AS group_id,
        NULL AS group_name,
        NULL AS group_image

      FROM podcasts pc
      LEFT JOIN users u ON u.id = pc.creator_id
      WHERE pc.creator_id = ?
      ${cursor ? `AND pc.created_at < ?` : ""}
      ORDER BY pc.created_at DESC
      LIMIT ?
    `;

    const qProducts = `
      SELECT
        'product' AS source,
        'product' AS item_type,
        pr.id AS id,
        ('product:' || CAST(pr.id AS TEXT)) AS feed_key,
        pr.created_at AS created_at,

        NULL AS post_id,
        NULL AS reel_id,
        NULL AS song_id2,
        NULL AS podcast_id,
        NULL AS event_id,
        NULL AS group_post_id,
        pr.id AS product_id2,

        pr.seller_id AS user_id,
        COALESCE(NULLIF(TRIM(u.username), ''), 'seller') AS username,
        COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(u.username), ''), 'Seller') AS name,

        CASE
          WHEN u.profile_image_url LIKE 'data:%' THEN NULL
          WHEN length(u.profile_image_url) > 300 THEN NULL
          ELSE u.profile_image_url
        END AS profile_image_url,

        COALESCE(u.is_verified, 0) AS is_verified,
        COALESCE(u.role, 'user') AS role,

        pr.title AS content,
        'public' AS visibility,
        0 AS views,
        0 AS shares,

        NULL AS media_url,
        NULL AS media_type,
        pr.images AS media_urls,
        NULL AS media_types,
        NULL AS media_meta,

        0 AS comments_count,
        0 AS reactions_count,
        NULL AS my_reaction,

        NULL AS reactor_name,
        NULL AS reactions_preview,
        NULL AS reactions_by_type,

        NULL AS video_url,
        NULL AS caption,
        NULL AS song_name,
        NULL AS audio_url,
        0 AS audio_start,
        0 AS audio_end,
        NULL AS location,
        NULL AS sound_key,
        NULL AS sound_id,

        NULL AS song_title,
        NULL AS song_artist_name,
        NULL AS song_album_name,
        NULL AS song_cover_image_url,
        NULL AS song_duration_seconds,
        NULL AS song_genre,
        NULL AS song_likes_count,
        NULL AS song_plays_count,

        NULL AS podcast_title,
        NULL AS podcast_description,
        NULL AS podcast_audio_url,
        NULL AS podcast_cover_url,
        NULL AS podcast_plays_count,

        'marketplace' AS type,
        'product' AS post_type,
        'product' AS kind,
        json_object(
          'kind','product',
          'type','product',
          'product_id', pr.id,
          'marketplace', json_object('id', pr.id)
        ) AS meta,

        NULL AS group_id,
        NULL AS group_name,
        NULL AS group_image

      FROM products pr
      LEFT JOIN users u ON u.id = pr.seller_id
      WHERE pr.seller_id = ?
      ${cursor ? `AND pr.created_at < ?` : ""}
      ORDER BY pr.created_at DESC
      LIMIT ?
    `;

    const bindCursor = (base: any[]) => (cursor ? [...base, cursor, perType] : [...base, perType]);

    const [postsRes, songsRes, podcastsRes, productsRes] = await Promise.all([
      env.DB.prepare(qPosts).bind(...bindCursor([viewerId || 0, userId])).all(),
      env.DB.prepare(qSongs).bind(...bindCursor([viewerId || 0, userId])).all(),
      env.DB.prepare(qPodcasts).bind(...bindCursor([userId])).all(),
      env.DB.prepare(qProducts).bind(...bindCursor([userId])).all(),
    ]);

    const items = [
      ...(Array.isArray(postsRes.results) ? postsRes.results : []),
      ...(Array.isArray(songsRes.results) ? songsRes.results : []),
      ...(Array.isArray(podcastsRes.results) ? podcastsRes.results : []),
      ...(Array.isArray(productsRes.results) ? productsRes.results : []),
    ];

    const map = new Map<string, any>();
    for (const it of items) {
      const k = safeStr(it?.feed_key) || `${safeStr(it?.source)}:${Number(it?.id)}`;
      if (!map.has(k)) map.set(k, it);
    }

    const mergedPlusOne = Array.from(map.values())
      .sort(sortDescByCreatedAt)
      .slice(0, limit + 1);

    const hasMore = mergedPlusOne.length > limit;
    const merged = mergedPlusOne.slice(0, limit);

    const normalized = merged.map((item: any) => ({
      ...item,
      ...normalizeMedia(item),
      comments_count: Number(item?.comments_count ?? 0),
      reactions_count: Number(item?.reactions_count ?? 0),
    }));

    const oldest = normalized.reduce((acc: any, cur: any) => {
      if (!acc) return cur;
      return normCreatedAt(cur.created_at) < normCreatedAt(acc.created_at) ? cur : acc;
    }, null);

    const nextCursor = oldest?.created_at ?? null;

    return json(
      {
        success: true,
        userId,
        viewerId,
        limit,
        cursor,
        nextCursor,
        hasMore,
        posts: normalized,
        data: normalized,
        results: normalized,
      },
      200
    );
  } catch (e: any) {
    return json({ success: false, error: e?.message || String(e) }, 500);
  }
};

          
                  
