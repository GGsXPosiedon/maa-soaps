import { ownerError, ownerJson, ownerMutation, requireOwner } from "../../../../../../lib/owner-auth";
import { queueOrderAlert, sendOrderAlert } from "../../../../../../lib/order-notifications";
import { readOrder } from "../../../../../../lib/order-storage";

export async function POST(request:Request,context:{params:Promise<{reference:string}>}){
  try {
    await requireOwner(); ownerMutation(request);
    const {reference}=await context.params;
    if(!/^MAA-[0-9A-F]{12}$/.test(reference)||!await readOrder(reference))return ownerJson({error:"Order not found."},404);
    await queueOrderAlert(reference);
    try { const state=await sendOrderAlert(reference);return ownerJson({state},state==="sent"?200:202); }
    catch(error){return ownerJson({error:error instanceof Error?error.message:"Email delivery failed. Please retry."},503);}
  }catch(error){return ownerError(error);}
}
