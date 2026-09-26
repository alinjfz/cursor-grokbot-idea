"use client";

import { useEffect, useMemo, useState } from "react";
import type { FindResponse, ProductFind, ShoppingBrief } from "@/src/discovery/types";
import styles from "./screen.module.css";

type Profile = {
  name: string; interests: string; avoid: string; budgetPence: number;
  reminder: string; seenIds: string[]; liked: string[];
};
type Moment = "lift" | "celebrate";
const PROFILE_KEY = "sam-companion-profile-v1";
const NUDGE_KEY = "sam-last-nudge-v1";
const STARTER: Profile = { name: "", interests: "", avoid: "", budgetPence: 4000, reminder: "", seenIds: [], liked: [] };
const INTERESTS = ["Coffee", "Desk gear", "Fitness", "Gaming", "Food", "Grooming", "Books", "Outdoors", "Tech"];
const pounds = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
const today = () => new Date().toLocaleDateString("en-CA");

function timePassed(time: string) {
  if (!time) return false;
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes;
}

function productKind(item: ProductFind) {
  const title = item.title.toLowerCase();
  const description = item.description.toLowerCase();
  const t = `${title} ${description}`;
  if (/\b(mug|coffee cup|tea cup|tumbler)\b/.test(title)) return "drinkware";
  if (/\b(coffee|beans?|roast(?:ed|er)?|tea leaves|blend)\b/.test(t)) return "drink";
  if (/\b(mug|tumbler)\b/.test(description)) return "drinkware";
  if (/\b(chocolate|snack|biscuits|cookies)\b/.test(t)) return "treat";
  if (/\b(bottle|flask)\b/.test(t)) return "bottle";
  if (/\b(book|novel)\b/.test(t)) return "book";
  if (/\b(lamp|light)\b/.test(t)) return "light";
  if (/\b(mouse|keyboard|pad|stand|organizer|organiser)\b/.test(t)) return "desk";
  if (/\b(game|controller)\b/.test(t)) return "game";
  if (/\b(running|fitness|gym|training)\b/.test(t)) return "fitness";
  return "other";
}

function complementary(a: ProductFind, b: ProductFind) {
  if (a.id === b.id) return false;
  const pairings = new Set(["drink:drinkware", "drink:treat", "drink:book", "drinkware:desk", "fitness:bottle", "fitness:treat", "game:treat", "book:light", "book:drink"]);
  const first = productKind(a), second = productKind(b);
  return pairings.has(`${first}:${second}`) || pairings.has(`${second}:${first}`);
}

function pairReason(a: ProductFind, b: ProductFind, moment: Moment) {
  const kinds = [productKind(a), productKind(b)];
  if (kinds.includes("drink") && kinds.includes("drinkware")) return moment === "lift"
    ? "Good coffee for the ritual, with a mug that makes a quiet break feel better."
    : "Good coffee for the ritual, with a mug that makes it feel like an occasion.";
  if (kinds.includes("fitness") && kinds.includes("bottle")) return "Something for the activity, plus a bottle to take along.";
  if (kinds.includes("book") && kinds.includes("light")) return "A story and the light for a quiet hour with it.";
  if (kinds.includes("game") && kinds.includes("treat")) return "A game and a little snack for the same relaxed evening.";
  return "Two different pleasures that make this moment feel more complete together.";
}

