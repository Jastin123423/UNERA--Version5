
import type { PagesFunction } from "@cloudflare/workers-types";
import { createNotification } from "../../../utils/createNotification";

type Env = { DB: D1Database };

const cors = {
 "Access-Control-Allow-Origin": "*",
 "Access-Control-Allow-Methods": "POST,OPTIONS",
 "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const onRequestOptions: PagesFunction = async () =>
 new Response(null,{status:204,headers:cors});

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {

 const post_id = Number((params as any)?.id);
 const body = await request.json();
 const user_id = Number(body.user_id);
 const type = String(body.type || "react");

 if (!post_id || !user_id) return Response.json({error:"Invalid data"},{headers:cors});

 const existing = await env.DB.prepare(`
 SELECT type FROM post_reactions WHERE post_id=? AND user_id=?
 `)
 .bind(post_id,user_id)
 .first();

 if(existing){

  await env.DB.prepare(`
  DELETE FROM post_reactions
  WHERE post_id=? AND user_id=?
  `)
  .bind(post_id,user_id)
  .run();

 }else{

  await env.DB.prepare(`
  INSERT INTO post_reactions(post_id,user_id,type)
  VALUES(?,?,?)
  `)
  .bind(post_id,user_id,type)
  .run();

  const post = await env.DB.prepare(`
  SELECT user_id FROM posts WHERE id=?
  `)
  .bind(post_id)
  .first();

  if(post){

   await createNotification(
    env,
    post.user_id,
    user_id,
    "react",
    "post",
    post_id,
    `react_post_${post_id}`
   );

  }

 }

 const count = await env.DB.prepare(`
 SELECT COUNT(*) c FROM post_reactions WHERE post_id=?
 `)
 .bind(post_id)
 .first();

 return Response.json({
  success:true,
  reactions_count:count.c
 },{headers:cors});

};
