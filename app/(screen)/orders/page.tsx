import Link from "next/link";
import { confirmPurchase, listPurchases, type Purchase } from "@/src/orders/purchases";
import styles from "../screen.module.css";

export const dynamic = "force-dynamic";

const pounds = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; notice?: string }>;
}) {
  const { session_id: sessionId, notice } = await searchParams;
  let banner = "";
  let highlighted: Purchase | null = null;

  if (sessionId) {
    try {
      const confirmed = await confirmPurchase(sessionId);
      banner = confirmed.banner;
      highlighted = confirmed.purchase;
    } catch (error) {
      console.error(error);
      banner = "The payment came back, but the confirmation could not be finished.";
    }
  }

  let purchases: Purchase[] = [];
  let loadError = "";
  try {
    purchases = await listPurchases();
  } catch (error) {
    console.error(error);
    loadError = "Paid orders could not be loaded from Stripe.";
  }

  if (highlighted) {
    purchases = [highlighted, ...purchases.filter((order) => order.id !== highlighted.id)];
  }

  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span className={styles.brandMark}>✳</span> good find<span className={styles.brandPeriod}>.</span></Link>
        <div className={styles.headerRight}><span className={styles.liveDot} /> Paid orders <Link href="/">Back to Sam</Link></div>
      </header>
      <section className={styles.orders}>
        <p className={styles.eyebrow}>Receipts</p>
        <h1>Your purchases<span className={styles.brandPeriod}>.</span></h1>
        <p className={styles.ordersLead}>Every completed Stripe payment is listed here. A new one also sends a confirmation to your WhatsApp.</p>
        {banner || notice ? <section className={styles.samNote}><span className={styles.avatar}>S</span><div><p className={styles.eyebrow}>From Sam</p><p>{banner || notice}</p></div></section> : null}
        <form className={styles.receiptForm} action="/api/orders/notify" method="post">
          <label htmlFor="whatsapp">WhatsApp number</label>
          <input id="whatsapp" name="whatsapp" type="tel" placeholder="07… or +44…" required />
          <button type="submit">Send confirmation</button>
        </form>
        {loadError ? <p className={styles.emptyOrders}>{loadError}</p> : null}
        {purchases.length === 0 && !loadError ? <p className={styles.emptyOrders}>No paid orders yet. Approve a choice, pay with Stripe, and the receipt will show up here.</p> : null}
        <div className={styles.orderList}>
          {purchases.map((order) => (
            <article className={styles.orderCard} key={order.id}>
              <div>
                <p className={styles.eyebrow}>{order.paidAt}</p>
                <h2>{order.title}</h2>
                <p className={styles.orderMeta}>{order.id}</p>
              </div>
              <div>
                <div className={styles.orderAmount}>{pounds(order.amountPence)}</div>
                <p className={order.whatsapp === "sent" ? styles.orderStatus : `${styles.orderStatus} ${styles.orderStatusFailed}`}>{order.whatsappNote || "WhatsApp confirmation not sent yet."}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <footer className={styles.footer}><span>good find<span className={styles.brandPeriod}>.</span></span><span>Sam remembers. Sam chooses. You decide.</span></footer>
    </main>
  );
}
