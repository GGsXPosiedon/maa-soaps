import {readOrder} from "../../../../lib/order-storage";
import { z } from "zod";
import { bodyJson, failure, sameOrigin } from "../../../../lib/requests";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z.object({ reference: z.string().trim().toUpperCase().regex(/^MAA-[0-9A-F]{12}$/), email: z.string().trim().email().transform(v => v.toLowerCase()) }).safeParse(await bodyJson(request));
    if (!input.success) return failure("Enter the order reference and email used at checkout.");
    const row=await readOrder(input.data.reference);
    if(!row||row.email!==input.data.email)return failure("We couldn’t find that order. Check the reference and email.",404);
    return Response.json({order:{reference:row.reference,name:row.name,city:row.city,subtotal:row.subtotal,discount:row.discount,shipping:row.shipping,total:row.total,status:row.status,paymentMethod:row.paymentMethod,createdAt:row.createdAt,currency:row.currency,items:row.items.map(({name,quantity,unitPrice})=>({name,quantity,unitPrice}))}},{headers:{"Cache-Control":"no-store"}});
  } catch { return failure("Order tracking is unavailable. Please try again."); }
}
