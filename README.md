# Pot

A bot spends a little of a household pot. The browser only draws JSON. Stripe, the catalog, and the bot stay on the server.

## Who edits what

| Side | Who | Folders |
|---|---|---|
| Backend | Backend owner | `src/`, `app/api/`, `supabase/` |
| Frontend | ALI | `app/(screen)/` |
| Contract | Both, then frozen | `src/contract/types.ts` |

Work on `main`. Stay out of the other side’s folders. A field change happens in `src/contract/types.ts` and both callers, in one commit.

ALI can build the page with fixtures: set `USE_FIXTURES` to `true` in `app/(screen)/data.ts`. The backend can hit the routes with curl before the page exists.

## Layers

Each layer is a folder. They call downward only.

| Layer | Edit | Job |
|---|---|---|
| Data | `src/data/seed.ts`, or the Supabase tables | Pot, catalog, ledger |
| Rules | `src/pot/rules.ts` | What is left, banned, and under the cap |
| Bot | `src/bot/prompt.ts` | Which SKUs, and why one was left out |
| Checkout | `src/checkout/session.ts` | Re-price, authorize again, open Stripe |

`app/api/*` is thin. Put behaviour in the layer, not in the route.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

With no keys, the page uses the seed pot (£40, £15 cap) and a handwritten bundle. Pay needs `STRIPE_SECRET_KEY`. The balance only sticks on Vercel once Supabase is set, because a serverless process forgets the in-memory pot.

```bash
curl http://localhost:3000/api/pot
curl -X POST http://localhost:3000/api/decide
```

## Vercel

Import the repo. Set the same variables as `.env.example`. `APP_URL` can stay empty; the checkout return URL uses the request host.

Point the Stripe webhook at `https://<your-domain>/api/webhooks/stripe` for `checkout.session.completed`. Locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Demo card: `4242 4242 4242 4242`, any future expiry, any CVC. The pot moves only when that webhook lands.

## Supabase

Run `supabase/schema.sql`, then `supabase/seed.sql`, in the SQL editor. Put the project URL and service role key in `.env.local`. Re-running the seed puts the pot back to £40.

## Done when

One pass on the page: balance before, a bundle with a reason and one SKU left out, a Stripe test payment, balance after matching the charge.
