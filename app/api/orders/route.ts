import {readOrder,createOrder,referenceForKey,type SavedOrder} from "../../../lib/order-storage";
import { z } from "zod";
import { calculateCart } from "../../../lib/catalog";
import { bodyJson, failure, sameOrigin } from "../../../lib/requests";
import { after } from "next/server";
import { queueOrderAlert, sendOrderAlert } from "../../../lib/order-notifications";
const schema = z.object({
  items: z.array(z.object({ productId: z.string().max(50), quantity: z.number().int().min(1).max(10) })).min(1).max(20), coupon: z.string().max(30).optional().default(""), paymentMethod: z.literal("cod"), website: z.string().max(0).optional(),
  customer: z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200).transform(v => v.toLowerCase()), phone: z.string().trim().regex(/^(?:\+91[ -]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."), address: z.string().trim().min(8).max(500), city: z.string().trim().min(2).max(100), state: z.string().trim().min(2).max(100), postcode: z.string().regex(/^[1-9]\d{5}$/, "Enter a six-digit PIN code.") }),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const parsed=schema.safeParse(await bodyJson(request));
    if(!parsed.success)return failure(parsed.error.issues[0]?.message||"Check your delivery details.");
    const input=parsed.data,key=request.headers.get("Idempotency-Key")||"";
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(key))return failure("Refresh checkout and try again.");
    const pricing=calculateCart(input.items,input.coupon);
    const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(input)));
    const fingerprint=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
    const reference=await referenceForKey(key);
    const receipt=(o:SavedOrder,status=200)=>Response.json({order:{reference:o.reference,total:o.total,status:o.status,currency:o.currency,paymentMethod:o.paymentMethod}},{status,headers:{"Cache-Control":"no-store"}});
    let prior:SavedOrder|null;
    try{prior=await readOrder(reference);}catch{return failure("Order storage is temporarily unavailable. Please try again shortly.",503);}
    const alertLater=async()=>{
      try { await queueOrderAlert(reference); }catch{console.error("Maa Soaps alert queue needs attention. The order is saved.");}
      after(async()=>{
        try { await sendOrderAlert(reference); }
        catch { console.error("Maa Soaps order alert pending. Check the private order dashboard."); }
      });
    };
    if(prior){if(prior.fingerprint!==fingerprint)return failure("Your bag changed. Start a fresh checkout.",409);await alertLater();return receipt(prior);}
    const order:SavedOrder={...input.customer,...pricing,currency:"INR",items:pricing.lines,reference,fingerprint,status:"received",paymentMethod:"cod",createdAt:new Date().toISOString()};
    try{await createOrder(order);}catch{
      try{const concurrent=await readOrder(reference);if(concurrent){if(concurrent.fingerprint!==fingerprint)return failure("Your bag changed. Start a fresh checkout.",409);await alertLater();return receipt(concurrent);}}catch{}
      return failure("We could not save your order. Your bag is safe; please try again.",503);
    }
    await alertLater();
    return receipt(order,201);
  }catch(e){return failure(e instanceof Error?e.message:"Unable to place your order.");}
}
