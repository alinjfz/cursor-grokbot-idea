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
    <main className={styles.sheet}>
      <section className={styles.pot} aria-label="Pot">
        <div>
          <p className={styles.kicker}>Household pot</p>
          <p className={styles.balance}>{pot ? pounds(pot.balance_pence) : "—"}</p>
          <p className={styles.quiet}>Set aside</p>
          {pot ? (
            <>
              <div className={styles.track} aria-hidden="true">
                <span style={{ width: `${capWidth}%` }} />
              </div>
              <p className={styles.meta}>Cap {pounds(pot.cap_pence)} on one bundle</p>
              <ul className={styles.facts}>
                <li>Banned {pot.bans.length ? pot.bans.join(", ") : "nothing"}</li>
                <li>Sizes {pot.sizes.length ? pot.sizes.join(", ") : "any"}</li>
                <li>
                  Already bought{" "}
                  {pot.past_orders.length
                    ? pot.past_orders.map((order) => order.name).join(", ")
                    : "nothing yet"}
                </li>
              </ul>
            </>
          ) : (
            <p className={styles.meta}>Opening the pot</p>
          )}
        </div>
        {!sessionId ? (
          <button className={styles.button} type="button" onClick={onChoose} disabled={!pot || busy !== null}>
            {busy === "choose" ? "Choosing" : "Choose something small"}
          </button>
        ) : null}
      </section>

      <section className={styles.note} aria-live="polite">
        {sessionId ? (
          <After
            waiting={waiting || !settled}
            balance={pot ? pounds(pot.balance_pence) : null}
            spent={spent !== null ? pounds(spent) : null}
          />
        ) : bundle ? (
          <BundleNote bundle={bundle} busy={busy === "pay"} onPay={onPay} />
        ) : (
          <p className={styles.idle}>Nothing chosen yet.</p>
        )}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}

function BundleNote({
  bundle,
  busy,
  onPay,
}: {
  bundle: Bundle;
  busy: boolean;
  onPay: () => void;
}) {
  if (bundle.items.length === 0) {
    return (
      <>
        <p className={styles.kicker}>Nothing legal</p>
        <h1 className={styles.occasion}>{bundle.occasion}</h1>
      </>
    );
  }

  return (
    <>
      <p className={styles.kicker}>Chosen</p>
      <h1 className={styles.occasion}>{bundle.occasion}</h1>
      <ul className={styles.items}>
        {bundle.items.map((item, index) => (
          <li key={item.sku} style={{ animationDelay: `${index * 70}ms` }}>
            <div className={styles.itemTop}>
              <span>{item.name}</span>
              <span>{pounds(item.price_pence)}</span>
            </div>
            <p>{item.why}</p>
          </li>
        ))}
      </ul>
      {bundle.left_out.map((item) => (
        <p key={item.sku} className={styles.leftOut}>
          <span>Left out · {item.sku}</span>
          {item.why}
        </p>
      ))}
      <div className={styles.totals}>
        <p>
          <span>Bundle</span>
          <strong>{pounds(bundle.total_pence)}</strong>
        </p>
        <p>
          <span>Still in the pot</span>
          <strong>{pounds(bundle.balance_after_pence)}</strong>
        </p>
      </div>
      <button className={`${styles.button} ${styles.pay}`} type="button" onClick={onPay} disabled={busy}>
        {busy ? "Opening checkout" : "Pay"}
      </button>
    </>
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
    return waiting ? (
      <>
        <p className={styles.kicker}>
          <i className={styles.dot} /> Waiting for the payment to land
        </p>
        <h1 className={styles.occasion}>{balance ?? "—"} still in the pot</h1>
      </>
    ) : (
      <>
        <p className={styles.kicker}>Payment not in the pot yet</p>
        <h1 className={styles.occasion}>{balance ?? "—"} still in the pot</h1>
      </>
    );
  }

  return (
    <>
      <p className={styles.kicker}>Paid</p>
      <h1 className={styles.occasion}>{spent} left the pot</h1>
      <p className={styles.quiet}>{balance} still set aside</p>
    </>
  );
}
