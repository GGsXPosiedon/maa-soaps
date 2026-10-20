import { z } from "zod";
import { orderStatuses, safeTrackingUrl, type Fulfilment } from "./order-model";

export const fulfilmentUpdate = z.object({
  expectedVersion: z.number().int().min(0).max(100000),
  status: z.enum(orderStatuses),
  shipment: z.object({
    courier: z.string().trim().min(2).max(80),
    trackingNumber: z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9 /_-]+$/, "Use the courier's tracking number."),
    trackingUrl: z.string().trim().max(1000).refine(safeTrackingUrl, "Enter the courier's public HTTPS tracking link."),
  }).nullable(),
}).strict();

export class OrderConflictError extends Error {}
export function validateTransition(current: Fulfilment, next: z.infer<typeof fulfilmentUpdate>) {
  if (current.version !== next.expectedVersion) throw new OrderConflictError("This order changed in another window. Refresh it before saving.");
  const from = orderStatuses.indexOf(current.status), to = orderStatuses.indexOf(next.status);
  if (to < from || to > from + 1) throw new OrderConflictError("Move the order through Received, Packing, Shipped, and Delivered in order.");
  if (to >= 2 && !next.shipment) throw new OrderConflictError("Add the courier, tracking number, and tracking link before marking this order shipped.");
  if (current.status === "delivered") throw new OrderConflictError("A delivered order cannot be edited.");
}
