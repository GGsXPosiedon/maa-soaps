import { timingSafeEqual } from "node:crypto";
import { processAlertQueue } from "../../../../lib/order-notifications";

export const maxDuration=60;
export async function GET(request:Request){
  const expected=process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:"";
  const received=request.headers.get("authorization")||"";
  if(!expected||Buffer.byteLength(expected)!==Buffer.byteLength(received)||!timingSafeEqual(Buffer.from(expected),Buffer.from(received)))return Response.json({error:"Unauthorized"},{status:401,headers:{"Cache-Control":"no-store"}});
  try{return Response.json(await processAlertQueue(),{headers:{"Cache-Control":"no-store"}});}
  catch{return Response.json({error:"Alert queue is unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
