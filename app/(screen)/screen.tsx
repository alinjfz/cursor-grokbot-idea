"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Bundle, Pot } from "@/src/contract/types";
import { choose, loadPot, pay } from "./data";
import styles from "./screen.module.css";

const BEFORE_KEY = "pot-balance-before";

function pounds(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

export function Screen() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [pot, setPot] = useState<Pot | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"choose" | "pay" | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const started = Date.now();
    const stored = sessionId ? Number(sessionStorage.getItem(BEFORE_KEY)) : NaN;
    const before = Number.isFinite(stored) ? stored : null;
    setBaseline(before);

    async function tick() {
      try {
        const next = await loadPot();
        if (cancelled) return;
        setPot(next);
        setError("");
        if (!sessionId || before === null) {
          setWaiting(false);
          setSettled(true);
          return;
        }
        const landed = next.balance_pence < before;
        const timedOut = Date.now() - started > 20000;
        setWaiting(!landed && !timedOut);
        setSettled(landed || timedOut);
        if (!landed && !timedOut) timer = window.setTimeout(tick, 1500);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "The pot did not load.");
        }
      }
    }

    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sessionId]);

  async function onChoose() {
    setBusy("choose");
    setError("");
    try {
      setBundle(await choose());
    } catch (err) {
      setError(err instanceof Error ? err.message : "The bot could not choose.");
    } finally {
      setBusy(null);
    }
  }

  async function onPay() {
    if (!pot || !bundle || bundle.items.length === 0) return;
    setBusy("pay");
    setError("");
    try {
      sessionStorage.setItem(BEFORE_KEY, String(pot.balance_pence));
      const checkout = await pay(bundle.items.map((item) => ({ sku: item.sku, qty: 1 })));
      window.location.assign(checkout.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setBusy(null);
    }
  }

  const spent =
    baseline !== null && pot && pot.balance_pence < baseline ? baseline - pot.balance_pence : null;
  const capWidth =
    pot && pot.balance_pence > 0 ? Math.min(100, (pot.cap_pence / pot.balance_pence) * 100) : 0;

  return (
    <main className={styles.desk}>
      <aside className={styles.rail} aria-label="Pot">
        <p className={styles.railKicker}>Pot</p>
        <p className={styles.balance}>{pot ? pounds(pot.balance_pence) : "—"}</p>
        {pot ? (
          <>
            <div className={styles.track} aria-hidden="true">
              <span style={{ width: `${capWidth}%` }} />
            </div>
            <p className={styles.cap}>Cap {pounds(pot.cap_pence)}</p>
            <ul className={styles.facts}>
              <li>Banned {pot.bans.length ? pot.bans.join(", ") : "nothing"}</li>
              <li>Sizes {pot.sizes.length ? pot.sizes.join(", ") : "any"}</li>
              <li>
                Already buys{" "}
                {pot.past_orders.length
                  ? pot.past_orders.map((order) => order.name).join(", ")
                  : "nothing yet"}
              </li>
            </ul>
          </>
        ) : (
          <p className={styles.cap}>Opening the pot</p>
        )}
      </aside>

      <section className={styles.thread} aria-live="polite">
        <header className={styles.bar}>
          <span className={styles.avatar} aria-hidden="true">
            S
          </span>
          <div>
            <p className={styles.name}>Sam</p>
            <p className={styles.status}>
              {bundle?.sent ? "On your phone" : "Messages"}
            </p>
          </div>
        </header>

        <div className={styles.scroll}>
          {sessionId ? (
            <After
              waiting={waiting || !settled}
              balance={pot ? pounds(pot.balance_pence) : null}
              spent={spent !== null ? pounds(spent) : null}
            />
          ) : bundle || busy === "choose" ? (
            <div className={styles.conversation}>
              <p className={`${styles.bubble} ${styles.out}`}>Pick something small.</p>
              {bundle ? (
                <BundleThread bundle={bundle} pot={pot} busy={busy === "pay"} onPay={onPay} />
              ) : (
                <p className={styles.typing}>Sam is choosing</p>
              )}
            </div>
          ) : (
            <p className={styles.empty}>Sam has not sent anything yet.</p>
          )}
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        {!sessionId && !bundle ? (
          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              void onChoose();
            }}
          >
            <p>Pick something small.</p>
            <button className={styles.send} type="submit" disabled={!pot || busy !== null} aria-label="Choose something small">
              {busy === "choose" ? "…" : "↑"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

function BundleThread({
  bundle,
  pot,
  busy,
  onPay,
}: {
  bundle: Bundle;
  pot: Pot | null;
  busy: boolean;
  onPay: () => void;
}) {
  if (bundle.items.length === 0) {
    return <p className={`${styles.bubble} ${styles.in}`}>{bundle.occasion}</p>;
  }

  const memory = pot?.past_orders.map((order) => order.name).join(" and ");

  return (
    <div className={styles.stack}>
      <article className={styles.card}>
        <p className={styles.from}>From Sam</p>
        {bundle.evidence ? <p className={styles.evidence}>{bundle.evidence}</p> : null}
        <h1 className={styles.hand}>{bundle.occasion}</h1>
        {memory ? <p className={styles.memory}>You already buy {memory}.</p> : null}
      </article>

      {bundle.left_out.map((item) => (
        <article key={item.sku} className={styles.draft}>
          <p className={styles.draftLabel}>Almost</p>
          <p>{item.why}</p>
        </article>
      ))}

      <div className={`${styles.bubble} ${styles.in} ${styles.products}`}>
        {bundle.items.map((item) => (
          <div key={item.sku} className={styles.product}>
            <span className={styles.productCopy}>
              <strong>{item.name}</strong>
              <em>{item.why}</em>
            </span>
            <span className={styles.price}>{pounds(item.price_pence)}</span>
          </div>
        ))}
        <div className={styles.receipt}>
          <span>Bundle {pounds(bundle.total_pence)}</span>
          <span>Still {pounds(bundle.balance_after_pence)}</span>
        </div>
        <button className={styles.pay} type="button" onClick={onPay} disabled={busy}>
          {busy ? "Opening checkout" : `Pay ${pounds(bundle.total_pence)}`}
        </button>
      </div>

      <p className={styles.delivered}>
        {bundle.sent ? "Delivered to your phone" : "Delivered"}
      </p>
    </div>
  );
}

function After({
  waiting,
  balance,
  spent,
}: {
  waiting: boolean;
  balance: string | null;
  spent: string | null;
}) {
  if (spent === null) {
    return (
      <p className={`${styles.bubble} ${styles.in}`}>
        {waiting ? "Waiting for the payment to land." : "The payment is not in the pot yet."}{" "}
        {balance ? `${balance} is still there.` : ""}
      </p>
    );
  }

  return (
    <div className={styles.stack}>
      <p className={`${styles.bubble} ${styles.in}`}>
        {spent} left the pot. {balance} is still set aside.
      </p>
      <p className={styles.delivered}>Delivered</p>
    </div>
  );
}
