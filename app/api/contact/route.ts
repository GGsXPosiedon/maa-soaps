import {saveMessage} from "../../../lib/order-storage";
import { z } from "zod";
import { bodyJson, failure, sameOrigin } from "../../../lib/requests";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input=z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(200),message:z.string().trim().min(10).max(3000),website:z.string().max(0).optional()}).safeParse(await bodyJson(request));
    if(!input.success)return failure("Include your name, email, and a message of at least 10 characters.");
    await saveMessage({name:input.data.name,email:input.data.email.toLowerCase(),message:input.data.message});
    return Response.json({ok:true,message:"Your message has been saved for Maa Soaps."},{status:201});
  }catch{return failure("We couldn’t save your message. Please try again.",503);}
}
