# Good Find

Sam is a shopping companion for the moments when someone needs a lift or wants to celebrate. They introduce themselves once, then Sam searches current products and chooses one thing or a natural pair. Sam shows the reason, source, current price and limit check, then waits for approval before opening a seller checkout.

The [hackathon plan](docs/hackathon-plan.md) covers the workflow and remaining work. The [Grok Bot guide](docs/grok-bot-setup.md) contains the dedicated Bot description and verified manual run.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). Answer the short one-time introduction, press **Demo: Sam checks in**, then try both moments. The browser keeps profile memory even without a database. With `SUPABASE_URL` and a server-only `SUPABASE_SECRET_KEY`, the app also saves memory to the `companion_profiles` table defined in [supabase/companion_profiles.sql](supabase/companion_profiles.sql). It uses a private browser cookie; account login for cross-device sync is not yet built.

Shopify Global Catalog powers live product search and seller checkout links without an app API key. `TAVILY_API_KEY` adds wider research context. `AI_GATEWAY_API_KEY` enables optional Vercel AI Gateway reasoning; without it, Sam uses transparent ranking rules. The owner can separately run the Sam Grok Bot and its saved Thoughtful moment skill through paid Cursor access. Grok Bot is not a callable model API for the public website.

## Payments

Every choice requires explicit approval. The site rechecks the selected Shopify variant before opening the seller checkout. The seller handles the actual payment. A pair may require two seller checkouts. Approval inside Good Find does not charge anyone.

The repo still contains an older Stripe test-mode flow. It is separate from purchases of live Shopify products. The Stripe test balance is simulated merchant proceeds, not the person's Good Find spending limit.

## Current limits

- The on-stage check-in is triggered by the demo button. An optional in-site nudge appears when the person next opens the page after their chosen time. No Grok Bot routine is scheduled.
- Profile data is saved in this browser and, when configured, in Supabase under a private cookie. It is not yet shared between browsers or devices.
- Product images and catalog results are fetched live and are not saved in Supabase.
- Shipping and tax are confirmed by each merchant at checkout.
- The optional Vercel AI Gateway key is not configured; the site uses transparent ranking rules. The Grok Bot is a separate manual demo surface.
