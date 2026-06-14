// Creeaza un PaymentIntent pentru checkout-ul propriu (Stripe Payment Element).
// Preturile sunt validate pe server contra catalogului produse.json publicat
// (clientul nu poate trimite preturi false). Salveaza comanda ca "in_asteptare";
// webhook-ul o trece pe "platita" la confirmarea platii.
// DOAR card (fara Link / salvare card / Klarna).
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const PUBLISHABLE = Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? "";
const CATALOG_URL = Deno.env.get("CATALOG_URL") ?? "https://raw.githubusercontent.com/rixair-ro/rixair-site/main/data/produse.json";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { items, email } = await req.json(); // items: [{sku, qty}]
    if (!Array.isArray(items) || !items.length) throw new Error("cos gol");

    const catalog = await (await fetch(CATALOG_URL)).json();
    const skuMap = new Map<string, { nume: string; pret: number | null; produs: string }>();
    for (const p of catalog) {
      for (const v of (p.variante ?? [])) skuMap.set(v.sku, { nume: v.nume, pret: v.pret, produs: p.nume });
      if (p.sku && !skuMap.has(p.sku)) skuMap.set(p.sku, { nume: p.nume, pret: p.pret_de_la ?? null, produs: p.nume });
    }

    let total = 0;
    const produse = items.map((it: { sku: string; qty: number }) => {
      const v = skuMap.get(it.sku);
      if (!v) throw new Error("produs necunoscut: " + it.sku);
      if (!v.pret) throw new Error("produs fara pret online: " + it.sku);
      const qty = Math.max(1, Math.min(99, it.qty | 0));
      const suma = v.pret * qty;
      total += suma;
      return { descriere: v.produs + " — " + v.nume, cantitate: qty, suma, sku: it.sku };
    });
    if (total <= 0) throw new Error("total invalid");

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "ron",
      payment_method_types: ["card"],
      receipt_email: email || undefined,
      metadata: { skus: JSON.stringify(items).slice(0, 480) },
    });

    await db.from("comenzi").insert({
      email: email || "",
      produse,
      total,
      status: "in_asteptare",
      stripe_session: pi.id,
    });

    return new Response(JSON.stringify({
      clientSecret: pi.client_secret,
      publishableKey: PUBLISHABLE,
      total,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
