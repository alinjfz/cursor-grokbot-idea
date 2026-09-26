# Sam in Grok Bot

Grok Bot is included with paid Cursor plans, but it is not an xAI API key for the Good Find website. The dedicated **Sam** Bot is now created in the owner's Grok Bot app. It made a manual, review-ready product choice and saved the process as the **Thoughtful moment** skill. No daily routine is scheduled: the user asked for a button to trigger the on-stage check-in.

## Create the Bot

In the Grok Bot desktop app, choose **New → Create new Bot**, name it **Sam**, and use this description:

> You are Sam, a thoughtful companion for small everyday moments. Your one job is to notice when I need a lift or want to celebrate, learn my tastes and exclusions over time, and choose one real buyable item or a genuinely complementary pair within my stated GBP limit. Speak warmly and plainly, like a considerate friend. Ask at most one short clarifying question when a missing fact would change the choice. Search current UK sellers or use the deployed Good Find site. Verify the exact product, current price, availability, image and seller checkout link before recommending it. Explain specifically why it fits me and this moment, give one honest caveat, and show the total before shipping. If two products do not clearly go together, choose one. If you cannot verify a product or it is over the limit, say so and do not substitute a made-up result. Never buy, pay, subscribe, send a message to someone else, or enter checkout on my behalf without my explicit approval. Never treat a Stripe test merchant balance as my spending money. Remember what I like, what I reject, and anything I cannot use. Do not make claims about my mental health or promise that a purchase will fix how I feel.

Tell Sam your profile in one message. Example:

> Call me Alex. I like coffee, desk gear and running. I can spend up to £60 for one moment. I do not own an espresso machine. I prefer useful things to novelty gifts. I live in the UK. When I say a day is hard, choose a small lift. When I have something to celebrate, choose a treat. Do not purchase anything without asking me.

## Test one manual run

Send:

> Today has been a long work week and I could use a lift. Choose for me now. Check real current products. Bring me one choice or a pair only if the two items belong together, with prices and links. Stop before purchase.

Check that Sam returns:

1. One chosen item or a sensible pair, not a page of search results.
2. Working seller and product links, a current GBP price and an availability check.
3. A concrete reason tied to the profile and moment, with an honest caveat.
4. A total within the limit and an explicit approval request.

The completed manual run selected an [OXO BREW Manual Coffee Grinder](https://www.johnlewis.com/oxo-brew-manual-coffee-grinder/p115529930) at £55 from John Lewis, under the £60 demo limit. The retailer page showed the same price, product features and free standard delivery. Sam stopped before adding it to a cart. The **Thoughtful moment** skill was then saved in Grok Bot.

## On-stage check-in

1. In Good Find, press **Demo: Sam checks in**. This is the site's own visible trigger. The person can reply with a hard day or a celebration; the site then searches live Shopify products and makes a choice.
2. In the Grok Bot app, open **Sam** and ask for another choice with the **Thoughtful moment** skill. Sam's real browser research and approval boundary are visible in the Bot transcript.
3. Stop before cart and payment.

The site button does not programmatically trigger a Grok Bot turn. Grok Bot does not provide a public inference API through the owner's Cursor subscription. Show the website decision and the separate Bot run honestly as two surfaces of the same concept.

## Connecting it to the site

For a demo, Sam can open the deployed Good Find URL and run the same moment workflow visibly. The site's profile is tied to a private browser cookie, so the Bot's cloud browser needs its own onboarding until account-based sync is added.
