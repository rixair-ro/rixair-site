// Creeaza o comanda si initiaza plata prin BT iPay (Banca Transilvania).
// Fluxul: validare cos contra catalogului publicat -> insert comanda "in_asteptare"
// -> register.do la BT -> clientul e redirectionat pe pagina securizata a bancii (formUrl).
// Secrets necesare: BTIPAY_USER, BTIPAY_PASSWORD, BTIPAY_ENV (test|prod), SITE_URL.
import { createClient } from "npm:@supabase/supabase-js@2";

const BT_USER = Deno.env.get("BTIPAY_USER") ?? "";
const BT_PASS = Deno.env.get("BTIPAY_PASSWORD") ?? "";
const BT_ENV  = Deno.env.get("BTIPAY_ENV") ?? "test";
const BT_BASE = BT_ENV === "prod"
  ? "https://ecclients.btrl.ro/payment/rest/"
  : "https://ecclients-sandbox.btrl.ro/payment/rest/";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://rixair.ro";
const CATALOG_URL = Deno.env.get("CATALOG_URL") ?? "https://raw.githubusercontent.com/rixair-ro/rixair-site/main/data/produse.json";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!BT_USER || !BT_PASS) throw new Error("plata cu cardul nu este configurata inca (lipsesc credentialele BT iPay)");
    const { items, email, nume, telefon, adresa } = await req.json();
    if (!Array.isArray(items) || !items.length) throw new Error("cos gol");
    if (!email) throw new Error("email lipsa");

    const catalog = await (await fetch(CATALOG_URL)).json();
    const skuMap = new Map<string, { nume: string; pret: number | null; produs: string; stoc: string | null; cantitate: number | null }>();
    for (const p of catalog) {
      for (const v of (p.variante ?? [])) skuMap.set(v.sku, { nume: v.nume, pret: v.pret, produs: p.nume, stoc: v.stoc ?? p.stoc ?? null, cantitate: v.cantitate ?? null });
      if (p.sku && !skuMap.has(p.sku)) skuMap.set(p.sku, { nume: p.nume, pret: p.pret_de_la ?? null, produs: p.nume, stoc: p.stoc ?? null, cantitate: null });
    }

    let total = 0;
    const produse = items.map((it: { sku: string; qty: number }) => {
      const v = skuMap.get(it.sku);
      if (!v) throw new Error("produs necunoscut: " + it.sku);
      if (!v.pret) throw new Error("produs fara pret online: " + it.sku);
      if (v.stoc === "fara_stoc" || v.stoc === "ascuns") throw new Error("nu este in stoc: " + v.nume);
      const qty = Math.max(1, Math.min(99, it.qty | 0));
      if (v.cantitate != null && qty > v.cantitate) throw new Error("stoc insuficient pentru " + v.nume + " (disponibil: " + v.cantitate + " buc.)");
      const suma = v.pret * qty;
      total += suma;
      return { descriere: v.produs + " — " + v.nume, cantitate: qty, suma, sku: it.sku };
    });
    if (total <= 0) throw new Error("total invalid");

    const { data: com, error: dbErr } = await db.from("comenzi").insert({
      email, nume: nume ?? null, telefon: telefon ?? null, adresa: adresa ?? null,
      produse, total, status: "in_asteptare",
    }).select("numar").single();
    if (dbErr) throw new Error("eroare la salvarea comenzii: " + dbErr.message);

    const orderNumber = `RX${com.numar}-${Date.now().toString(36)}`;
    const body = new URLSearchParams({
      userName: BT_USER,
      password: BT_PASS,
      orderNumber,
      amount: String(Math.round(total * 100)),   // bani (RON x 100)
      currency: "946",                           // RON
      returnUrl: `${SITE_URL}/plata-reusita.html`,
      description: `Comanda RIXAIR #${com.numar}`.slice(0, 120),
      language: "ro",
      email,
    });
    const r = await (await fetch(BT_BASE + "register.do", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })).json();

    if (!r.orderId || !r.formUrl) {
      throw new Error("BT iPay: " + (r.errorMessage ?? "raspuns neasteptat") + (r.errorCode ? ` (cod ${r.errorCode})` : ""));
    }
    await db.from("comenzi").update({ stripe_session: r.orderId }).eq("numar", com.numar);

    return new Response(JSON.stringify({ formUrl: r.formUrl, orderId: r.orderId, numar: com.numar, total }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
