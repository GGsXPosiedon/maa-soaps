import { requireOwner, ownerJson, ownerError } from "../../../../lib/owner-auth";
import { ownerOrderPage } from "../../../../lib/owner-orders";

export async function GET(request: Request) {
  try {
    await requireOwner();
    const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
    if (cursor && cursor.length > 2000) return ownerJson({ error: "Invalid page." }, 400);
    return ownerJson(await ownerOrderPage(cursor));
  } catch (error) { return ownerError(error); }
}
