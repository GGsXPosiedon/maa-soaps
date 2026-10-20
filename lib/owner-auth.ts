import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

export class OwnerAccessError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function requireOwner() {
  const allowedEmail = process.env.MAA_OWNER_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) throw new OwnerAccessError("Owner access is not configured.", 503);
  const { userId } = await auth();
  if (!userId) throw new OwnerAccessError("Sign in to manage Maa Soaps orders.", 401);
  const user = await currentUser();
  const verifiedOwner = user?.emailAddresses.some(address =>
    address.emailAddress.toLowerCase() === allowedEmail && address.verification?.status === "verified");
  if (!verifiedOwner) throw new OwnerAccessError("This account does not have access to Maa Soaps orders.", 403);
  return { userId, email: allowedEmail };
}

export function ownerMutation(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    throw new OwnerAccessError("Submit changes from the Maa Soaps dashboard.", 403);
  }
}

export function ownerJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: {
    "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow",
  } });
}

export function ownerError(error: unknown) {
  if (error instanceof OwnerAccessError) return ownerJson({ error: error.message }, error.status);
  return ownerJson({ error: "Could not load or save this order. Please retry." }, 503);
}
