export const orderStatuses = ["received", "packing", "shipped", "delivered"] as const;
export type OrderStatus = typeof orderStatuses[number];
export const statusLabel: Record<OrderStatus, string> = {
  received: "Received", packing: "Packing", shipped: "Shipped", delivered: "Delivered",
};
export type Shipment = { courier: string; trackingNumber: string; trackingUrl: string };
export type OrderEvent = {
  version: number; status: OrderStatus; shipment: Shipment | null;
  createdAt: string; actor: string;
};
export type Fulfilment = {
  version: number; status: OrderStatus; shipment: Shipment | null;
  updatedAt: string; history: OrderEvent[];
};

export function safeTrackingUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      !url.port && host.includes(".") && !host.endsWith(".local") &&
      !host.endsWith(".localhost") && !/^[\d.]+$/.test(host) &&
      !host.includes(":") && host !== "localhost";
  } catch { return false; }
}

