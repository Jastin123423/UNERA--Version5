export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const url = new URL(request.url)
    const song_id = Number(url.searchParams.get("song_id"))
    const user_id = url.searchParams.get("user_id") // optional
    const parent_comment_id = url.searchParams.get("parent_comment_id") // optional

    if (!song_id) {
      return new Response(JSON.stringify({ error: "Missing song_id" }), { status: 400 })
    }

    const stmt = env.DB.prepare(`
      SELECT
        c.id,
        c.user_id,
        c.song_id,
        c.parent_comment_id,
        c.text,
        c.created_at,
        COALESCE(SUM(CASE WHEN r.type = 'like' THEN 1 END), 0) AS likes,
        COALESCE(SUM(CASE WHEN r.type = 'love' THEN 1 END), 0) AS loves,
        COALESCE(SUM(CASE WHEN r.type = 'fire' THEN 1 END), 0) AS fires,
        COALESCE(SUM(CASE WHEN r.type = 'haha' THEN 1 END), 0) AS hahas,
        MAX(CASE WHEN r.user_id = ? THEN r.type END) AS my_reaction
      FROM song_comments c
      LEFT JOIN comment_reactions r ON r.comment_id = c.id
      WHERE c.song_id = ?
        AND ${parent_comment_id ? "c.parent_comment_id = ?" : "c.parent_comment_id IS NULL"}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 200
    `)

    const bindings: any[] = [user_id ?? null, song_id]
    if (parent_comment_id) bindings.push(Number(parent_comment_id))

    const { results } = await stmt.bind(...bindings).all()

    return new Response(JSON.stringify({ comments: results ?? [] }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const { user_id, song_id, parent_comment_id, text } = await request.json()

    if (!user_id || !song_id || !text || !text.trim()) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 })
    }

    // If replying, verify parent belongs to the same song
    if (parent_comment_id) {
      const parent = await env.DB
        .prepare(`SELECT id, song_id FROM song_comments WHERE id = ?`)
        .bind(parent_comment_id)
        .first()

      if (!parent || parent.song_id !== song_id) {
        return new Response(JSON.stringify({ error: "Invalid parent_comment_id" }), { status: 400 })
      }
    }

    const result = await env.DB.prepare(`
      INSERT INTO song_comments
      (user_id, song_id, parent_comment_id, text)
      VALUES (?, ?, ?, ?)
    `)
      .bind(user_id, song_id, parent_comment_id ?? null, text.trim())
      .run()

    const comment = await env.DB
      .prepare(`
        SELECT id, user_id, song_id, parent_comment_id, text, created_at
        FROM song_comments WHERE id = ?
      `)
      .bind(result.meta.last_row_id)
      .first()

    return new Response(JSON.stringify({ success: true, comment }), { status: 201 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
