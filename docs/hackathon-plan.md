# Good Find: Sam, a companion who chooses

## The idea

Sam is for the moments when someone wants a little company and a thoughtful gesture: a difficult day, a small win, or a reason to celebrate. The person tells Sam about themselves once. Later they check in with one tap or respond to a gentle nudge. Sam searches real shops, chooses one item or a genuinely complementary pair, explains why it fits, and waits for approval before opening the seller's checkout.

The central promise is **a considered choice from live stock**, not a shopping search box. The person should feel seen by the choice and understand why Sam made it. The first categories are coffee, desk gear, gaming, fitness, books, food, grooming, outdoors and tech; Sam follows the individual's interests rather than gender assumptions. No flower concept.

## Complete user workflow

1. **Meet Sam once.** Ask for a first name, interests, a maximum for one moment, exclusions, and an optional reminder time. Save memory with an explicit explanation of where it lives.
2. **Notice the moment.** For the hackathon, press **Demo: Sam checks in**. Sam greets the person, who taps “I need a lift” or “I want to celebrate,” with an optional one-line note. The optional reminder greets them on their next visit after a chosen time.
3. **Choose in the background.** Search Shopify Global Catalog for live products related to the person's tastes and the moment. Use Tavily for wider context. Verify GBP price, stock, image, seller link, destination and exclusions. Reject vague novelty listings and Canadian-domain storefronts for the UK demo. Rank products and select one; add a second only when it complements the first and leaves at least £8 or 10% of the limit for possible shipping.
4. **Show the decision.** Lead with a warm note from Sam, real product imagery, a factual reason, a caveat, the total, the remaining room under the limit, and a short audit trail. Keep alternatives behind “choose again,” not as the primary UI.
5. **Learn.** Approval and “Not for me” update the remembered profile for every item in the choice, so rejected products are less likely to recur. Product records and images are never cached.
6. **Approve.** The person must explicitly approve the choice. Sam rechecks each selected variant before opening the merchant checkout. The merchant collects payment. For pairs from different merchants, there are separate checkout steps. Approval inside Good Find does not charge anyone.
7. **Return.** On the next visit in the same browser, Sam recalls interests, limit, exclusions, and feedback from Supabase. Browser-local memory is the fallback. Account-based cross-device sync remains a later step.

## What is working now

- The visual onboarding, demo check-in button, two moment choices, one chosen product, conditional pair, decision summary, rejection/retry, approval gate and seller checkout action are implemented.
- Live Shopify catalog search returns current GBP products with images and checkout URLs. A selected item is rechecked before redirect.
- Tavily supplies optional research links. The service call succeeded during testing.
- The site can rank with clear rules when no model is available.
- A Vercel AI Gateway adapter is coded and awaits an `AI_GATEWAY_API_KEY`; it can add richer reasoning without xAI credits.
- Profile and feedback persist in this browser and in a server-owned Supabase table under a private cookie. The optional reminder appears on the next visit after the selected time. Account login for cross-device sync is a later step.

## Grok Bot path for the hackathon

The owner has Cursor access and the Grok Bot desktop app. Grok Bot access is **separate from the xAI API**. A dedicated Sam Bot has been created and tested manually. It selected a real £55 OXO coffee grinder from John Lewis, and its reusable **Thoughtful moment** skill was saved. The Bot stopped before cart or payment. The user chose a demo button instead of a scheduled routine, so no daily routine is configured. See [grok-bot-setup.md](grok-bot-setup.md).

The public website cannot call the owner's Grok Bot as an inference API. For public users, Vercel AI Gateway is the preferred model option. Its free credit is limited, so the rules path stays available.

## Service boundaries

| Service | Purpose | Current state |
| --- | --- | --- |
| Shopify Global Catalog | Real cross-merchant product discovery and seller checkout links | Working locally |
| Tavily | Independent search context | Working with existing key |
| Grok Bot | Owner's personal companion | Sam Bot created, manual product choice verified, Thoughtful moment skill saved |
| Vercel AI Gateway | Public website's optional model reasoning | Adapter ready; key not configured |
| Supabase | Durable profile and feedback under a private browser cookie | Connected; table and access controls verified |
| Stripe test mode | Separate demonstration of a simulated payment and signed receipt | Existing routes; webhook secret missing; cannot buy live Shopify products through it |
| Wassist | Optional WhatsApp delivery | Deferred |

The Stripe Dashboard's test balance is merchant-side simulated proceeds, not a shopper allowance. Good Find's maximum is a **spending limit for a recommendation**, not money held by the app.

## Remaining work in priority order

1. **Deploy and rehearse.** Verify two distinct personal profiles, both moment types, a single item, a valid pair, “not for me,” approve/decline, price change handling, phone layout and a three-minute demo. The app needs a public URL for Grok Bot's cloud browser.
2. **Turn on model reasoning.** Add a Vercel AI Gateway key in local and deployment secrets. Verify that the model ranks only verified product IDs and never invents prices, shipping, stock or product features.
3. **Add account sync if desired.** Supabase now saves server-side memory under a private cookie. Add user login only if the same profile must follow someone across browsers and devices.

## Demo script

1. Open Good Find as a new user. Introduce “Alex,” coffee and desk gear, £60, and “no espresso equipment.”
2. Press **Demo: Sam checks in**, then tap “I need a lift.” Sam returns a real current choice and, if there is a valid complement, a pair. Show why it fits and the current total.
3. Tap “Not for me.” Sam remembers the rejection and searches again.
4. Approve the new choice. Open the seller checkout only after price recheck, stopping before payment.
5. Open the Sam Grok Bot conversation and show its completed manual run and saved skill with the same approval boundary.

## Hackathon acceptance criteria

- A new person can complete onboarding and reach a real product choice in under a minute.
- The top choice is specific to interests, moment and budget; changing them changes the decision.
- A pair appears only when the two items make sense together and both fit the limit.
- Every shown price and availability comes from a live catalog record. Checkout is revalidated.
- The person can decline and get a different recommendation.
- No purchase happens before explicit approval; the app does not claim Stripe test charges buy another merchant's goods.
- Grok Bot's manual choice is shown as a real run. The demo button triggers the website check-in; no scheduled routine is claimed.
