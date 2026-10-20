import { requireOwner, ownerJson, ownerError, ownerMutation } from "../../../../../lib/owner-auth";
import { ownerOrder } from "../../../../../lib/owner-orders";
import { bodyJson } from "../../../../../lib/requests";
import { readOrder, updateFulfilment } from "../../../../../lib/order-storage";
import { fulfilmentUpdate, OrderConflictError } from "../../../../../lib/order-validation";

type Context = { params: Promise<{ reference: string }> };
const validReference = (reference:string) => /^MAA-[0-9A-F]{12}$/.test(reference);
export async function GET(_request: Request, context: Context) {
  try {
    await requireOwner();
    const { reference } = await context.params;
    if (!validReference(reference)) return ownerJson({ error: "Order not found." }, 404);
    const order = await ownerOrder(reference);
    return order ? ownerJson({ order }) : ownerJson({ error: "Order not found." }, 404);
  } catch (error) { return ownerError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const owner = await requireOwner();
    ownerMutation(request);
    const { reference } = await context.params;
    if (!validReference(reference)) return ownerJson({ error: "Order not found." }, 404);
    const parsed = fulfilmentUpdate.safeParse(await bodyJson(request));
    if (!parsed.success) return ownerJson({ error: parsed.error.issues[0].message }, 400);
    const order = await readOrder(reference);
    if (!order) return ownerJson({ error: "Order not found." }, 404);
    try { await updateFulfilment(order, parsed.data, owner.userId); }
    catch(error) { if(error instanceof OrderConflictError)return ownerJson({ error:error.message },409);throw error; }
    return ownerJson({ order: await ownerOrder(reference) });
  } catch (error) { return ownerError(error); }
}
