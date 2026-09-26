# Hackathon gist

Cursor Commerce London Hackathon. Saturday 26 September 2026, Fleek HQ. Source: `docs/info.md`.

## The job

Build agentic commerce. A bot that discovers, decides, and transacts. The room wants to see a bot shop, a merchant run, a new kind of marketplace, or something that only exists because a bot and a checkout were designed together.

The brief’s questions, in short:

- What does a storefront look like when the customer is a bot?
- How does a merchant sell to a bot?
- Can a bot negotiate, or transact with another bot?
- How does a human authorize an autonomous purchase?
- What happens to search and loyalty when the bot chooses?
- How is that spend trustworthy and observable?

Ship a working demo. Real commerce infrastructure beats a fake cart.

## Clock

Two schedules are in the source. Plan against the earlier freeze.

| | Page | Later host messages |
|---|---|---|
| Hacking starts | 9:35 | 9:45 |
| Lunch | 1:30 | 1:30 |
| Code freeze | 4:45 | 4:30 |
| Live demos | 5:15, top 5, 3 min | 5:30, top 5, 3 min |
| Close | 6:00 | 6:00 |

Every team submits a working demo at freeze. Only the top 5 present live, for 3 minutes. Solo or up to 3 people.

## What judges score

Technical execution. Product thinking. AI leverage and autonomy. Commerce innovation. Real-world usefulness. UX. Demo quality.

Hosts also asked: how far does it push e-commerce, how useful is it, does it move the needle. Judges include the Fleek team. Fleek is a wholesale secondhand-fashion marketplace. That is context, not a requirement to build for clothes.

Tracks named so far: Marketplaces, Shopping, Merchants, Infrastructure, plus sponsor challenges still TBA.

## Stack named in the brief

Build with Cursor, Grok Bots, Origin, and Supabase. Use Shopify and modern commerce APIs instead of inventing checkout. Discord channels exist for Grok Bot, Supabase, Tavily, and Wassist. Later messages also name Vercel, Huge, and Fleek.

Origin is Cursor’s git host. It is where the project can live. It is not a payments API.

Brought in after the brief, so only use them if a login already works: Commerce Layer (SKU to checkout URL), Sanity (live product documents), Recharge (subscriptions on Shopify), Wassist (WhatsApp). A pre-seeded store plus one bot action beats configuring a platform on stage.

## Demo rules of thumb

- One action a judge can see: a bot spends, refuses, bundles, or opens a real checkout.
- The bot does one job and has explicit things it must not do.
- Seed markets, shipping, payments, and products before the demo. On stage, create or choose the order.
- A closed catalog you control will survive the room. A live browse of a random retailer often will not.
- Show the reason next to the money: rule, evidence, price. That is the observability line in the brief.
- A human still authorizes, or a pre-written rule does. An uncapped bot spending on its own is a weaker story here.

## The idea

Someone living alone puts money aside in an account. A bot may spend that money on small things for him: food as a treat, clothes, flowers, anything small that would cheer him up. He wants the purchase to feel like someone cared enough to choose it.

The problem to build is ecommerce, not psychology. The bot has to work out what he would actually like, then turn that into a bundle he can check out. Tools do the deciding: a catalog, his past orders, a budget, a ban list, and a checkout. The feeling is the setting. The thing on screen is a bundle, a price, the money left in the pot, and a reason those SKUs were grouped.

Keep in view:

- The hero output is a bundle with a price, a remaining balance, and a checkout.
- “What he likes” comes from commerce signals: past orders, a short allow-list, sizes, foods he already buys, a budget, a ban list. One photo or one receipt is enough input.
- A bundle is a few SKUs that fit one occasion and one cap. Show why these items were grouped, and why a prettier item was left out.
- The bot shops inside the pot. It does not invent products you do not stock.
- Authorization is the balance and the rules, visible on screen, before the purchase.
- The 10-second read: money in, bot chooses a small bundle, checkout out.

## Links

Hackathon

- Page: https://gb-ecommerce-hackathon-09-2026.teamdeel.workers.dev/hackathon
- Brief in this repo: `docs/info.md`

Grok Bot

- Marketplace: https://x.ai/bot/marketplace
- dr eggbot (designs a bot with one job and explicit refusals): https://x.ai/bot/marketplace/bots/dr-eggbot-v2
- grok-bot skill: https://www.skills.sh/adamanz/grok-bot-skill

Cursor

- Origin: https://cursor.com/docs/origin
- pstack: https://cursor.com/marketplace/cursor/pstack

Commerce

- Shopify UK: https://www.shopify.com/uk
- Shopify agentic commerce docs: https://shopify.dev
- Commerce Layer manual setup (org, SKUs, prices, order, checkout URL): https://docs.commercelayer.io/core/onboarding/manual-configuration
- Commerce Layer docs index: https://docs.commercelayer.io/llms.txt
- Recharge subscriptions: https://docs.getrecharge.com/docs/understanding-recharge
- Recharge docs index: https://docs.getrecharge.com/llms.txt
- Sanity: https://www.sanity.io/
- Wassist: https://docs.wassist.app/
- Stripe agents: https://docs.stripe.com/agents

Venue context

- Fleek: https://www.joinfleek.com/home
