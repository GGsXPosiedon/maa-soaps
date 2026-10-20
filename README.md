# Maa Soaps

[![Live website on Vercel](https://img.shields.io/badge/LIVE_WEBSITE-Visit_Maa_Soaps-405238?style=for-the-badge&logo=vercel&logoColor=white)](https://maa-soaps.vercel.app)

> **Visit the live website: [maa-soaps.vercel.app](https://maa-soaps.vercel.app)**

A full-stack botanical soap storefront for India, with INR prices and cash on delivery. Built with Next.js 16, React 19, Radix UI, and private Vercel Blob storage.

## Run locally

Use Node.js 24 and npm. Run `npm ci`, then `npm run dev`. Next.js prints the local URL (usually http://localhost:3000). Run `node scripts/test-order-flow.mjs http://localhost:3000` against that development server to check checkout and tracking with synthetic records.

Development without Blob uses a local SQLite file at `.sites-runtime/orders-dev.sqlite`. Hosted production requires a connected private Blob store; it returns an error if storage is unavailable. Never put credentials in source control.

## Storefront and backend

- Four illustrated sample products, filters, sorting, ingredient dialogs, and an interactive botanical notebook.
- Persistent shopping bag, quantity limits, WELCOME10 discount (10%, capped at INR 150), and server-calculated prices. Delivery is INR 60, free for discounted merchandise totals of INR 799 or more.
- Cash-on-delivery checkout with Indian mobile/PIN validation, immutable saved order documents, and idempotency protection against duplicate submissions.
- Order lookup requires the reference and checkout email. Tracking responses exclude delivery address and phone.
- Contact submissions are saved privately. No email or SMS notifications are configured.
- API routes: GET /api/products; POST /api/orders; POST /api/orders/track; POST /api/contact.

Order records are private JSON documents under `orders/MAA-<reference>.json`; messages are under `messages/<uuid>.json`. The Vercel project uses short-lived OIDC credentials and BLOB_STORE_ID, with no static storage secret in the code. Inspect these documents in the Maa Soaps private Blob store in your Vercel dashboard. There is no administration dashboard or fulfilment automation yet.

## Deploy on Vercel

The linked project is `swamishubham2005-4746/maa-soaps`. Its private store is `maa-soaps-orders` in Mumbai (bom1), matching the Function region in vercel.json. The build command is `npm run build`.

For subsequent releases, use `vercel deploy --prod` from this directory while signed in to the same account. The local `.vercel` and `.env*` files are excluded from the source archive. Link the project again with `vercel link --project maa-soaps --scope swamishubham2005-4746` when working from a fresh copy.

The old Sites/Vinext preview helpers are retained for provenance and are not the Vercel runtime. `vite.config.ts` and preview helper sources are excluded from the Next.js production type check. The native production build uses next.config.ts.

## Exact ThreeUI source integration

The attached specification requested MengToSketchbookLandingPage and an exact registered revision. All 6 registered source files and 17 binary assets match the attached SHA-256 manifest. The canonical original is public/landing-pages/meng-to-sketchbook.html; the manifest and original TypeScript sources are in vendor/threeui-registered/.

The npm package @designcodeio/threeui@1.2.0 contains the matching canonical HTML and binary assets but an older wrapper API. The registered component function and its helpers were transpiled into lib/threeui/. Next.js maps the original package imports to that exact-source runtime. app/sketchbook.tsx supplies the requested typography/color props and an applyScene callback, which adapts notebook copy and artwork at runtime while leaving the canonical source file unchanged. The original page-turn, magnifier, zoom, and keyboard engine remain in use.

Source: https://threeui.com/source-code/meng-to-sketchbook-landing-page.json
Package: https://www.npmjs.com/package/@designcodeio/threeui/v/1.2.0
Canonical SHA-256: e0330548b1ac905cf1b81698163ffa29f8a3a8c39b8d39f9b71ba5b9255b6dd1

Botanical soap SVG illustrations were created for this storefront. The soap still life was AI generated as illustrative sample photography. The bundled Fragment Mono font includes its license in lib/threeui/fonts/.

## Launch content to confirm

Product names, formulas, ingredient lists, sizes, images, and prices are sample content and are labelled accordingly on the site. Confirm the actual catalog, delivery coverage, shipping charges, returns terms, business contact details, and fulfilment process before accepting customer orders. Online payments, inventory management, tax invoices, and email notifications are not integrated; checkout currently records COD order requests only.

## Verification

The Next.js production compilation and TypeScript check passed locally. Local API checks cover authoritative pricing, persisted orders, replay and concurrent idempotency, invalid products/quantities/coupons, origin restrictions, private order lookup, and contact storage. The original ThreeUI source/asset hash check passed for all 23 entries. Deployment and browser verification are recorded in the delivery notes.
