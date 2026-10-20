import "server-only";
import { listDocuments, readDocument, readOrder, readFulfilment } from "./order-storage";
import { emailConfigured } from "./order-notifications";

export async function ownerOrder(reference: string) {
  const order = await readOrder(reference);
  if (!order) return null;
  const [fulfilment, notification] = await Promise.all([
    readFulfilment(order), readDocument<{sentAt:string;messageId:string}>(`notifications/${reference}/sent.json`),
  ]);
  const details = {
    reference:order.reference,name:order.name,email:order.email,phone:order.phone,
    address:order.address,city:order.city,state:order.state,postcode:order.postcode,
    subtotal:order.subtotal,discount:order.discount,shipping:order.shipping,total:order.total,
    currency:order.currency,coupon:order.coupon,paymentMethod:order.paymentMethod,
    createdAt:order.createdAt,items:order.items,
  };
  return { ...details, ...fulfilment, notification: notification ? { state: "sent" as const, sentAt: notification.sentAt } : { state: "pending" as const } };
}

export async function ownerOrderPage(cursor?: string) {
  const page = await listDocuments("orders/", cursor, 25);
  const orders = [];
  // Bound storage concurrency when a busy shop loads a full page.
  for (let i = 0; i < page.paths.length; i += 5) {
    const batch = await Promise.all(page.paths.slice(i,i+5).map(async path => {
      const reference = path.slice("orders/".length, -".json".length);
      const order = await ownerOrder(reference);
      if (!order) return null;
      return { reference: order.reference, name: order.name, city: order.city, createdAt: order.createdAt,
        total: order.total, quantity: order.items.reduce((sum,item)=>sum+item.quantity,0),
        status: order.status, notification: order.notification.state };
    }));
    orders.push(...batch.filter(order => order !== null));
  }
  return { orders, cursor: page.cursor ?? null, emailReady: emailConfigured() };
}
export type OwnerOrder = NonNullable<Awaited<ReturnType<typeof ownerOrder>>>;
export type OwnerSummary = Awaited<ReturnType<typeof ownerOrderPage>>["orders"][number];
