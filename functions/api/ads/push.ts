import type { PagesFunction } from '@cloudflare/workers-types';

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
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
    if (!userId) return json({ error: "Missing user id" }, 400);

    const body = await request.json();
    console.log("Ad creation payload:", body);

    // Support both simple push and full campaign creation
    const { 
      post_id, 
      budget, 
      days,
      // Full campaign fields
      name, 
      link, 
      phone, 
      email, 
      cta, 
      location 
    } = body;

    if (!post_id) {
      return json({ error: "post_id is required" }, 400);
    }

    // First, get the post details to extract media and content
    const post = await env.DB.prepare(`
      SELECT * FROM posts WHERE id = ?
    `).bind(post_id).first();

    if (!post) {
      return json({ error: "Post not found" }, 404);
    }

    // Check if user owns the post or is admin
    if (post.user_id !== userId) {
      // Check if user is admin
      const user = await env.DB.prepare(`
        SELECT role FROM users WHERE id = ?
      `).bind(userId).first();
      
      if (!user || user.role !== 'admin') {
        return json({ error: "You can only boost your own posts" }, 403);
      }
    }

    // Parse media URLs - handle both single and multiple
    let mediaUrls = [];
    let mediaTypes = [];
    
    if (post.media_urls) {
      // If already stored as JSON string
      try {
        mediaUrls = JSON.parse(post.media_urls);
      } catch {
        mediaUrls = [post.media_urls];
      }
    } else if (post.media_url) {
      mediaUrls = [post.media_url];
    }

    // Determine media types
    if (post.media_types) {
      try {
        mediaTypes = JSON.parse(post.media_types);
      } catch {
        mediaTypes = post.media_type ? [post.media_type] : ['image'];
      }
    } else {
      mediaTypes = post.media_type ? [post.media_type] : ['image'];
    }

    // Determine contact type and values
    let contact_type = 'link';
    let destination_url = link || null;
    let phone_number = null;
    let email_address = null;

    if (phone) {
      contact_type = 'phone';
      phone_number = phone;
      destination_url = null;
    } else if (email) {
      contact_type = 'email';
      email_address = email;
      destination_url = null;
    } else if (link) {
      contact_type = 'link';
      destination_url = link;
    }

    // Calculate dates
    const start_date = new Date().toISOString();
    const end_date = new Date();
    end_date.setDate(end_date.getDate() + (days || 3));

    // Insert into ads table with all fields
    const result = await env.DB.prepare(`
      INSERT INTO ads (
        advertiser_id,
        post_id,
        campaign_name,
        title,
        description,
        media_url,
        media_urls,
        media_type,
        media_types,
        contact_type,
        destination_url,
        phone_number,
        email_address,
        cta_button,
        target_location,
        budget,
        spent,
        daily_budget,
        bid_per_click,
        start_date,
        end_date,
        duration_days,
        status,
        is_free,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,                                   // advertiser_id
      post_id,                                  // post_id
      name || post.content?.substring(0, 30) || 'Boosted Post', // campaign_name
      post.title || null,                       // title
      post.content || null,                      // description
      mediaUrls[0] || null,                      // media_url (primary)
      JSON.stringify(mediaUrls),                  // media_urls (JSON array)
      mediaTypes[0] || 'image',                   // media_type (primary)
      JSON.stringify(mediaTypes),                  // media_types (JSON array)
      contact_type,                                // contact_type
      destination_url,                             // destination_url
      phone_number,                                // phone_number
      email_address,                               // email_address
      cta || 'Learn More',                         // cta_button
      location || 'Global',                        // target_location
      budget || 0,                                 // budget (0 for free)
      0,                                           // spent (starts at 0)
      budget || 0,                                 // daily_budget
      0,                                           // bid_per_click (0 for free)
      start_date,                                  // start_date
      end_date.toISOString(),                      // end_date
      days || 3,                                   // duration_days
      'active',                                    // status
      1,                                           // is_free (TRUE for free promotions)
      start_date,                                  // created_at
      start_date                                   // updated_at
    ).run();

    // Get the created campaign to return
    const campaign = await env.DB.prepare(`
      SELECT * FROM ads WHERE id = ?
    `).bind(result.meta.last_row_id).first();

    // Parse JSON fields for the campaign
    const parsedCampaign = {
      ...campaign,
      media_urls: campaign.media_urls ? JSON.parse(campaign.media_urls) : [],
      media_types: campaign.media_types ? JSON.parse(campaign.media_types) : [],
      is_free: campaign.is_free === 1
    };

    return json({
      success: true,
      ad_id: result.meta.last_row_id,
      campaign: parsedCampaign,
      message: "Campaign created successfully",
      is_free: true
    });

  } catch (err: any) {
    console.error("Error creating ad campaign:", err);
    return json({ 
      error: err.message || "Failed to create campaign",
      details: String(err)
    }, 500);
  }
};
