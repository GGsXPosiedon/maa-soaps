import { products } from "../../../lib/catalog";
export function GET() { return Response.json({ products, currency: "INR", sampleCatalog: true, paymentMethods: ["cod"] }, { headers: { "Cache-Control": "public, max-age=300" } }); }
