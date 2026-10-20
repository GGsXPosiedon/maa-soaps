import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), reference: text("reference").notNull().unique(), idempotencyKey: text("idempotency_key").notNull().unique(), fingerprint: text("fingerprint").notNull(),
  name: text("name").notNull(), email: text("email").notNull(), phone: text("phone").notNull(), address: text("address").notNull(), city: text("city").notNull(), state: text("state").notNull(), postcode: text("postcode").notNull(),
  subtotal: integer("subtotal").notNull(), discount: integer("discount").notNull(), shipping: integer("shipping").notNull(), total: integer("total").notNull(), currency: text("currency").notNull().default("INR"), coupon: text("coupon").notNull().default(""),
  status: text("status").notNull().default("received"), paymentMethod: text("payment_method").notNull().default("cod"), createdAt: text("created_at").notNull(),
}, t => [index("orders_created_idx").on(t.createdAt)]);
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id), productId: text("product_id").notNull(), name: text("name").notNull(), quantity: integer("quantity").notNull(), unitPrice: integer("unit_price").notNull(),
}, t => [index("order_items_order_idx").on(t.orderId)]);
export const messages = sqliteTable("messages", { id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(), message: text("message").notNull(), createdAt: text("created_at").notNull() });
