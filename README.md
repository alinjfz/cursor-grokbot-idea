# Good Find

**Sam remembers what you like, chooses something thoughtful, and lets you decide whether to buy it.**

Good Find is a shopping companion for two kinds of moments: when you need a lift and when you want to celebrate. Tell Sam your interests, spending limit, and anything to avoid. Sam searches live products, recommends one item or a complementary pair, explains the choice and its tradeoffs, then waits for your approval before opening the seller's checkout.

## Watch the video

[![Watch the Good Find video](https://img.youtube.com/vi/e8Z_s6iChtY/hqdefault.jpg)](https://youtu.be/e8Z_s6iChtY)

[Watch on YouTube](https://youtu.be/e8Z_s6iChtY)

## What you can do

- **Introduce yourself once.** Save your name, interests, exclusions, per-moment limit, and optional reminder time.
- **Choose a moment.** Ask Sam for a lift or a celebration pick. The **Demo: Sam checks in** button starts the check-in immediately.
- **See a considered choice.** Sam searches Shopify's live catalog, checks GBP prices and availability, and shows the seller, reason, price, and an honest caveat. A second item appears only when it complements the first and fits the limit.
- **Keep control.** Decline a choice to get another, or approve it and open the seller's checkout. Good Find rechecks the selected variant before redirecting. Approval in the app does not charge you.
- **Keep your preferences.** Your profile works in browser storage by default. Optional Supabase storage saves it against a private browser cookie.

## Run locally

You need Node.js and npm. From the project root:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can try the main shopping flow without adding API keys: complete the short introduction, press **Demo: Sam checks in**, and choose a moment. Shopify Global Catalog supplies live product results and seller checkout links.

For a production build, run `npm run build` followed by `npm run start`.

## Configuration

Keep secrets in `.env.local` or your deployment provider's server-side environment settings. The main flow uses these optional variables from [`.env.example`](.env.example):

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` and `SUPABASE_SECRET_KEY` | Save companion profiles in Supabase. Apply [`supabase/companion_profiles.sql`](supabase/companion_profiles.sql) first. Keep the secret key on the server; never prefix it with `NEXT_PUBLIC_`. |
| `AI_GATEWAY_API_KEY` | Let Vercel AI Gateway help rank and explain verified product choices. `AI_GATEWAY_MODEL` selects the model. Without a key, Sam uses transparent ranking rules. |
| `TAVILY_API_KEY` | Add wider research links to the product explanation. Product discovery works without it. |

The example file also lists Stripe, xAI, and an older Supabase service-role key for the separate legacy test-checkout routes. None is required to try Sam's live-product flow.

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
         Seller's checkout
```

The app is built with Next.js, React, and TypeScript. The interface lives in [`app/(screen)/`](app/%28screen%29/); the live discovery and verification routes live in [`app/api/find/`](app/api/find/) and [`app/api/verify/`](app/api/verify/). Product filtering and ranking live in [`src/discovery/`](src/discovery/). Optional profile persistence is handled by [`app/api/profile/`](app/api/profile/).

## Purchase and data boundaries

- The spending limit controls recommendations; Good Find does not hold a wallet balance or charge a payment method.
- Each item opens its own seller checkout, so a pair can require two checkouts. The seller confirms shipping, tax, final price, and payment.
- The app stores profile preferences and feedback in this browser. With Supabase configured, it also stores profile memory under a private cookie; there is no account login or cross-device sync yet.
- The optional daily nudge appears when you next open the site after your chosen time. The demo button triggers the check-in immediately; there is no scheduled Grok Bot routine.
- The repository also includes an older Stripe **test-mode** checkout for a seeded catalog. It is separate from purchasing the live Shopify products shown by Sam.

## More detail

- [`docs/hackathon-plan.md`](docs/hackathon-plan.md) — product workflow, service boundaries, and demo script.
- [`docs/grok-bot-setup.md`](docs/grok-bot-setup.md) — the separate Sam Grok Bot and its manual demo. The public website does not call that Bot as an API.

Built for the Cursor Commerce London Hackathon, September 2026.
