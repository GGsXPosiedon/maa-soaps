export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Submit this form from the Maa Soaps website.");
}
export async function bodyJson(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 20000) throw new Error("Your request is too large.");
  const body = await request.text();
  if (body.length > 20000) throw new Error("Your request is too large.");
  try { return JSON.parse(body); } catch { throw new Error("Please send a valid form."); }
}
export function failure(message: string, status = 400) { return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } }); }
