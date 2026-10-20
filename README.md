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
- Contact submissions are saved privately. Contact email and SMS notifications are not configured.
- API routes: GET /api/products; POST /api/orders; POST /api/orders/track; POST /api/contact.

Order records are private JSON documents under `orders/MAA-<reference>.json`; messages are under `messages/<uuid>.json`. The Vercel project uses short-lived OIDC credentials and BLOB_STORE_ID, with no static storage secret in the code.

## Manage orders

Open **[the private order dashboard](https://maa-soaps.vercel.app/admin)**. Set up sign-in with the exact verified email configured in `MAA_OWNER_EMAIL`. Clerk manages sign-in; every dashboard API independently checks the verified owner email. Other signed-in accounts cannot access order data. Customer checkout does not require an account.

- Filter the order book by status, search loaded orders, or open a full order reference directly. Load additional pages as needed; dates are sorted within the loaded orders, not across unloaded pages.
- Open an order for soap quantities, COD total, delivery address, contact details, and a printable packing slip.
- Move orders through **Received → Packing → Shipped → Delivered**. Shipped requires a courier name, tracking/AWB number, and public HTTPS tracking link. Book the courier separately and update delivery status manually.
- Customers use their reference and checkout email in **Track an order** to see progress and the courier link. Their phone and full address are not returned by public tracking.

Fulfilment changes are immutable revision documents under `fulfilment/<reference>/`. Expected-version checks and create-only writes reject stale or concurrent updates instead of overwriting them. Delivered orders cannot be edited.

## Owner email alerts

**Owner email alerts are connected in production.** A live checkout test on 20 October 2026 verified that Resend accepted the owner alert and the app saved its private acceptance receipt. API keys are stored only in Vercel environment variables. The dashboard displays a setup notice if email configuration is missing. Without a verified sending domain, Resend's `onboarding@resend.dev` sender can send only to the email address on the Resend account. Branded senders and other recipients require a verified domain.

Configure these server-side Vercel environment variables:

| Variable | Purpose |
| --- | --- |
| `MAA_OWNER_EMAIL` | Verified email allowed to open the owner dashboard |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Managed by the connected Clerk integration |
| `RESEND_API_KEY` | Secret sending key from the owner's Resend account |
| `ORDER_ALERT_EMAIL` | Owner's alert destination; never supplied by checkout callers |
| `ORDER_ALERT_FROM` | Sender; initially `Maa Soaps <onboarding@resend.dev>` |
| `APP_URL` | Canonical storefront URL used in private dashboard links |
| `CRON_SECRET` | Production secret authenticating the daily recovery job |

New orders are saved before an alert is attempted. A private outbox entry is created before the response; sending runs after the checkout response, so provider failures do not turn a saved order into a failed checkout. Resend requests use a stable idempotency key, shared storage leases limit concurrent attempts, and accepted messages get persistent private receipts. An accepted receipt means the provider accepted the email, not that it reached the inbox.

Pending alerts can be retried from an order. A protected daily recovery job runs at 03:00 UTC (08:30 India time), within a bounded time budget. This is a recovery pass, not a real-time retry schedule; use the dashboard for immediate retries or a large backlog. Resend's idempotency window is 24 hours, so an ambiguous send whose receipt could not be saved should be checked in Resend before retrying. No customer confirmation emails are sent.

Operational API routes are authenticated under `/api/admin/orders`; the cron route is `/api/cron/order-alerts`. Order data, notification receipts, and queue documents remain in private storage. The owner UI uses an achromatic ledger layout with the shop's wordmark and a packing list as its main action.

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

Product names, formulas, ingredient lists, sizes, images, and prices are sample content and are labelled accordingly on the site. Confirm the actual catalog, delivery coverage, shipping charges, returns terms, business contact details, and fulfilment process before accepting customer orders. Online payments, courier booking, inventory management, and tax invoices are not integrated; checkout records COD order requests.

## Verification

The Next.js production compilation and TypeScript check passed locally. Local API checks cover authoritative pricing, persisted orders, replay and concurrent idempotency, invalid products/quantities/coupons, origin restrictions, private order lookup, and contact storage. Owner-flow checks use temporary real Clerk development sessions and isolated local SQLite storage: unauthenticated and other-account denial, CSRF rejection, status transitions, concurrent updates, courier validation, tracking privacy, and missing-email-key behavior. Email-outbox tests use mocked provider responses. A separate production checkout test confirmed a saved private order, real Resend acceptance, cleared alert queue, and privacy-filtered customer tracking; its synthetic records were removed. Provider acceptance does not establish inbox delivery. The original ThreeUI source/asset hash check passed for all 23 entries.

`scripts/test-owner-flow.mjs` expects a temporary Clerk QA session file via `MAA_QA_SESSION_FILE` (default `.sites-runtime/owner-qa.json`) and a local development server. `MAA_LOCAL_TEST_MODE=1` isolates order storage and disables real email only in development outside Vercel; it cannot bypass owner authentication or activate in production. Do not run these synthetic order tests against the live shop.
