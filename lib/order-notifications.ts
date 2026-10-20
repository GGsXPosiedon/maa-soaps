import "server-only";
import { del } from "@vercel/blob";
import { createDocument, listDocuments, readDocument, readOrder, removeLocalDocument } from "./order-storage";

type Receipt = { sentAt: string; messageId: string };
type Job = { reference: string; queuedAt: string };
export const emailConfigured = () => !(process.env.MAA_LOCAL_TEST_MODE==="1"&&process.env.NODE_ENV==="development"&&!process.env.VERCEL)&&Boolean(process.env.RESEND_API_KEY && process.env.ORDER_ALERT_EMAIL);
async function acknowledgeJob(reference:string){
  const path=`email-jobs/${reference}.json`;
  try{if(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN)await del(path);else await removeLocalDocument(path);}catch{/* A saved receipt still prevents repeat delivery. */}
}

export async function queueOrderAlert(reference: string) {
  if (await readDocument<Receipt>(`notifications/${reference}/sent.json`)) return;
  const path = `email-jobs/${reference}.json`;
  try { await createDocument(path, { reference, queuedAt: new Date().toISOString() }); }
  catch { if (!await readDocument<Job>(path)) throw new Error("Could not queue order alert."); }
}

export async function sendOrderAlert(reference: string): Promise<"sent" | "pending"> {
  const receiptPath = `notifications/${reference}/sent.json`;
  if (await readDocument<Receipt>(receiptPath)) {await acknowledgeJob(reference);return "sent";}
  if (!emailConfigured()) throw new Error("Email delivery is not connected. Add the Resend API key in Vercel, then redeploy.");
  const order = await readOrder(reference);
  if (!order) throw new Error("Order not found.");
  await queueOrderAlert(reference);
  // A shared one-minute lease avoids duplicate attempts across function instances.
  // Resend also deduplicates the stable request key for 24 hours.
  const leasePath = `notification-leases/${reference}/${Math.floor(Date.now()/60000)}.json`;
  try { await createDocument(leasePath, { startedAt: new Date().toISOString() }); }
  catch(error) {if(!await readDocument(leasePath))throw error;return await readDocument<Receipt>(receiptPath) ? "sent" : "pending";}

  const money = (amount:number) => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR"}).format(amount/100);
  const appUrl = process.env.APP_URL || "https://maa-soaps.vercel.app";
  const text = [
    "New Maa Soaps order — cash on delivery", "", `Order: ${order.reference}`,
    `Placed: ${new Date(order.createdAt).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST`, "",
    "PACK THESE SOAPS", ...order.items.map(item=>`${item.name} × ${item.quantity} — ${money(item.total)}`), "",
    `Soaps: ${money(order.subtotal)}`, `Discount: ${money(order.discount)}`,
    `Delivery: ${money(order.shipping)}`, `Collect on delivery: ${money(order.total)}`, "",
    "DELIVER TO", order.name, order.address, `${order.city}, ${order.state} ${order.postcode}`, "India",
    `Phone: ${order.phone}`, `Email: ${order.email}`, "",
    `Open your private order dashboard: ${appUrl}/admin`,
    "Confirm the order, mark it Packing, then add the courier details after booking shipment.",
    "Use the order reference to identify this order if you receive a duplicate alert.",
  ].join("\n");
  let messageId: string | undefined;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `maa-order-${reference}` },
        body: JSON.stringify({ from: process.env.ORDER_ALERT_FROM || "Maa Soaps <onboarding@resend.dev>", to: [process.env.ORDER_ALERT_EMAIL], reply_to: order.email, subject: `New COD order ${reference} · ${money(order.total)}`, text }),
      });
      if (response.ok) { const result = await response.json() as {id?:string}; messageId = result.id; break; }
      if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
        await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1))); continue;
      }
      throw new Error("Email provider did not accept the alert. Check Resend, then retry from this order.");
    }
    if (!messageId) throw new Error("Email provider did not confirm the alert.");
    try { await createDocument(receiptPath, { sentAt: new Date().toISOString(), messageId }); }
    catch { if (!await readDocument<Receipt>(receiptPath)) throw new Error("Email accepted but its receipt could not be saved. Check Resend before retrying."); }
    await acknowledgeJob(reference);
    return "sent";
  } catch (error) {
    await createDocument(`notifications/${reference}/attempts/${Date.now()}-${crypto.randomUUID()}.json`, { attemptedAt: new Date().toISOString(), state: messageId ? "unknown" : "failed" }).catch(()=>{});
    throw error;
  }
}

export async function processAlertQueue() {
  if (!emailConfigured()) throw new Error("Email is not configured.");
  const page = await listDocuments("email-jobs/", undefined, 50);
  const deadline=Date.now()+20000;
  let sent = 0, pending = 0, processed=0;
  for (const path of page.paths) {
    if(Date.now()>deadline)break;
    const job = await readDocument<Job>(path);
    if (!job) continue;
    try { if (await sendOrderAlert(job.reference) === "sent") sent++; else pending++; }
    catch { pending++; }
    processed++;
    await new Promise(resolve=>setTimeout(resolve,600));
  }
  return { processed, sent, pending, more: Boolean(page.cursor)||processed<page.paths.length };
}
