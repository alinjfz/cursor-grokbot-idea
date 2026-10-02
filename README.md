# Good Find

**Sam remembers what you like, chooses something thoughtful, and lets you decide whether to buy it.**

Good Find is a shopping companion for two kinds of moments: when you need a lift and when you want to celebrate. Tell Sam your interests, spending limit, and anything to avoid. Sam searches live products, recommends one item or a complementary pair, explains the choice and its tradeoffs, then waits for your approval before opening a Stripe payment page.

## Watch the video

[![Watch the Good Find video](https://img.youtube.com/vi/e8Z_s6iChtY/hqdefault.jpg)](https://youtu.be/e8Z_s6iChtY)

[Watch on YouTube](https://youtu.be/e8Z_s6iChtY)

## What you can do

- **Introduce yourself once.** Save your name, interests, exclusions, per-moment limit, optional reminder time, and optional WhatsApp number for confirmations.
- **Choose a moment.** Ask Sam for a lift or a celebration pick. The **Demo: Sam checks in** button starts the check-in immediately.
- **See a considered choice.** Sam searches Shopify's live catalog, checks GBP prices and availability, and shows the seller, reason, price, and an honest caveat. A second item appears only when it complements the first and fits the limit.
- **Keep control.** Decline a choice to get another, or approve it and open Stripe Checkout. Good Find rechecks the selected variant and price before creating the payment session. Approval in the app does not charge you.
- **See paid orders.** The `/orders` page reads completed Stripe Checkout sessions and can send a WhatsApp confirmation through Wassist when configured.
- **Keep your preferences.** Your profile works in browser storage by default. Optional Supabase storage saves it against a private browser cookie.

## Run locally

You need Node.js and npm. From the project root:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can try onboarding and live product discovery without adding API keys: complete the short introduction, press **Demo: Sam checks in**, and choose a moment. Shopify Global Catalog supplies live product results. To proceed from approval to payment, configure Stripe.

For a production build, run `npm run build` followed by `npm run start`.

## Configuration

Keep secrets in `.env.local` or your deployment provider's server-side environment settings. The variables are listed in [`.env.example`](.env.example):

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | **Required for payment.** Creates the hosted Checkout session after a live product is rechecked and powers the Orders page. Use a test key for test payments. |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe's `checkout.session.completed` webhook. For local testing, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use its signing secret. The Orders return page can also confirm a completed session. |
| `WASSIST_API_KEY` | Optional WhatsApp confirmations for paid orders. `WASSIST_TO_NUMBER` is a fallback when no number was supplied at checkout. |
| `SUPABASE_URL` and `SUPABASE_SECRET_KEY` | Save companion profiles in Supabase. Apply [`supabase/companion_profiles.sql`](supabase/companion_profiles.sql) first. Keep the secret key on the server; never prefix it with `NEXT_PUBLIC_`. |
| `AI_GATEWAY_API_KEY` | Let Vercel AI Gateway help rank and explain verified product choices. `AI_GATEWAY_MODEL` selects the model. Without a key, Sam uses transparent ranking rules. |
| `TAVILY_API_KEY` | Add wider research links to the product explanation. Product discovery works without it. |

`APP_URL` sets the base URL for Stripe's success and cancel redirects; it defaults to the request host. The xAI and older Supabase service-role settings belong to the separate seeded-catalog routes.

## How it works

```text
Your profile + moment + spending limit
                │
                ▼
       /api/find searches Shopify
                │
                ▼
  Filter and rank live, buyable products
                │
                ▼
   Sam shows a choice and the tradeoffs
                │
         Your approval
                │
                ▼
 /api/verify rechecks price and availability
                │
                ▼
       Stripe Checkout payment
                │
                ▼
   /orders shows the paid session
                │
                ▼
  Optional WhatsApp confirmation
```

The app is built with Next.js, React, and TypeScript. The interface lives in [`app/(screen)/`](app/%28screen%29/); the live discovery and verification routes live in [`app/api/find/`](app/api/find/) and [`app/api/verify/`](app/api/verify/). Product filtering and ranking live in [`src/discovery/`](src/discovery/). Stripe Checkout and paid-session handling live in [`src/checkout/`](src/checkout/) and [`src/orders/`](src/orders/). Optional profile persistence is handled by [`app/api/profile/`](app/api/profile/).

## Purchase and data boundaries

- The spending limit controls recommendations; Good Find does not hold a wallet balance. Approval alone does not charge you, but completing Stripe Checkout does.
- Each selected item opens its own Stripe Checkout session, so a pair can require two payments. The code does not place an order with the Shopify seller or arrange fulfillment. Shipping and tax are not included in the displayed product total.
- The app stores profile preferences, feedback, and the optional WhatsApp number in this browser. With Supabase configured, it also stores profile memory under a private cookie, but the WhatsApp number is not part of that server-side profile. There is no account login or cross-device sync yet.
- The optional daily nudge appears when you next open the site after your chosen time. The demo button triggers the check-in immediately; there is no scheduled Grok Bot routine.
- The Orders page currently reads recent paid sessions from the configured Stripe account without a per-user filter. Do not use it as a private customer order history until access control is added.
- The repository also includes older seeded-catalog checkout routes alongside the live-product flow.

## More detail

- [`docs/hackathon-plan.md`](docs/hackathon-plan.md) — product workflow, service boundaries, and demo script.
- [`docs/grok-bot-setup.md`](docs/grok-bot-setup.md) — the separate Sam Grok Bot and its manual demo. The public website does not call that Bot as an API.

Built for the Cursor Commerce London Hackathon, September 2026.
