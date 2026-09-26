# Frontend and backend

The demo from `docs/gist.md`: money goes into a pot, a bot picks a small bundle from a closed catalog, the screen shows the price, the money left, and why those SKUs were grouped. Pay happens in Stripe sandbox.

The browser never holds a Stripe key, a catalog price, or the bot. It only draws JSON the server sends back.

```
Browser                         Server
──────                          ──────
screen                          API routes
  pot balance                     /api/pot        pot + rules
  bundle + reasons                /api/catalog    SKUs and prices
  left-out line                   /api/decide     bot
  Pay button                      /api/checkout   Stripe sandbox
       │                          /api/webhooks/stripe
       │  JSON only                      │
       └────────────────────────────────►│
                                         ├── Supabase  pot, ledger, catalog
                                         ├── Grok      chooses the bundle
                                         └── Stripe    hosted test checkout
```

You take the backend. ALI takes the frontend. That is the whole file split.

| Side | Owner | Folders |
|---|---|---|
| Backend | You | `src/`, `app/api/`, `supabase/` |
| Frontend | ALI | `app/(screen)/` |
| Contract | Both, then frozen | `src/contract/types.ts` |

## Backend

Four layers. Each one is a folder. They call downward only.

**1. Data** — `supabase/`

One pot: balance, cap, bans, allow-list, sizes, past orders. One catalog: SKU, name, price in pence, tags. One ledger row per successful payment: Stripe session id, SKUs, amount, time. Seed this before the demo (£40 pot, £15 cap, a handful of SKUs). The bot cannot add a product that is not in this table.

**2. Rules** — `src/pot/`

Reads the pot. Answers: what is left, what is banned, what the cap is. Refuses a charge that would pass the balance or the cap. This is the authorization. It is checked again at checkout, not only when the bot decides.

**3. Bot** — `src/bot/`, `app/api/decide/`

Reads the pot and the catalog. Returns a few SKUs for one occasion under the cap. Each SKU has a reason. One prettier SKU is named in `left_out` with why it was dropped. If nothing legal fits, it returns no items and a reason. It does not set prices, write the ledger, or call Stripe.

**4. Checkout** — `src/checkout/`, `app/api/checkout/`, `app/api/webhooks/stripe/`

`POST /api/checkout` takes SKUs, re-prices them from the catalog, runs the rules, and opens a Stripe Checkout Session in test mode. The response is a URL. The webhook `checkout.session.completed` is the only thing that subtracts from the pot.

Stripe stays on the server:

- Secret key `sk_test_...` in `.env.local`, never committed, never sent to the browser.
- Hosted Checkout, so the publishable key is unused. The judge pays on Stripe’s page.
- Success URL comes back to the screen with `?session_id=`. Cancel leaves the pot as it was.
- Demo card: `4242 4242 4242 4242`, any future expiry, any CVC.
- Webhook secret `whsec_...` from `stripe listen`. Until that event lands, the pot has not moved.

## Frontend

One page, `app/(screen)/`. No Stripe SDK. No business rules. Four states, in order:

1. **Pot.** Balance and cap, loaded from `GET /api/pot`.
2. **Choice.** A Choose button calls `POST /api/decide`. Show each SKU, its price, its reason, the total, the balance after, and the left-out line.
3. **Pay.** A Pay button calls `POST /api/checkout` and sends the browser to the returned `url`.
4. **After.** On the way back from Stripe, show the new balance from `GET /api/pot`. If the webhook has not landed yet, show waiting, not spent.

Empty decide (no legal bundle) stays on the page with the reason. A `409` from checkout stays on the page with the error. The pot does not change.

## Contract

Freeze `src/contract/types.ts` before building either side. Money is integer pence.

```ts
type Sku = {
  sku: string;
  name: string;
  price_pence: number;
  tags: string[];
};

type Pot = {
  balance_pence: number;
  cap_pence: number;
  bans: string[];
  allow: string[];
  sizes: string[];
  past_orders: { sku: string; name: string }[];
};

type BundleItem = {
  sku: string;
  name: string;
  price_pence: number;
  why: string;
};

type Bundle = {
  items: BundleItem[];
  total_pence: number;
  balance_after_pence: number;
  occasion: string;
  left_out: { sku: string; why: string }[];
};

type Checkout = {
  url: string;
  session_id: string;
};
```

| Call | Who | Body | Returns |
|---|---|---|---|
| `GET /api/pot` | Frontend | — | `Pot` |
| `GET /api/catalog` | Bot, on the server | — | `Sku[]` |
| `POST /api/decide` | Frontend | — | `Bundle` |
| `POST /api/checkout` | Frontend | `{ items: { sku: string, qty: number }[] }` | `Checkout` or `409` |

The frontend does not call `/api/catalog` or the webhook. The bot calls catalog inside the server.

## Working apart

ALI can build the page against hardcoded JSON in the shapes above. You can build the routes and hit them with curl before the page exists. Swap the JSON for the live routes when both sides match the contract.

Do not edit the other side’s folders. Change a field name only together, in `src/contract/types.ts` and both callers, in one commit.

## Done when

One pass on the page: balance before, a bundle with a reason and one SKU left out, a Stripe test payment, balance after matching the charge.
