import type { PagesFunction } from '@cloudflare/workers-types';

type Env = { DB: D1Database };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,x-user-id",
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: cors });

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const userId = Number(request.headers.get("x-user-id"));
    if (!userId) return json({ error: "Missing user id" }, 400);

    const ads = await env.DB.prepare(`
      SELECT *
      FROM ads
      WHERE advertiser_id = ?
      ORDER BY created_at DESC
    `)
      .bind(userId)
      .all();

    // Parse JSON fields and map to frontend AdCampaign format
    const parsedAds = ads.results.map((ad: any) => {
      // Parse JSON fields
      const mediaUrls = ad.media_urls ? JSON.parse(ad.media_urls) : [];
      const mediaTypes = ad.media_types ? JSON.parse(ad.media_types) : [];
      
      // Determine primary media URL
      const mediaUrl = ad.media_url || (mediaUrls.length > 0 ? mediaUrls[0] : '');
      
      // Determine media type
      const mediaType = ad.media_type || (mediaTypes.length > 0 ? mediaTypes[0] : 'image');
      
      // Calculate days between start and end date
      let days = ad.duration_days || 7;
      if (ad.start_date && ad.end_date && !ad.duration_days) {
        const start = new Date(ad.start_date);
        const end = new Date(ad.end_date);
        days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        // Core fields
        id: ad.id,
        advertiser_id: ad.advertiser_id,
        post_id: ad.post_id,
        name: ad.campaign_name || `Campaign #${ad.id}`,
        type: mediaType === 'video' ? 'video' : 'image',
        status: ad.status || 'draft',
        
        // Content
        description: ad.description || '',
        mediaUrl: mediaUrl,
        media_urls: mediaUrls,
        media_types: mediaTypes,
        destination_url: ad.destination_url,
        cta_button: ad.cta_button || 'Learn More',
        
        // Contact Methods
        phone_number: ad.phone_number,
        email: ad.email_address,
        whatsapp_number: null, // Add if you have this field
        
        // Targeting
        target_location: ad.target_location || 'Global',
        target_countries: ad.target_country ? [ad.target_country] : [],
        
        // Budget (free on UNERA)
        budget: ad.budget || 0,
        daily_budget: ad.daily_budget || 0,
        total_budget: ad.budget || 0,
        currency: ad.currency || 'USD',
        
        // Schedule
        start_date: ad.start_date,
        end_date: ad.end_date,
        days: days,
        createdAt: new Date(ad.created_at).getTime(),
        
        // Analytics - match AdCampaign interface
        analytics: {
          impressions: ad.impressions || 0,
          clicks: ad.clicks || 0,
          views: ad.views || 0,
          spend: ad.spent || 0
        },
        
        // Additional fields for display
        impressions: ad.impressions || 0,
        clicks: ad.clicks || 0,
        views: ad.views || 0,
        spent: ad.spent || 0,
        ctr: ad.ctr || 0,
        
        // Status flags
        is_free: ad.is_free === 1,
        
        // Raw fields for reference
        campaign_name: ad.campaign_name,
        contact_type: ad.contact_type,
        media_url: ad.media_url,
        
        // Timestamps
        created_at: ad.created_at,
        updated_at: ad.updated_at
      };
    });

    return json({ ads: parsedAds });

  } catch (err) {
    console.error("Error fetching ads:", err);
    return json({ error: String(err) }, 500);
  }
};
