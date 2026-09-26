# Layer split

You and ALI build the same demo without editing the same files. Source of the product: `docs/gist.md`. Hackathon brief: `docs/info.md`.

## The demo

Someone living alone puts money in a pot. A bot may spend it on a small bundle that would cheer him up: a treat, a shirt, flowers. The screen shows the bundle, the price, the money left, and why those SKUs were grouped (and why a nicer one was left out). Checkout is a real Stripe sandbox session.

10-second read: money in, bot chooses, checkout out.

## Who owns what

| Layer | Owner | Folder | Job |
|---|---|---|---|
| Contract | Both, then frozen | `src/contract/` | Types both sides share |
| Pot | You | `src/pot/`, `app/api/pot/`, `supabase/` | Balance, rules, bans, ledger |
| Catalog | You | `src/catalog/`, `app/api/catalog/` | Closed list of SKUs and prices |
| Checkout | You | `src/checkout/`, `app/api/checkout/`, `app/api/webhooks/stripe/` | Stripe sandbox session and webhook |
| Bot | ALI | `src/bot/`, `app/api/decide/` | Pick a bundle inside the rules |
| Screen | ALI | `app/(screen)/` | Pot, bundle, reasons, pay button |

Swap the names if you want. Do not swap the folders. Checkout stays with the pot, because the charge and the balance are one story. The bot stays with the screen, because the decision and the reason are one story.

## What each layer must not do

- The bot does not set prices, write the ledger, or call Stripe.
- The screen does not import the Stripe SDK. It asks checkout for a URL.
- Checkout does not invent SKUs. Line items come from the catalog price.
- The pot does not choose products.
- Nobody edits a folder they do not own.

## Contract

Write this once, together, before either of you builds. After that, only add fields. Do not rename fields that the other person already calls.

`src/contract/types.ts` is the only shared code file.

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

Money is integer pence. No floats.

## How the layers talk

ALI can stub your routes. You can stub his decide route. The shapes below are the seam.

**You expose**

`GET /api/pot` → `Pot` plus past orders the bot may read: `{ sku, name }[]`.

`GET /api/catalog` → `Sku[]`. Only products you stock. The bot may not add one.

`POST /api/checkout` body `{ items: { sku: string, qty: number }[] }` → `Checkout`.

You re-price every SKU from the catalog. If the total is over `balance_pence` or `cap_pence`, or a SKU is banned or missing, return `409` and do not open Stripe.

`POST /api/webhooks/stripe` is yours alone. On `checkout.session.completed` in test mode, subtract the total from the pot and write one ledger row: session id, SKUs, amount, time.

**ALI exposes**

`POST /api/decide` → `Bundle`.

He reads pot and catalog. He returns a few SKUs that fit one occasion and the cap. Each item has a `why`. `left_out` names one prettier SKU he refused, and why. If nothing legal fits, he returns an empty `items` array and a reason, and he does not call checkout.

**ALI’s screen**

One page. Balance and cap at the top. Button: choose. Then the bundle, the total, the balance after, the reasons, the left-out line. Button: pay. That button calls `POST /api/checkout` and sends the browser to `url`.

## Stripe sandbox

Test mode only. Keys live in `.env.local`, which stays untracked.

- Secret key: `sk_test_...` — server only, inside `src/checkout/`.
- Publishable key is unused if you use Stripe Checkout (hosted page). Prefer that. The judge pays on Stripe, then comes back.
- Success URL returns to the screen with `?session_id=`.
- Cancel URL returns to the same screen with the pot unchanged.
- Demo card: `4242 4242 4242 4242`, any future expiry, any CVC.
- A webhook secret `whsec_...` from `stripe listen` confirms the payment before the pot moves. Until the webhook lands, the screen may show “waiting”, not “spent”.

The bot never sees the card and never confirms the charge. The human pays in Stripe. The rules on screen are the authorization: cap, bans, and remaining balance.

## Build order

1. Freeze `src/contract/types.ts`.
2. You seed three SKUs and a pot with a known balance (example: £40 pot, £15 cap). ALI hard-codes the same JSON behind his stubs.
3. ALI’s decide route returns one fixed legal bundle and one left-out SKU, still from your seed.
4. You open a Stripe test Checkout for that bundle.
5. ALI replaces the fixed bundle with a real choice from pot + catalog.
6. You replace the stub prices with catalog prices and debit the pot on the webhook.

If step 5 slips, step 4 is still a demo: money in, a bundle with a reason, a Stripe test payment, balance down.

## Conflict rules

- One owner per directory in the table. `git pull` before you start a file, and stay inside your tree.
- Do not reformat files you do not own.
- API paths and the field names in the contract are fixed. Change them only in a pair, in one commit, on `src/contract/types.ts` plus both callers.
- Seed data lives in `supabase/` or `src/catalog/seed.ts` (you). ALI reads it over HTTP, not by importing your seed file.
- `.env.local` is never committed. ALI does not need the Stripe secret.

## Done when

A judge can put the test card through once and see all of this on one screen:

- pot balance before
- a small bundle chosen from the catalog
- a reason on each SKU and one SKU left out
- a Stripe sandbox checkout
- pot balance after, matching the charge