export function Screen() {
  const [profile, setProfile] = useState<Profile>(STARTER);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [moment, setMoment] = useState<Moment>("lift");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<FindResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [promptNudge, setPromptNudge] = useState(false);
  const [storage, setStorage] = useState<"browser" | "supabase">("browser");

  useEffect(() => {
    void (async () => {
      let saved: Profile | null = null;
      try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) saved = { ...STARTER, ...JSON.parse(raw) } as Profile;
      } catch { /* A new profile can be created. */ }
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (response.ok) {
          const body = await response.json() as { profile: Profile | null; storage: "browser" | "supabase" };
          setStorage(body.storage);
          if (body.profile) {
            saved = { ...STARTER, ...body.profile };
            localStorage.setItem(PROFILE_KEY, JSON.stringify(saved));
          } else if (saved && body.storage === "supabase") {
            void syncProfile(saved);
          }
        }
      } catch { /* Browser memory remains available. */ }
      if (saved) {
        setProfile(saved);
        if (saved.reminder && timePassed(saved.reminder) && localStorage.getItem(NUDGE_KEY) !== today()) setPromptNudge(true);
      } else setEditing(true);
      setReady(true);
    })();
  }, []);

  async function syncProfile(next: Profile) {
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (response.ok) setStorage("supabase");
      else setStorage("browser");
    } catch { setStorage("browser"); }
  }

  const top = result?.finds[0];
  const pair = useMemo(() => top && result
    ? result.finds.slice(1).find((item) => top.pricePence + item.pricePence <= profile.budgetPence - Math.max(800, Math.round(profile.budgetPence * 0.1)) && complementary(top, item)) || null
    : null, [top, result, profile.budgetPence]);
  const chosen = top ? [top, ...(pair ? [pair] : [])] : [];
  const total = chosen.reduce((sum, item) => sum + item.pricePence, 0);

  function saveProfile() {
    const cleaned = { ...profile, name: profile.name.trim().slice(0, 40), interests: profile.interests.trim().slice(0, 180), avoid: profile.avoid.trim().slice(0, 120) };
    if (!cleaned.name || cleaned.interests.length < 3 || cleaned.budgetPence < 500) { setError("Tell Sam your name, an interest, and a limit of at least £5."); return; }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(cleaned));
    setProfile(cleaned); setEditing(false); setError("");
    void syncProfile(cleaned);
  }

  function toggleInterest(interest: string) {
    const current = profile.interests.split(",").map((part) => part.trim()).filter(Boolean);
    const next = current.some((part) => part.toLowerCase() === interest.toLowerCase())
      ? current.filter((part) => part.toLowerCase() !== interest.toLowerCase()) : [...current, interest];
    setProfile((p) => ({ ...p, interests: next.join(", ") }));
  }

  async function choose(nextMoment: Moment, refinement = "", excluded?: string[]) {
    setMoment(nextMoment); setResult(null); setApproved(false); setLoading(true); setError(""); setPromptNudge(false);
    const occasion = note.trim() || (nextMoment === "lift" ? "I could use a small lift today" : "Something good happened and I want to celebrate");
    const brief: ShoppingBrief = {
      forWhom: profile.name, interests: profile.interests, occasion, budgetPence: profile.budgetPence,
      country: "GB", avoid: profile.avoid, refinement, momentType: nextMoment, previousIds: excluded || profile.seenIds,
    };
    try {
      const response = await fetch("/api/find", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brief), cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Sam could not finish looking.");
      setResult(body as FindResponse);
      if (!(body as FindResponse).finds.length) setError("Sam couldn't verify a good choice within your limit just now. Try a different interest or raise the limit in your profile.");
      localStorage.setItem(NUDGE_KEY, today());
    } catch (err) { setError(err instanceof Error ? err.message : "Sam could not finish looking."); }
    finally { setLoading(false); }
  }

  function remember(kind: "yes" | "no") {
    if (!top) return;
    const choiceIds = chosen.map((item) => item.id);
    const seenIds = [...new Set([...profile.seenIds, ...choiceIds])].slice(-20);
    const liked = kind === "yes" ? [...new Set([...profile.liked, ...choiceIds])].slice(-20) : profile.liked;
    const next = { ...profile, seenIds, liked };
    setProfile(next); localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    void syncProfile(next);
    if (kind === "no") void choose(moment, "Something surprising", seenIds);
  }

  async function goToSeller(item: ProductFind) {
    if (!approved) return;
    setCheckingId(item.id); setError("");
    try {
      const response = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, variantId: item.variantId, budgetPence: profile.budgetPence, avoid: profile.avoid }), cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Sam could not recheck that product.");
      if (typeof body.url !== "string" || !body.url.startsWith("https://checkout.stripe.com/")) {
        throw new Error("Stripe did not open a payment page.");
      }
      window.location.assign(body.url);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open checkout."); setCheckingId(null); }
  }

  if (!ready) return <main className={styles.opening}>Opening Sam…</main>;
  return <main className={styles.site}>
    <header className={styles.header}>
      <a href="/" className={styles.brand}><span className={styles.brandMark}>✳</span> good find<span className={styles.brandPeriod}>.</span></a>
      <div className={styles.headerRight}><span className={styles.liveDot} /> Sam, your thoughtful companion <button type="button" onClick={() => setEditing(true)}>Your profile</button></div>
    </header>

    {editing ? <div className={styles.introGrid}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Meet Sam · a companion with good taste</p>
        <h1>Someone in<br />your <em>corner.</em></h1>
        <p className={styles.heroCopy}>For the days you need a lift, and the ones worth celebrating. Sam remembers what you like, finds real things you can buy, and chooses for you.</p>
        <div className={styles.heroProof}><div><strong>01</strong><span>Tell Sam what matters once</span></div><div><strong>02</strong><span>Share the moment</span></div><div><strong>03</strong><span>Approve the choice</span></div></div>
        <p className={styles.heroFoot}>A little care, at the right time.</p>
      </section>
      <section className={styles.briefPanel}>
        <p className={styles.eyebrow}>One time · about 30 seconds</p><h2>Let Sam get to know you.</h2>
        <p className={styles.muted}>A few details make the next moment feel personal.</p>
        <form onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
          <label className={styles.field}><span>What should Sam call you?</span><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Your first name" required /></label>
          <div className={styles.field}><label htmlFor="interests">What are you into?</label><input id="interests" value={profile.interests} onChange={(e) => setProfile({ ...profile, interests: e.target.value })} placeholder="Coffee, gaming, running…" required /><div className={styles.chips}>{INTERESTS.map((interest) => <button key={interest} type="button" className={profile.interests.toLowerCase().split(",").map((part) => part.trim()).includes(interest.toLowerCase()) ? styles.chipActive : styles.chip} onClick={() => toggleInterest(interest)}>{interest}</button>)}</div></div>
          <div className={styles.twoFields}>
            <label className={styles.field}><span>Maximum for one moment</span><span className={styles.moneyInput}><span>£</span><input type="number" min="5" max="2000" value={profile.budgetPence / 100} onChange={(e) => setProfile({ ...profile, budgetPence: Math.round(Number(e.target.value) * 100) })} required /></span></label>
            <label className={styles.field}><span>Anything to avoid?</span><input value={profile.avoid} onChange={(e) => setProfile({ ...profile, avoid: e.target.value })} placeholder="Optional" /></label>
          </div>
          <label className={styles.field}><span>A gentle daily nudge? <small>Optional</small></span><input type="time" value={profile.reminder} onChange={(e) => setProfile({ ...profile, reminder: e.target.value })} /><small>Sam will greet you when you next open this page after that time.</small></label>
          <button className={styles.primary} type="submit">Save what Sam remembers <span>↗</span></button>
          <p className={styles.formNote}>Saved in this browser{storage === "supabase" ? " and Supabase" : ""}. Every purchase still needs your approval.</p>
        </form>
      </section>
    </div> : null}

    {!editing && !loading && !result ? <div className={styles.homeGrid}>
      <section className={styles.homeHero}>
        <p className={styles.eyebrow}>A note from Sam</p><h1>Hey, {profile.name}<span className={styles.brandPeriod}>.</span><br /><em>I&apos;m here.</em></h1>
        <p>You don&apos;t need to know what to buy. Tell me where today has landed, and I&apos;ll choose something thoughtful from real shops.</p>
        <button className={styles.demoButton} type="button" onClick={() => { setPromptNudge(true); document.getElementById("moment-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>▶ Demo: Sam checks in</button>
        <div className={styles.memory}><span>What I remember</span><strong>{profile.interests}</strong><span>Up to {pounds(profile.budgetPence)} · UK shops · {storage === "supabase" ? "saved with Supabase" : "saved in this browser"}</span></div>
      </section>
      <section className={styles.momentPanel} id="moment-panel">
        {promptNudge ? <div className={styles.nudge} aria-live="polite"><span>✳</span><p>Hey {profile.name}, just checking in. Do you need a lift, or is there something to celebrate? I can choose something for you.</p></div> : null}
        <p className={styles.eyebrow}>What kind of day is it?</p><h2>A small moment can matter.</h2>
        <button className={styles.momentButton} type="button" onClick={() => void choose("lift")}><span className={styles.momentIcon}>☁</span><span><strong>I need a lift</strong><small>Something comforting, useful, or quietly fun</small></span><b>↗</b></button>
        <button className={styles.momentButton} type="button" onClick={() => void choose("celebrate")}><span className={styles.momentIcon}>✷</span><span><strong>I want to celebrate</strong><small>A little reward for a good thing</small></span><b>↗</b></button>
        <label className={styles.noteField}><span>Want to tell me more? <small>Optional</small></span><textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 180))} placeholder="It was a long week… or I finally got that job!" rows={3} /></label>
        <p className={styles.momentFoot}>Sam checks live stock and price. You decide whether to buy.</p>
      </section>
    </div> : null}

    {loading ? <section className={styles.searching} aria-live="polite"><div className={styles.spinner} /><p className={styles.eyebrow}>Sam is on it</p><h1>Finding your kind of thing<span className={styles.brandPeriod}>.</span></h1><p>I&apos;m checking live products against what you love and your {pounds(profile.budgetPence)} limit. I&apos;ll bring back a decision, not a pile of links.</p></section> : null}

    {!editing && result ? <div className={styles.results}>
      <div className={styles.resultsTop}><div><p className={styles.eyebrow}>A note from Sam · {moment === "lift" ? "for a hard day" : "for a good day"}</p><h1>{moment === "lift" ? "A little lift for you" : "This calls for something good"}<span className={styles.brandPeriod}>.</span></h1><p>{note.trim() ? `You told me: “${note.trim()}”` : moment === "lift" ? "Some days deserve an easy win." : "Good moments are worth marking."}</p></div><button type="button" className={styles.editButton} onClick={() => { setResult(null); setApproved(false); }}>Back to Sam ↗</button></div>
      <div className={styles.evidenceBar}><span><i className={styles.liveDot} /> Checked against live Shopify products</span><span>{result.considered} considered · {result.rejected} ruled out</span><span>Maximum {pounds(profile.budgetPence)}</span></div>
      {top ? <>
        <section className={styles.samNote}><span className={styles.avatar}>S</span><div><p className={styles.eyebrow}>Sam chose this for you</p><p>“{moment === "lift" ? `You said you’re into ${profile.interests}. I wanted this to feel like a small bit of care you can actually use.` : `You’re into ${profile.interests}, so I looked for a way to mark this moment that feels like you.`} {pair ? pairReason(top, pair, moment) : "This one stood out."}”</p></div></section>
        <div className={styles.picks}>{chosen.map((item, index) => <article className={styles.pick} key={item.id}><div className={styles.pickImage}><img src={item.imageUrl} alt={item.imageAlt} /><span>{index === 0 ? "Sam’s pick" : "Pairs with it"}</span></div><div className={styles.pickText}><p className={styles.eyebrow}>{index === 0 ? "01 / THE CHOICE" : "02 / THE PAIR"}</p><h2>{item.title}</h2><p className={styles.merchant}>From {item.merchant}</p><p className={styles.why}>{item.reason}</p><p className={styles.caveat}>{item.tradeoff}</p><div className={styles.priceLine}><strong>{pounds(item.pricePence)}</strong><a href={item.productUrl} target="_blank" rel="noopener noreferrer">See product details ↗</a></div>{approved ? <button className={styles.primary} type="button" onClick={() => void goToSeller(item)} disabled={checkingId === item.id}>{checkingId === item.id ? "Opening Stripe…" : "Pay with Stripe"}</button> : null}</div></article>)}</div>
        <section className={styles.decision}><div><p className={styles.eyebrow}>Your decision</p><h2>{pair ? "Two things, one thoughtful moment." : "One considered choice."}</h2><p>{pair ? "These come from their own sellers. Each one opens a Stripe payment page after you approve." : "Sam chose this from the available options and checked it against your limit. Pay happens on Stripe."}</p></div><div className={styles.decisionRight}><div><span>Total before shipping</span><strong>{pounds(total)}</strong></div><div><span>Room left under your limit</span><strong>{pounds(profile.budgetPence - total)}</strong></div>{!approved ? <button className={styles.primary} type="button" onClick={() => { setApproved(true); remember("yes"); }}>I approve Sam&apos;s choice ↗</button> : <p className={styles.approved}>✓ Approved by you. Pay with Stripe above when you&apos;re ready.</p>}<button className={styles.textButton} type="button" onClick={() => remember("no")}>Not for me — choose again</button></div></section>
        <details className={styles.process}><summary>How Sam made the choice</summary><p>Sam searched Shopify&apos;s live catalog for {result.queries.map((query) => `“${query}”`).join(" and ")}, checked availability, GBP price, image and seller link, then ranked matches against your interests, moment and limit. {result.model === "gateway" ? "A language model helped interpret the fit." : "A transparent rule set chose the best match."} {result.leftOut ? `One ruled out: ${result.leftOut.title} — ${result.leftOut.why.toLowerCase()}.` : ""}</p>{result.signals.length ? <div className={styles.sources}>{result.signals.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</div> : null}</details>
      </> : null}
      <p className={styles.disclaimer}>Sam rechecks the live price, then opens Stripe for that amount. Approval here never charges you. The product page link is only for details.</p>
    </div> : null}
    {error ? <div className={styles.error} role="alert">{error}</div> : null}
    <footer className={styles.footer}><span>good find<span className={styles.brandPeriod}>.</span></span><span>Sam remembers. Sam chooses. You decide.</span></footer>
  </main>;
}
