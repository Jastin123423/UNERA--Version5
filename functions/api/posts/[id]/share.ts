import type { PagesFunction } from '@cloudflare/workers-types';
import { createNotification } from "../../../utils/createNotification";

type Env = { DB: D1Database };

const cors = {
 "Access-Control-Allow-Origin": "*",
 "Access-Control-Allow-Methods": "POST,OPTIONS",
 "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () =>
 new Response(null,{status:204,headers:cors});

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {

 const postId = Number((params as any)?.id);
 const body = await request.json();
 const userId = Number(body.user_id);

 if(!postId || !userId) return Response.json({error:"Invalid data"},{headers:cors});

 await env.DB.prepare(`
 UPDATE posts
 SET shares = COALESCE(shares,0)+1
 WHERE id=?
 `)
 .bind(postId)
 .run();

 const post = await env.DB.prepare(`
 SELECT user_id FROM posts WHERE id=?
 `)
 .bind(postId)
 .first();

 if(post){

  await createNotification(
   env,
   post.user_id,
   userId,
   "share",
   "post",
   postId,
   `share_post_${postId}`
  );

 }

 return Response.json({success:true},{headers:cors});
};
